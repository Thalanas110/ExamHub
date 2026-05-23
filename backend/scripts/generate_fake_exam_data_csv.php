<?php

declare(strict_types=1);

const DEFAULT_USERS_CSV = __DIR__ . '/../database/seeds/fake_users_5701.csv';
const DEFAULT_OUTPUT_DIR = __DIR__ . '/../database/seeds';
const DEFAULT_CLASS_SIZE = 40;
const DEFAULT_EXAMS_PER_CLASS = 2;
const DEFAULT_VIOLATING_STUDENTS_PER_EXAM = 5;
const DEFAULT_MAX_VIOLATIONS_PER_PAIR = 3;
const DEFAULT_SUBMISSION_PARTICIPATION_RATE = 85;
const DEFAULT_GRADED_SUBMISSION_RATE = 72;

/** @var array<int, string> */
const VIOLATION_TYPES = ['tab_switch', 'window_blur', 'right_click', 'auto_submitted'];

main($argv);

/**
 * @param array<int, string> $argv
 */
function main(array $argv): void
{
    $options = parseOptions($argv);

    if (array_key_exists('help', $options)) {
        printUsage();
        exit(0);
    }

    $usersCsvPath = resolvePath((string) ($options['users-csv'] ?? DEFAULT_USERS_CSV), __DIR__ . '/..');
    $outputDir = resolvePath((string) ($options['output-dir'] ?? DEFAULT_OUTPUT_DIR), __DIR__ . '/..');
    $classSize = parsePositiveIntOption($options, 'class-size', DEFAULT_CLASS_SIZE);
    $examsPerClass = parsePositiveIntOption($options, 'exams-per-class', DEFAULT_EXAMS_PER_CLASS);
    $violatingStudentsPerExam = parsePositiveIntOption(
        $options,
        'violating-students-per-exam',
        DEFAULT_VIOLATING_STUDENTS_PER_EXAM
    );
    $maxViolationsPerPair = parsePositiveIntOption(
        $options,
        'max-violations-per-pair',
        DEFAULT_MAX_VIOLATIONS_PER_PAIR
    );

    if (!is_file($usersCsvPath) || !is_readable($usersCsvPath)) {
        throw new RuntimeException('Users CSV is not readable: ' . $usersCsvPath);
    }

    if (!is_dir($outputDir) && !mkdir($outputDir, 0777, true) && !is_dir($outputDir)) {
        throw new RuntimeException('Unable to create output directory: ' . $outputDir);
    }

    $users = readUsersCsv($usersCsvPath);
    [$teachers, $students, $admin] = partitionUsers($users);

    if ($teachers === []) {
        throw new RuntimeException('No teachers were found in users CSV.');
    }
    if ($students === []) {
        throw new RuntimeException('No students were found in users CSV.');
    }
    if ($admin === null) {
        throw new RuntimeException('No admin row was found in users CSV.');
    }
    if ($classSize > count($students)) {
        throw new RuntimeException(sprintf(
            'class-size (%d) cannot exceed student count (%d).',
            $classSize,
            count($students)
        ));
    }
    if ((count($teachers) * $classSize) < count($students)) {
        throw new RuntimeException(sprintf(
            'Not enough class seats to enroll every student at least once. Need at least %d seats; current capacity is %d.',
            count($students),
            count($teachers) * $classSize
        ));
    }

    $classes = [];
    $classStudents = [];
    $classStudentMap = [];
    $exams = [];
    $submissions = [];
    $examViolations = [];
    $violationCases = [];
    $studentAssignmentCounts = [];
    foreach ($students as $student) {
        $studentAssignmentCounts[$student['id']] = 0;
    }

    $subjects = collectSubjectPool($teachers, $students);
    $baseCreatedDate = new DateTimeImmutable('2024-01-15');

    foreach ($teachers as $teacherIndex => $teacher) {
        $classId = deterministicUuid('fake-class-' . $teacher['id']);
        $subject = pickSubject($subjects, $teacherIndex);
        $classCreatedAt = $baseCreatedDate->modify('+' . (($teacherIndex * 2) % 420) . ' days');
        $classRow = [
            'id' => $classId,
            'name' => sprintf('Demo %s Section %03d', shortSubject($subject), $teacherIndex + 1),
            'subject' => $subject,
            'teacher_id' => $teacher['id'],
            'code' => sprintf('DCL%04d', $teacherIndex + 1),
            'description' => 'Synthetic class generated for school presentation data.',
            'created_at' => $classCreatedAt->format('Y-m-d'),
        ];
        $classes[] = $classRow;

        // Deterministic seat allocation guarantees coverage when capacity >= student count.
        $startStudentIndex = ($teacherIndex * $classSize) % count($students);
        $enrolledStudentIds = [];
        for ($slot = 0; $slot < $classSize; $slot++) {
            $student = $students[($startStudentIndex + $slot) % count($students)];
            $joinedAt = $classCreatedAt->modify('+' . (($slot % 7) + 1) . ' days')->setTime(8, ($slot * 3) % 60, 0);
            $classStudents[] = [
                'class_id' => $classId,
                'student_id' => $student['id'],
                'joined_ts' => $joinedAt->format('Y-m-d H:i:s'),
            ];
            $enrolledStudentIds[] = $student['id'];
            $studentAssignmentCounts[$student['id']]++;
        }
        $classStudentMap[$classId] = $enrolledStudentIds;

        for ($examNo = 1; $examNo <= $examsPerClass; $examNo++) {
            $examGlobalIndex = count($exams) + 1;
            $examId = deterministicUuid('fake-exam-' . $classId . '-' . $examNo);
            $duration = pickDurationMinutes($examGlobalIndex);
            $startAt = $classCreatedAt->modify('+' . (($examNo * 21) + ($teacherIndex % 11)) . ' days')
                ->setTime(9 + ($examNo % 3), 0, 0);
            $endAt = $startAt->modify('+' . $duration . ' minutes');
            $status = ($examNo % 2 === 1) ? 'completed' : 'published';
            $questions = buildQuestionSet($subject, $examGlobalIndex);
            $questionsJson = json_encode(
                $questions,
                JSON_UNESCAPED_UNICODE
            );
            if (!is_string($questionsJson)) {
                throw new RuntimeException('Failed to encode questions_json.');
            }

            $examRow = [
                'id' => $examId,
                'title' => sprintf('%s Demo Exam %02d', shortSubject($subject), $examNo),
                'description' => 'Synthetic exam generated for school presentation data.',
                'class_id' => $classId,
                'teacher_id' => $teacher['id'],
                'duration_minutes' => (string) $duration,
                'total_marks' => '100',
                'passing_marks' => '60',
                'start_date' => $startAt->format('Y-m-d H:i:s'),
                'end_date' => $endAt->format('Y-m-d H:i:s'),
                'status' => $status,
                'questions_json' => $questionsJson,
                'created_at' => $startAt->format('Y-m-d'),
            ];
            $exams[] = $examRow;

            if ($status !== 'completed') {
                continue;
            }

            $studentsForExam = $classStudentMap[$classId];
            $submissions = array_merge(
                $submissions,
                buildSubmissionsForExam(
                    $examRow,
                    $questions,
                    $studentsForExam,
                    $examGlobalIndex,
                    $startAt,
                    $endAt
                ),
            );

            $pairCount = min($violatingStudentsPerExam, count($studentsForExam));

            for ($pairIndex = 0; $pairIndex < $pairCount; $pairIndex++) {
                $studentId = $studentsForExam[($pairIndex * 5 + $examGlobalIndex) % count($studentsForExam)];
                $eventCount = 1 + (($examGlobalIndex + $pairIndex) % $maxViolationsPerPair);
                $latestType = 'tab_switch';
                $latestOccurredAt = $startAt;

                for ($eventNo = 1; $eventNo <= $eventCount; $eventNo++) {
                    $violationType = VIOLATION_TYPES[($examGlobalIndex + $pairIndex + $eventNo) % count(VIOLATION_TYPES)];
                    $occurredAt = $startAt->modify('+' . (($pairIndex * 4) + ($eventNo * 3)) . ' minutes');
                    $examViolations[] = [
                        'exam_id' => $examId,
                        'student_id' => $studentId,
                        'violation_no' => (string) $eventNo,
                        'violation_type' => $violationType,
                        'details' => sprintf(
                            'Synthetic %s event #%d for presentation scenario.',
                            $violationType,
                            $eventNo
                        ),
                        'occurred_at' => $occurredAt->format('Y-m-d H:i:s'),
                    ];
                    $latestType = $violationType;
                    $latestOccurredAt = $occurredAt;
                }

                [$severity, $outcome] = deriveCaseDisposition($eventCount, $latestType);
                $reviewedBy = ($outcome === 'pending')
                    ? null
                    : (($pairIndex % 4 === 0) ? $admin['id'] : $teacher['id']);
                $reviewedAt = $reviewedBy === null
                    ? null
                    : $latestOccurredAt->modify('+1 day')->setTime(15, ($pairIndex * 9) % 60, 0)->format('Y-m-d H:i:s');

                $violationCases[] = [
                    'id' => deterministicUuid('fake-vcase-' . $examId . '-' . $studentId),
                    'exam_id' => $examId,
                    'student_id' => $studentId,
                    'severity' => $severity,
                    'outcome' => $outcome,
                    'teacher_notes' => caseNoteFor($severity, $outcome, $eventCount),
                    'reviewed_by' => $reviewedBy ?? '',
                    'reviewed_at' => $reviewedAt ?? '',
                ];
            }
        }
    }

    $uncoveredStudents = array_keys(
        array_filter(
            $studentAssignmentCounts,
            static fn (int $count): bool => $count < 1
        )
    );
    if ($uncoveredStudents !== []) {
        throw new RuntimeException(sprintf(
            'Enrollment generation failed: %d students were not assigned to any class.',
            count($uncoveredStudents)
        ));
    }

    $minAssignments = min($studentAssignmentCounts);
    $maxAssignments = max($studentAssignmentCounts);

    $classesPath = $outputDir . DIRECTORY_SEPARATOR . 'fake_classes.csv';
    $classStudentsPath = $outputDir . DIRECTORY_SEPARATOR . 'fake_class_students.csv';
    $examsPath = $outputDir . DIRECTORY_SEPARATOR . 'fake_exams.csv';
    $submissionsPath = $outputDir . DIRECTORY_SEPARATOR . 'fake_submissions.csv';
    $violationsPath = $outputDir . DIRECTORY_SEPARATOR . 'fake_exam_violations.csv';
    $casesPath = $outputDir . DIRECTORY_SEPARATOR . 'fake_violation_cases.csv';

    writeCsv($classesPath, ['id', 'name', 'subject', 'teacher_id', 'code', 'description', 'created_at'], $classes);
    writeCsv($classStudentsPath, ['class_id', 'student_id', 'joined_ts'], $classStudents);
    writeCsv(
        $examsPath,
        [
            'id',
            'title',
            'description',
            'class_id',
            'teacher_id',
            'duration_minutes',
            'total_marks',
            'passing_marks',
            'start_date',
            'end_date',
            'status',
            'questions_json',
            'created_at',
        ],
        $exams
    );
    writeCsv(
        $submissionsPath,
        [
            'id',
            'exam_id',
            'student_id',
            'attempt_no',
            'answers_json',
            'total_score',
            'percentage',
            'grade',
            'feedback_ciphertext',
            'feedback_iv',
            'feedback_tag',
            'feedback_enc',
            'started_at',
            'allowed_duration_minutes',
            'effective_window_start_at',
            'effective_window_end_at',
            'submitted_at',
            'graded_at',
            'status',
        ],
        $submissions
    );
    writeCsv(
        $violationsPath,
        ['exam_id', 'student_id', 'violation_no', 'violation_type', 'details', 'occurred_at'],
        $examViolations
    );
    writeCsv(
        $casesPath,
        ['id', 'exam_id', 'student_id', 'severity', 'outcome', 'teacher_notes', 'reviewed_by', 'reviewed_at'],
        $violationCases
    );

    fwrite(STDOUT, "Fake exam/violation CSVs generated.\n");
    fwrite(STDOUT, "Users source: {$usersCsvPath}\n");
    fwrite(STDOUT, "Output dir: {$outputDir}\n");
    fwrite(STDOUT, "Classes: " . count($classes) . "\n");
    fwrite(STDOUT, "Class enrollments: " . count($classStudents) . "\n");
    fwrite(STDOUT, "Exams: " . count($exams) . "\n");
    fwrite(STDOUT, "Submissions: " . count($submissions) . "\n");
    fwrite(STDOUT, "Violation events: " . count($examViolations) . "\n");
    fwrite(STDOUT, "Violation cases: " . count($violationCases) . "\n");
    fwrite(STDOUT, sprintf(
        "Student class coverage: %d/%d students enrolled at least once (min=%d classes, max=%d classes per student)\n",
        count($students) - count($uncoveredStudents),
        count($students),
        $minAssignments,
        $maxAssignments
    ));
    fwrite(STDOUT, "Files:\n");
    fwrite(STDOUT, " - {$classesPath}\n");
    fwrite(STDOUT, " - {$classStudentsPath}\n");
    fwrite(STDOUT, " - {$examsPath}\n");
    fwrite(STDOUT, " - {$submissionsPath}\n");
    fwrite(STDOUT, " - {$violationsPath}\n");
    fwrite(STDOUT, " - {$casesPath}\n");
}

/**
 * @param array<string, string> $options
 */
function parsePositiveIntOption(array $options, string $key, int $default): int
{
    $raw = (string) ($options[$key] ?? (string) $default);
    if (!preg_match('/^[0-9]+$/', $raw)) {
        throw new RuntimeException(sprintf('%s must be an integer.', $key));
    }

    $value = (int) $raw;
    if ($value < 1) {
        throw new RuntimeException(sprintf('%s must be >= 1.', $key));
    }

    return $value;
}

/**
 * @param array<int, string> $argv
 * @return array<string, string>
 */
function parseOptions(array $argv): array
{
    $options = [];
    $count = count($argv);
    for ($index = 1; $index < $count; $index++) {
        $argument = $argv[$index];
        if (!str_starts_with($argument, '--')) {
            continue;
        }

        $argument = substr($argument, 2);
        if ($argument === '') {
            continue;
        }

        if (str_contains($argument, '=')) {
            [$key, $value] = explode('=', $argument, 2);
            $options[$key] = $value;
            continue;
        }

        $next = $argv[$index + 1] ?? '';
        if ($next !== '' && !str_starts_with($next, '--')) {
            $options[$argument] = $next;
            $index++;
            continue;
        }

        $options[$argument] = '1';
    }

    return $options;
}

function resolvePath(string $path, string $baseDir): string
{
    $trimmed = trim($path);
    if ($trimmed === '') {
        return $baseDir;
    }

    if (preg_match('/^[A-Za-z]:\\\\/', $trimmed) === 1) {
        return $trimmed;
    }

    if (str_starts_with($trimmed, '/') || str_starts_with($trimmed, '\\')) {
        return $trimmed;
    }

    $root = realpath($baseDir);
    if ($root === false) {
        throw new RuntimeException('Base directory does not exist: ' . $baseDir);
    }

    return $root . DIRECTORY_SEPARATOR . str_replace(['/', '\\'], DIRECTORY_SEPARATOR, $trimmed);
}

/**
 * @return array<int, array<string, string>>
 */
function readUsersCsv(string $csvPath): array
{
    $handle = fopen($csvPath, 'rb');
    if ($handle === false) {
        throw new RuntimeException('Unable to open users CSV: ' . $csvPath);
    }

    try {
        $header = fgetcsv($handle);
        if ($header === false) {
            throw new RuntimeException('Users CSV is empty: ' . $csvPath);
        }
        $header = normalizeHeader($header);

        $rows = [];
        while (($row = fgetcsv($handle)) !== false) {
            if (isBlankRow($row)) {
                continue;
            }
            if (count($row) !== count($header)) {
                throw new RuntimeException('Users CSV has malformed row.');
            }

            $mapped = array_combine($header, $row);
            if ($mapped === false) {
                throw new RuntimeException('Users CSV row mapping failed.');
            }
            $rows[] = array_map(static fn (mixed $value): string => trim((string) $value), $mapped);
        }

        return $rows;
    } finally {
        fclose($handle);
    }
}

/**
 * @param array<int, array<string, string>> $rows
 * @return array{0: array<int, array<string, string>>, 1: array<int, array<string, string>>, 2: ?array<string, string>}
 */
function partitionUsers(array $rows): array
{
    $teachers = [];
    $students = [];
    $admins = [];

    foreach ($rows as $row) {
        $role = strtolower($row['role'] ?? '');
        $email = strtolower($row['email'] ?? '');
        if ($role === 'teacher') {
            $teachers[] = $row;
            continue;
        }
        if ($role === 'student') {
            $students[] = $row;
            continue;
        }
        if ($role === 'admin') {
            $admins[] = $row;
        }
    }

    usort($teachers, static fn (array $a, array $b): int => strcmp($a['email'] ?? '', $b['email'] ?? ''));
    usort($students, static fn (array $a, array $b): int => strcmp($a['email'] ?? '', $b['email'] ?? ''));
    usort($admins, static fn (array $a, array $b): int => strcmp($a['email'] ?? '', $b['email'] ?? ''));

    $preferredAdmin = null;
    foreach ($admins as $admin) {
        if (($admin['email'] ?? '') === 'presentation-admin@demo-school.invalid') {
            $preferredAdmin = $admin;
            break;
        }
    }
    if ($preferredAdmin === null) {
        $preferredAdmin = $admins[0] ?? null;
    }

    return [$teachers, $students, $preferredAdmin];
}

/**
 * @param array<int, mixed> $header
 * @return array<int, string>
 */
function normalizeHeader(array $header): array
{
    $normalized = [];
    foreach ($header as $index => $columnName) {
        $value = trim((string) $columnName);
        if ($index === 0) {
            $value = ltrim($value, "\xEF\xBB\xBF");
        }
        $normalized[] = $value;
    }

    return $normalized;
}

/**
 * @param array<int, mixed> $row
 */
function isBlankRow(array $row): bool
{
    foreach ($row as $value) {
        if (trim((string) $value) !== '') {
            return false;
        }
    }

    return true;
}

/**
 * @param array<int, array<string, string>> $teachers
 * @param array<int, array<string, string>> $students
 * @return array<int, string>
 */
function collectSubjectPool(array $teachers, array $students): array
{
    $subjects = [];

    foreach ($teachers as $teacher) {
        $department = trim((string) ($teacher['department'] ?? ''));
        if ($department !== '') {
            $subjects[$department] = true;
        }
    }
    foreach ($students as $student) {
        $department = trim((string) ($student['department'] ?? ''));
        if ($department !== '') {
            $subjects[$department] = true;
        }
    }

    if ($subjects === []) {
        return ['General Studies'];
    }

    $subjectList = array_keys($subjects);
    sort($subjectList, SORT_STRING);
    return array_values($subjectList);
}

/**
 * @param array<int, string> $subjects
 */
function pickSubject(array $subjects, int $index): string
{
    return $subjects[$index % count($subjects)];
}

function shortSubject(string $subject): string
{
    $trimmed = trim($subject);
    if ($trimmed === '') {
        return 'General';
    }
    if (strlen($trimmed) <= 24) {
        return $trimmed;
    }

    return substr($trimmed, 0, 24);
}

function pickDurationMinutes(int $index): int
{
    $durations = [60, 75, 90, 105, 120];
    return $durations[$index % count($durations)];
}

/**
 * @param array<string, string> $examRow
 * @param array<int, array<string, mixed>> $questions
 * @param array<int, string> $studentsForExam
 * @return array<int, array<string, string>>
 */
function buildSubmissionsForExam(
    array $examRow,
    array $questions,
    array $studentsForExam,
    int $examGlobalIndex,
    DateTimeImmutable $startAt,
    DateTimeImmutable $endAt,
): array {
    $rows = [];
    $durationMinutes = (int) ($examRow['duration_minutes'] ?? '60');

    foreach ($studentsForExam as $studentIndex => $studentId) {
        $participationRoll = (($examGlobalIndex * 37) + ($studentIndex * 17)) % 100;
        if ($participationRoll >= DEFAULT_SUBMISSION_PARTICIPATION_RATE) {
            continue;
        }

        $isGraded = ((($examGlobalIndex * 19) + ($studentIndex * 23)) % 100) < DEFAULT_GRADED_SUBMISSION_RATE;
        $submissionId = deterministicUuid('fake-submission-' . $examRow['id'] . '-' . $studentId);
        $startOffset = (($studentIndex * 3) + $examGlobalIndex) % 12;
        $startedAt = $startAt->modify('+' . $startOffset . ' minutes');
        $submitWindow = max(8, $durationMinutes - 5);
        $submittedOffset = 8 + ((($studentIndex * 7) + $examGlobalIndex) % $submitWindow);
        $submittedAt = $startAt->modify('+' . $submittedOffset . ' minutes');
        if ($submittedAt >= $endAt) {
            $submittedAt = $endAt->modify('-1 minute');
        }

        $gradedAt = null;
        $totalScore = '';
        $percentage = '';
        $grade = '';
        $feedback = '';

        if ($isGraded) {
            [$answers, $gradedTotalScore, $gradedPercentage, $gradedGrade] = buildGradedAnswers(
                $questions,
                $examGlobalIndex,
                $studentIndex,
            );
            $totalScore = number_format($gradedTotalScore, 2, '.', '');
            $percentage = number_format($gradedPercentage, 2, '.', '');
            $grade = $gradedGrade;
            $feedback = feedbackFromGrade($gradedGrade);
            $gradedAt = $submittedAt->modify('+' . (1 + (($studentIndex + $examGlobalIndex) % 5)) . ' days');
        } else {
            $answers = buildSubmittedAnswers($questions, $examGlobalIndex, $studentIndex);
        }

        $answersJson = json_encode($answers, JSON_UNESCAPED_UNICODE);
        if (!is_string($answersJson)) {
            throw new RuntimeException('Failed to encode submission answers JSON.');
        }

        $rows[] = [
            'id' => $submissionId,
            'exam_id' => $examRow['id'],
            'student_id' => $studentId,
            'attempt_no' => '1',
            'answers_json' => $answersJson,
            'total_score' => $totalScore,
            'percentage' => $percentage,
            'grade' => $grade,
            'feedback_ciphertext' => '',
            'feedback_iv' => '',
            'feedback_tag' => '',
            'feedback_enc' => $feedback,
            'started_at' => $startedAt->format('Y-m-d H:i:s'),
            'allowed_duration_minutes' => (string) $durationMinutes,
            'effective_window_start_at' => $examRow['start_date'],
            'effective_window_end_at' => $examRow['end_date'],
            'submitted_at' => $submittedAt->format('Y-m-d H:i:s'),
            'graded_at' => $gradedAt?->format('Y-m-d H:i:s') ?? '',
            'status' => $isGraded ? 'graded' : 'submitted',
        ];
    }

    return $rows;
}

/**
 * @param array<int, array<string, mixed>> $questions
 * @return array{0: array<int, array<string, mixed>>, 1: float, 2: float, 3: string}
 */
function buildGradedAnswers(array $questions, int $examGlobalIndex, int $studentIndex): array
{
    $answers = [];
    $baseRatio = 0.48 + (((($examGlobalIndex * 17) + ($studentIndex * 13)) % 49) / 100);
    $totalScore = 0.0;
    $totalMarks = 0.0;

    foreach ($questions as $questionIndex => $question) {
        $marks = (float) ($question['marks'] ?? 0);
        if ($marks <= 0) {
            continue;
        }

        $totalMarks += $marks;
        $variation = ((($questionIndex + $studentIndex + $examGlobalIndex) % 5) - 2) * 0.03;
        $ratio = max(0.05, min(1.0, $baseRatio + $variation));
        $marksAwarded = round($marks * $ratio, 2);
        $totalScore += $marksAwarded;

        $answers[] = [
            'questionId' => (string) ($question['id'] ?? ''),
            'answer' => answerForQuestion($question, $examGlobalIndex + $studentIndex + $questionIndex),
            'marksAwarded' => $marksAwarded,
        ];
    }

    $percentage = $totalMarks > 0 ? round(($totalScore / $totalMarks) * 100, 2) : 0.0;
    return [$answers, $totalScore, $percentage, gradeFromPercentage($percentage)];
}

/**
 * @param array<int, array<string, mixed>> $questions
 * @return array<int, array<string, string>>
 */
function buildSubmittedAnswers(array $questions, int $examGlobalIndex, int $studentIndex): array
{
    $answers = [];
    foreach ($questions as $questionIndex => $question) {
        $answers[] = [
            'questionId' => (string) ($question['id'] ?? ''),
            'answer' => answerForQuestion($question, $examGlobalIndex + $studentIndex + $questionIndex),
        ];
    }

    return $answers;
}

/**
 * @param array<string, mixed> $question
 */
function answerForQuestion(array $question, int $seed): string
{
    $type = (string) ($question['type'] ?? 'mcq');
    if ($type === 'essay' || $type === 'short_answer') {
        return 'Synthetic response: main idea, supporting detail, and conclusion.';
    }

    $options = $question['options'] ?? [];
    if (is_array($options) && $options !== []) {
        $index = $seed % count($options);
        return (string) ($options[$index] ?? '');
    }

    $correctAnswer = trim((string) ($question['correctAnswer'] ?? ''));
    return $correctAnswer !== '' ? $correctAnswer : 'Option A';
}

function gradeFromPercentage(float $percentage): string
{
    if ($percentage >= 97) {
        return 'A+';
    }
    if ($percentage >= 93) {
        return 'A';
    }
    if ($percentage >= 87) {
        return 'B';
    }
    if ($percentage >= 80) {
        return 'C+';
    }
    if ($percentage >= 75) {
        return 'C';
    }
    if ($percentage >= 70) {
        return 'B-';
    }
    if ($percentage >= 60) {
        return 'D';
    }

    return 'F';
}

function feedbackFromGrade(string $grade): string
{
    return match ($grade) {
        'A+', 'A' => 'Excellent performance with strong consistency across sections.',
        'B', 'B-' => 'Good understanding demonstrated. Review missed concepts for higher accuracy.',
        'C+', 'C' => 'Satisfactory work. Focus on core concepts and pacing improvements.',
        'D' => 'Passing mark achieved. Additional guided practice is recommended.',
        default => 'Needs improvement. Schedule remediation and targeted review.',
    };
}

/**
 * @return array<int, array<string, mixed>>
 */
function buildQuestionSet(string $subject, int $seed): array
{
    $topic = trim($subject) === '' ? 'General Studies' : $subject;

    return [
        [
            'id' => 'q-' . $seed . '-1',
            'text' => "Core concept check in {$topic}: choose the best answer.",
            'type' => 'mcq',
            'options' => ['Option A', 'Option B', 'Option C', 'Option D'],
            'correctAnswer' => 'Option A',
            'marks' => 20,
            'topic' => $topic,
        ],
        [
            'id' => 'q-' . $seed . '-2',
            'text' => "Applied problem solving in {$topic}.",
            'type' => 'mcq',
            'options' => ['Approach 1', 'Approach 2', 'Approach 3', 'Approach 4'],
            'correctAnswer' => 'Approach 2',
            'marks' => 20,
            'topic' => $topic,
        ],
        [
            'id' => 'q-' . $seed . '-3',
            'text' => "Interpret the scenario and identify the correct outcome for {$topic}.",
            'type' => 'mcq',
            'options' => ['Outcome 1', 'Outcome 2', 'Outcome 3', 'Outcome 4'],
            'correctAnswer' => 'Outcome 3',
            'marks' => 20,
            'topic' => $topic,
        ],
        [
            'id' => 'q-' . $seed . '-4',
            'text' => "Select the strongest justification in {$topic}.",
            'type' => 'mcq',
            'options' => ['Justification A', 'Justification B', 'Justification C', 'Justification D'],
            'correctAnswer' => 'Justification B',
            'marks' => 20,
            'topic' => $topic,
        ],
        [
            'id' => 'q-' . $seed . '-5',
            'text' => "Short reflection prompt for {$topic}.",
            'type' => 'essay',
            'marks' => 20,
            'topic' => $topic,
        ],
    ];
}

/**
 * @return array{0: string, 1: string}
 */
function deriveCaseDisposition(int $eventCount, string $latestType): array
{
    if ($latestType === 'auto_submitted') {
        if ($eventCount >= 3) {
            return ['critical', 'invalidated'];
        }

        return ['high', 'score_penalized'];
    }

    if ($eventCount >= 3) {
        return ['high', 'score_penalized'];
    }
    if ($eventCount === 2) {
        return ['medium', 'warned'];
    }

    return ['low', 'pending'];
}

function caseNoteFor(string $severity, string $outcome, int $eventCount): string
{
    return sprintf(
        'Synthetic case for presentation: %d events observed, severity=%s, outcome=%s.',
        $eventCount,
        $severity,
        $outcome
    );
}

function deterministicUuid(string $seed): string
{
    $hash = hash('sha256', $seed);
    $timeLow = substr($hash, 0, 8);
    $timeMid = substr($hash, 8, 4);
    $timeHi = dechex((hexdec(substr($hash, 12, 4)) & 0x0fff) | 0x4000);
    $clockSeq = dechex((hexdec(substr($hash, 16, 4)) & 0x3fff) | 0x8000);
    $node = substr($hash, 20, 12);

    return sprintf(
        '%s-%s-%s-%s-%s',
        strtolower($timeLow),
        strtolower($timeMid),
        strtolower(str_pad($timeHi, 4, '0', STR_PAD_LEFT)),
        strtolower(str_pad($clockSeq, 4, '0', STR_PAD_LEFT)),
        strtolower($node),
    );
}

/**
 * @param array<int, string> $header
 * @param array<int, array<string, string>> $rows
 */
function writeCsv(string $path, array $header, array $rows): void
{
    $handle = fopen($path, 'wb');
    if ($handle === false) {
        throw new RuntimeException('Failed to write CSV file: ' . $path);
    }

    try {
        fputcsv($handle, $header);
        foreach ($rows as $row) {
            $line = [];
            foreach ($header as $column) {
                $line[] = $row[$column] ?? '';
            }
            fputcsv($handle, $line);
        }
    } finally {
        fclose($handle);
    }
}

function printUsage(): void
{
    $usage = <<<TXT
Usage:
  php scripts/generate_fake_exam_data_csv.php [--users-csv PATH] [--output-dir PATH]
      [--class-size N] [--exams-per-class N]
      [--violating-students-per-exam N] [--max-violations-per-pair N]

Defaults:
  --users-csv backend/database/seeds/fake_users_5701.csv
  --output-dir backend/database/seeds
  --class-size 40
  --exams-per-class 2
  --violating-students-per-exam 5
  --max-violations-per-pair 3

Generated files:
  fake_classes.csv
  fake_class_students.csv
  fake_exams.csv
  fake_submissions.csv
  fake_exam_violations.csv
  fake_violation_cases.csv

TXT;

    fwrite(STDOUT, $usage);
}
