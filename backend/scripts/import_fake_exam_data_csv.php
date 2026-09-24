<?php

declare(strict_types=1);

use App\Shared\Config\AppConfig;
use App\Shared\Config\Env;
use App\Shared\Database\DbConnection;
use App\Shared\Database\LogDbConnection;

require_once __DIR__ . '/../bootstrap/autoload.php';

const DEFAULT_SEED_DIR = __DIR__ . '/../database/seeds';
const DEFAULT_CLASSES_CSV = 'fake_classes.csv';
const DEFAULT_CLASS_STUDENTS_CSV = 'fake_class_students.csv';
const DEFAULT_EXAMS_CSV = 'fake_exams.csv';
const DEFAULT_SUBMISSIONS_CSV = 'fake_submissions.csv';
const DEFAULT_VIOLATIONS_CSV = 'fake_exam_violations.csv';
const DEFAULT_CASES_CSV = 'fake_violation_cases.csv';

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

    $seedDir = resolvePath((string) ($options['seed-dir'] ?? DEFAULT_SEED_DIR), __DIR__ . '/..');
    $classesCsv = resolveCsvPath($seedDir, (string) ($options['classes-csv'] ?? DEFAULT_CLASSES_CSV));
    $classStudentsCsv = resolveCsvPath($seedDir, (string) ($options['class-students-csv'] ?? DEFAULT_CLASS_STUDENTS_CSV));
    $examsCsv = resolveCsvPath($seedDir, (string) ($options['exams-csv'] ?? DEFAULT_EXAMS_CSV));
    $submissionsCsv = resolveCsvPath($seedDir, (string) ($options['submissions-csv'] ?? DEFAULT_SUBMISSIONS_CSV));
    $violationsCsv = resolveCsvPath($seedDir, (string) ($options['violations-csv'] ?? DEFAULT_VIOLATIONS_CSV));
    $casesCsv = resolveCsvPath($seedDir, (string) ($options['cases-csv'] ?? DEFAULT_CASES_CSV));

    assertReadableFile($classesCsv);
    assertReadableFile($classStudentsCsv);
    assertReadableFile($examsCsv);
    assertReadableFile($submissionsCsv);
    assertReadableFile($violationsCsv);
    assertReadableFile($casesCsv);

    $env = new Env(__DIR__ . '/../.env');
    $config = AppConfig::fromEnv($env);
    $mainPdo = (new DbConnection($config))->pdo();
    $logPdo = (new LogDbConnection($config))->pdo();

    $classRows = readCsvRows($classesCsv, ['id', 'name', 'subject', 'teacher_id', 'code', 'description', 'created_at']);
    $classStudentRows = readCsvRows($classStudentsCsv, ['class_id', 'student_id', 'joined_ts']);
    $examRows = readCsvRows(
        $examsCsv,
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
        ]
    );
    $submissionRows = readCsvRows(
        $submissionsCsv,
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
        ]
    );
    $violationRows = readCsvRows(
        $violationsCsv,
        ['exam_id', 'student_id', 'violation_no', 'violation_type', 'details', 'occurred_at']
    );
    $caseRows = readCsvRows(
        $casesCsv,
        ['id', 'exam_id', 'student_id', 'severity', 'outcome', 'teacher_notes', 'reviewed_by', 'reviewed_at']
    );

    $mainSummary = importMainExamData($mainPdo, $classRows, $classStudentRows, $examRows, $submissionRows);
    $logSummary = importViolationData($logPdo, $violationRows, $caseRows);

    fwrite(STDOUT, "Fake exam and violation import completed.\n");
    fwrite(STDOUT, "CSV sources:\n");
    fwrite(STDOUT, " - {$classesCsv}\n");
    fwrite(STDOUT, " - {$classStudentsCsv}\n");
    fwrite(STDOUT, " - {$examsCsv}\n");
    fwrite(STDOUT, " - {$submissionsCsv}\n");
    fwrite(STDOUT, " - {$violationsCsv}\n");
    fwrite(STDOUT, " - {$casesCsv}\n");
    fwrite(STDOUT, "Main DB summary:\n");
    fwrite(STDOUT, sprintf(" - classes inserted=%d ignored=%d\n", $mainSummary['classesInserted'], $mainSummary['classesIgnored']));
    fwrite(STDOUT, sprintf(" - class_students inserted=%d ignored=%d\n", $mainSummary['classStudentsInserted'], $mainSummary['classStudentsIgnored']));
    fwrite(STDOUT, sprintf(" - exams inserted=%d ignored=%d\n", $mainSummary['examsInserted'], $mainSummary['examsIgnored']));
    fwrite(STDOUT, sprintf(" - submissions inserted=%d ignored=%d\n", $mainSummary['submissionsInserted'], $mainSummary['submissionsIgnored']));
    fwrite(STDOUT, "Log DB summary:\n");
    fwrite(STDOUT, sprintf(" - violations inserted=%d ignored=%d\n", $logSummary['violationsInserted'], $logSummary['violationsIgnored']));
    fwrite(STDOUT, sprintf(" - violation_cases inserted=%d ignored=%d\n", $logSummary['casesInserted'], $logSummary['casesIgnored']));
}

/**
 * @param array<string, string> $options
 * @return int
 */
function parseInt(array $options, string $key, int $default): int
{
    $raw = (string) ($options[$key] ?? (string) $default);
    if (!preg_match('/^-?[0-9]+$/', $raw)) {
        throw new RuntimeException(sprintf('%s must be an integer.', $key));
    }

    return (int) $raw;
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

function resolveCsvPath(string $seedDir, string $fileOption): string
{
    $candidate = trim($fileOption);
    if ($candidate === '') {
        throw new RuntimeException('CSV filename/path cannot be empty.');
    }

    if (preg_match('/^[A-Za-z]:\\\\/', $candidate) === 1 || str_starts_with($candidate, '/') || str_starts_with($candidate, '\\')) {
        return $candidate;
    }

    return rtrim($seedDir, "\\/") . DIRECTORY_SEPARATOR . str_replace(['/', '\\'], DIRECTORY_SEPARATOR, $candidate);
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

function assertReadableFile(string $path): void
{
    if (!is_file($path) || !is_readable($path)) {
        throw new RuntimeException('CSV file is not readable: ' . $path);
    }
}

/**
 * @param array<int, string> $requiredColumns
 * @return array<int, array<string, string>>
 */
function readCsvRows(string $csvPath, array $requiredColumns): array
{
    $handle = fopen($csvPath, 'rb');
    if ($handle === false) {
        throw new RuntimeException('Failed to open CSV: ' . $csvPath);
    }

    try {
        $header = fgetcsv($handle);
        if ($header === false) {
            throw new RuntimeException('CSV is empty: ' . $csvPath);
        }
        $header = normalizeHeader($header);
        assertRequiredColumns($header, $requiredColumns, $csvPath);

        $rows = [];
        while (($row = fgetcsv($handle)) !== false) {
            if (isBlankRow($row)) {
                continue;
            }
            if (count($row) !== count($header)) {
                throw new RuntimeException('Malformed row in CSV: ' . $csvPath);
            }
            $mapped = array_combine($header, $row);
            if ($mapped === false) {
                throw new RuntimeException('Failed to map CSV row: ' . $csvPath);
            }
            $rows[] = array_map(static fn (mixed $value): string => trim((string) $value), $mapped);
        }

        return $rows;
    } finally {
        fclose($handle);
    }
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
 * @param array<int, string> $header
 * @param array<int, string> $requiredColumns
 */
function assertRequiredColumns(array $header, array $requiredColumns, string $csvPath): void
{
    foreach ($requiredColumns as $column) {
        if (!in_array($column, $header, true)) {
            throw new RuntimeException(sprintf('CSV %s must include column "%s".', $csvPath, $column));
        }
    }
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
 * @param array<int, array<string, string>> $classes
 * @param array<int, array<string, string>> $classStudents
 * @param array<int, array<string, string>> $exams
 * @param array<int, array<string, string>> $submissions
 * @return array<string, int>
 */
function importMainExamData(PDO $pdo, array $classes, array $classStudents, array $exams, array $submissions): array
{
    $summary = [
        'classesInserted' => 0,
        'classesIgnored' => 0,
        'classStudentsInserted' => 0,
        'classStudentsIgnored' => 0,
        'examsInserted' => 0,
        'examsIgnored' => 0,
        'submissionsInserted' => 0,
        'submissionsIgnored' => 0,
    ];

    $classStatement = $pdo->prepare(
        'INSERT IGNORE INTO classes (id, name, subject, teacher_id, code, description, created_at)
         VALUES (:id, :name, :subject, :teacher_id, :code, :description, :created_at)'
    );
    $classStudentStatement = $pdo->prepare(
        'INSERT IGNORE INTO class_students (class_id, student_id, joined_ts)
         VALUES (:class_id, :student_id, :joined_ts)'
    );
    $examStatement = $pdo->prepare(
        'INSERT IGNORE INTO exams (
            id, title, description, class_id, teacher_id,
            duration_minutes, total_marks, passing_marks,
            start_date, end_date, status, questions_json, created_at
         ) VALUES (
            :id, :title, :description, :class_id, :teacher_id,
            :duration_minutes, :total_marks, :passing_marks,
            :start_date, :end_date, :status, :questions_json, :created_at
         )'
    );
    $submissionStatement = $pdo->prepare(
        'INSERT IGNORE INTO submissions (
            id, exam_id, student_id, attempt_no, answers_json,
            total_score, percentage, grade,
            feedback_ciphertext, feedback_iv, feedback_tag, feedback_enc,
            started_at, allowed_duration_minutes,
            effective_window_start_at, effective_window_end_at,
            submitted_at, graded_at, status
         ) VALUES (
            :id, :exam_id, :student_id, :attempt_no, :answers_json,
            :total_score, :percentage, :grade,
            :feedback_ciphertext, :feedback_iv, :feedback_tag, :feedback_enc,
            :started_at, :allowed_duration_minutes,
            :effective_window_start_at, :effective_window_end_at,
            :submitted_at, :graded_at, :status
         )'
    );

    try {
        $pdo->beginTransaction();

        foreach ($classes as $row) {
            validateDate($row['created_at'] ?? '', 'classes.created_at');
            $classStatement->execute([
                ':id' => requireNonEmpty($row['id'] ?? '', 'classes.id'),
                ':name' => requireNonEmpty($row['name'] ?? '', 'classes.name'),
                ':subject' => requireNonEmpty($row['subject'] ?? '', 'classes.subject'),
                ':teacher_id' => requireNonEmpty($row['teacher_id'] ?? '', 'classes.teacher_id'),
                ':code' => requireNonEmpty($row['code'] ?? '', 'classes.code'),
                ':description' => nullableString($row['description'] ?? ''),
                ':created_at' => $row['created_at'],
            ]);

            if ($classStatement->rowCount() === 1) {
                $summary['classesInserted']++;
            } else {
                $summary['classesIgnored']++;
            }
        }

        foreach ($classStudents as $row) {
            validateDateTime($row['joined_ts'] ?? '', 'class_students.joined_ts');
            $classStudentStatement->execute([
                ':class_id' => requireNonEmpty($row['class_id'] ?? '', 'class_students.class_id'),
                ':student_id' => requireNonEmpty($row['student_id'] ?? '', 'class_students.student_id'),
                ':joined_ts' => $row['joined_ts'],
            ]);

            if ($classStudentStatement->rowCount() === 1) {
                $summary['classStudentsInserted']++;
            } else {
                $summary['classStudentsIgnored']++;
            }
        }

        foreach ($exams as $row) {
            validateDate($row['created_at'] ?? '', 'exams.created_at');
            validateDateTime($row['start_date'] ?? '', 'exams.start_date');
            validateDateTime($row['end_date'] ?? '', 'exams.end_date');
            validateExamStatus($row['status'] ?? '');
            validateJson($row['questions_json'] ?? '', 'exams.questions_json');

            $examStatement->execute([
                ':id' => requireNonEmpty($row['id'] ?? '', 'exams.id'),
                ':title' => requireNonEmpty($row['title'] ?? '', 'exams.title'),
                ':description' => requireNonEmpty($row['description'] ?? '', 'exams.description'),
                ':class_id' => requireNonEmpty($row['class_id'] ?? '', 'exams.class_id'),
                ':teacher_id' => requireNonEmpty($row['teacher_id'] ?? '', 'exams.teacher_id'),
                ':duration_minutes' => parsePositiveIntValue($row['duration_minutes'] ?? '', 'exams.duration_minutes'),
                ':total_marks' => parsePositiveIntValue($row['total_marks'] ?? '', 'exams.total_marks'),
                ':passing_marks' => parsePositiveIntValue($row['passing_marks'] ?? '', 'exams.passing_marks'),
                ':start_date' => $row['start_date'],
                ':end_date' => $row['end_date'],
                ':status' => $row['status'],
                ':questions_json' => $row['questions_json'],
                ':created_at' => $row['created_at'],
            ]);

            if ($examStatement->rowCount() === 1) {
                $summary['examsInserted']++;
            } else {
                $summary['examsIgnored']++;
            }
        }

        foreach ($submissions as $row) {
            validateJson($row['answers_json'] ?? '', 'submissions.answers_json');
            validateDateTime($row['started_at'] ?? '', 'submissions.started_at');
            validateDateTime($row['effective_window_start_at'] ?? '', 'submissions.effective_window_start_at');
            validateDateTime($row['effective_window_end_at'] ?? '', 'submissions.effective_window_end_at');
            validateDateTime($row['submitted_at'] ?? '', 'submissions.submitted_at');
            validateSubmissionStatus($row['status'] ?? '');
            validateGradedAt($row['graded_at'] ?? '', $row['status'] ?? '');

            $submissionStatement->execute([
                ':id' => requireNonEmpty($row['id'] ?? '', 'submissions.id'),
                ':exam_id' => requireNonEmpty($row['exam_id'] ?? '', 'submissions.exam_id'),
                ':student_id' => requireNonEmpty($row['student_id'] ?? '', 'submissions.student_id'),
                ':attempt_no' => parsePositiveIntValue($row['attempt_no'] ?? '', 'submissions.attempt_no'),
                ':answers_json' => $row['answers_json'],
                ':total_score' => parseNullableDecimalValue($row['total_score'] ?? '', 'submissions.total_score'),
                ':percentage' => parseNullableDecimalValue($row['percentage'] ?? '', 'submissions.percentage'),
                ':grade' => nullableString($row['grade'] ?? ''),
                ':feedback_ciphertext' => nullableString($row['feedback_ciphertext'] ?? ''),
                ':feedback_iv' => nullableString($row['feedback_iv'] ?? ''),
                ':feedback_tag' => nullableString($row['feedback_tag'] ?? ''),
                ':feedback_enc' => nullableString($row['feedback_enc'] ?? ''),
                ':started_at' => $row['started_at'],
                ':allowed_duration_minutes' => parsePositiveIntValue($row['allowed_duration_minutes'] ?? '', 'submissions.allowed_duration_minutes'),
                ':effective_window_start_at' => $row['effective_window_start_at'],
                ':effective_window_end_at' => $row['effective_window_end_at'],
                ':submitted_at' => $row['submitted_at'],
                ':graded_at' => nullableString($row['graded_at'] ?? ''),
                ':status' => trim((string) $row['status']),
            ]);

            if ($submissionStatement->rowCount() === 1) {
                $summary['submissionsInserted']++;
            } else {
                $summary['submissionsIgnored']++;
            }
        }

        $pdo->commit();
    } catch (Throwable $throwable) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $throwable;
    }

    return $summary;
}

/**
 * @param array<int, array<string, string>> $violations
 * @param array<int, array<string, string>> $cases
 * @return array<string, int>
 */
function importViolationData(PDO $pdo, array $violations, array $cases): array
{
    $summary = [
        'violationsInserted' => 0,
        'violationsIgnored' => 0,
        'casesInserted' => 0,
        'casesIgnored' => 0,
    ];

    $violationStatement = $pdo->prepare(
        'INSERT INTO exam_violations (
            exam_id, student_id, violation_no, violation_type, details, occurred_at
         )
         SELECT ?, ?, ?, ?, ?, ?
         WHERE NOT EXISTS (
             SELECT 1
             FROM exam_violations
             WHERE exam_id = ?
               AND student_id = ?
               AND violation_no = ?
               AND violation_type = ?
               AND COALESCE(details, \'\') = COALESCE(?, \'\')
               AND occurred_at = ?
         )'
    );

    $caseStatement = $pdo->prepare(
        'INSERT IGNORE INTO violation_cases (
            id, exam_id, student_id, severity, outcome, teacher_notes, reviewed_by, reviewed_at
         ) VALUES (
            :id, :exam_id, :student_id, :severity, :outcome, :teacher_notes, :reviewed_by, :reviewed_at
         )'
    );

    try {
        $pdo->beginTransaction();

        foreach ($violations as $row) {
            validateDateTime($row['occurred_at'] ?? '', 'exam_violations.occurred_at');
            validateViolationType($row['violation_type'] ?? '');
            $violationNo = parsePositiveIntValue($row['violation_no'] ?? '', 'exam_violations.violation_no');
            if ($violationNo > 255) {
                throw new RuntimeException('exam_violations.violation_no must be <= 255.');
            }

            $details = nullableString($row['details'] ?? '');
            $params = [
                requireNonEmpty($row['exam_id'] ?? '', 'exam_violations.exam_id'),
                requireNonEmpty($row['student_id'] ?? '', 'exam_violations.student_id'),
                $violationNo,
                $row['violation_type'],
                $details,
                $row['occurred_at'],
                requireNonEmpty($row['exam_id'] ?? '', 'exam_violations.exam_id'),
                requireNonEmpty($row['student_id'] ?? '', 'exam_violations.student_id'),
                $violationNo,
                $row['violation_type'],
                $details,
                $row['occurred_at'],
            ];
            $violationStatement->execute($params);

            if ($violationStatement->rowCount() === 1) {
                $summary['violationsInserted']++;
            } else {
                $summary['violationsIgnored']++;
            }
        }

        foreach ($cases as $row) {
            validateSeverity($row['severity'] ?? '');
            validateOutcome($row['outcome'] ?? '');
            $reviewedBy = nullableString($row['reviewed_by'] ?? '');
            $reviewedAtRaw = nullableString($row['reviewed_at'] ?? '');
            if ($reviewedAtRaw !== null) {
                validateDateTime($reviewedAtRaw, 'violation_cases.reviewed_at');
            }
            $caseStatement->execute([
                ':id' => requireNonEmpty($row['id'] ?? '', 'violation_cases.id'),
                ':exam_id' => requireNonEmpty($row['exam_id'] ?? '', 'violation_cases.exam_id'),
                ':student_id' => requireNonEmpty($row['student_id'] ?? '', 'violation_cases.student_id'),
                ':severity' => $row['severity'],
                ':outcome' => $row['outcome'],
                ':teacher_notes' => nullableString($row['teacher_notes'] ?? ''),
                ':reviewed_by' => $reviewedBy,
                ':reviewed_at' => $reviewedAtRaw,
            ]);

            if ($caseStatement->rowCount() === 1) {
                $summary['casesInserted']++;
            } else {
                $summary['casesIgnored']++;
            }
        }

        $pdo->commit();
    } catch (Throwable $throwable) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $throwable;
    }

    return $summary;
}

function requireNonEmpty(string $value, string $fieldName): string
{
    $trimmed = trim($value);
    if ($trimmed === '') {
        throw new RuntimeException(sprintf('%s must not be empty.', $fieldName));
    }

    return $trimmed;
}

function nullableString(string $value): ?string
{
    $trimmed = trim($value);
    return $trimmed === '' ? null : $trimmed;
}

function parsePositiveIntValue(string $value, string $fieldName): int
{
    if (!preg_match('/^[0-9]+$/', trim($value))) {
        throw new RuntimeException(sprintf('%s must be a positive integer.', $fieldName));
    }
    $intValue = (int) $value;
    if ($intValue < 1) {
        throw new RuntimeException(sprintf('%s must be >= 1.', $fieldName));
    }

    return $intValue;
}

function parseNullableDecimalValue(string $value, string $fieldName): ?float
{
    $trimmed = trim($value);
    if ($trimmed === '') {
        return null;
    }

    if (!is_numeric($trimmed)) {
        throw new RuntimeException(sprintf('%s must be numeric when provided.', $fieldName));
    }

    return (float) $trimmed;
}

function validateDate(string $value, string $fieldName): void
{
    $trimmed = trim($value);
    $parsed = DateTimeImmutable::createFromFormat('Y-m-d', $trimmed);
    if ($parsed === false || $parsed->format('Y-m-d') !== $trimmed) {
        throw new RuntimeException(sprintf('%s must be in YYYY-MM-DD format.', $fieldName));
    }
}

function validateDateTime(string $value, string $fieldName): void
{
    $trimmed = trim($value);
    $parsed = DateTimeImmutable::createFromFormat('Y-m-d H:i:s', $trimmed);
    if ($parsed === false || $parsed->format('Y-m-d H:i:s') !== $trimmed) {
        throw new RuntimeException(sprintf('%s must be in YYYY-MM-DD HH:MM:SS format.', $fieldName));
    }
}

function validateJson(string $value, string $fieldName): void
{
    if (trim($value) === '') {
        throw new RuntimeException(sprintf('%s must be valid JSON.', $fieldName));
    }
    json_decode($value, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new RuntimeException(sprintf('%s has invalid JSON: %s', $fieldName, json_last_error_msg()));
    }
}

function validateExamStatus(string $value): void
{
    $allowed = ['draft', 'published', 'completed'];
    if (!in_array(trim($value), $allowed, true)) {
        throw new RuntimeException('exams.status must be one of: draft, published, completed.');
    }
}

function validateSubmissionStatus(string $value): void
{
    $allowed = ['in_progress', 'submitted', 'graded', 'expired'];
    if (!in_array(trim($value), $allowed, true)) {
        throw new RuntimeException('submissions.status is invalid.');
    }
}

function validateGradedAt(string $gradedAt, string $status): void
{
    $statusValue = trim($status);
    $gradedAtTrimmed = trim($gradedAt);
    if ($statusValue === 'graded' && $gradedAtTrimmed === '') {
        throw new RuntimeException('submissions.graded_at is required when status is graded.');
    }
    if ($gradedAtTrimmed !== '') {
        validateDateTime($gradedAtTrimmed, 'submissions.graded_at');
    }
}

function validateViolationType(string $value): void
{
    $allowed = ['tab_switch', 'window_blur', 'right_click', 'auto_submitted'];
    if (!in_array(trim($value), $allowed, true)) {
        throw new RuntimeException('exam_violations.violation_type is invalid.');
    }
}

function validateSeverity(string $value): void
{
    $allowed = ['low', 'medium', 'high', 'critical'];
    if (!in_array(trim($value), $allowed, true)) {
        throw new RuntimeException('violation_cases.severity is invalid.');
    }
}

function validateOutcome(string $value): void
{
    $allowed = ['pending', 'dismissed', 'warned', 'score_penalized', 'invalidated'];
    if (!in_array(trim($value), $allowed, true)) {
        throw new RuntimeException('violation_cases.outcome is invalid.');
    }
}

function printUsage(): void
{
    $usage = <<<TXT
Usage:
  php scripts/import_fake_exam_data_csv.php [--seed-dir PATH]
      [--classes-csv FILE_OR_PATH]
      [--class-students-csv FILE_OR_PATH]
      [--exams-csv FILE_OR_PATH]
      [--submissions-csv FILE_OR_PATH]
      [--violations-csv FILE_OR_PATH]
      [--cases-csv FILE_OR_PATH]

Defaults:
  --seed-dir backend/database/seeds
  --classes-csv fake_classes.csv
  --class-students-csv fake_class_students.csv
  --exams-csv fake_exams.csv
  --submissions-csv fake_submissions.csv
  --violations-csv fake_exam_violations.csv
  --cases-csv fake_violation_cases.csv

Behavior:
  - Main DB: inserts classes, class enrollments, exams, and submissions with INSERT IGNORE.
  - Log DB: inserts exam violations with duplicate-check, and violation cases with INSERT IGNORE.
  - Existing records are left unchanged.

TXT;

    fwrite(STDOUT, $usage);
}
