<?php

declare(strict_types=1);

namespace App\Services;

use App\Shared\Database\RoutineGateway;
use App\Shared\Security\AesGcmCrypto;
use App\Services\Support\ExamMapper;
use App\Services\Support\ValueNormalizer;
use App\Shared\Support\ApiException;
use App\Shared\Support\Helpers;

final class ResultService
{
    public function __construct(
        private RoutineGateway $gateway,
        private AesGcmCrypto $crypto,
        private ExamMapper $mapper,
        private ValueNormalizer $normalizer,
        private StudentExamAccommodationService $accommodationService,
    ) {
    }

    public function startAttempt(array $authUser, array $payload): array
    {
        $this->assertStudentRole($authUser);

        $examId = trim((string) ($payload['examId'] ?? ''));
        if ($examId === '') {
            throw new ApiException(422, 'examId is required.');
        }

        $exam = $this->loadAccessibleExam($authUser, $examId);
        $this->assertExamPublished($exam);
        $policy = $this->accommodationService->resolveExamPolicy($exam, (string) $authUser['id']);
        $now = gmdate('Y-m-d H:i:s');
        $this->assertWithinAllowedWindow($policy, $now);

        $attempts = $this->loadAttemptsForStudentExam($examId, (string) $authUser['id']);
        $attempts = $this->expireClosedAttempts($attempts, $now);

        foreach ($attempts as $attempt) {
            if (($attempt['status'] ?? '') === 'in_progress') {
                throw new ApiException(409, 'An attempt is already in progress for this exam.');
            }
        }

        if (count($attempts) >= (int) $policy['attemptLimit']) {
            throw new ApiException(409, 'Attempt limit reached for this exam.');
        }

        $nextAttemptNo = 1;
        foreach ($attempts as $attempt) {
            $nextAttemptNo = max($nextAttemptNo, (int) ($attempt['attemptNo'] ?? 0) + 1);
        }

        $rows = $this->gateway->call('sp_results_start_attempt', [
            (string) ($payload['id'] ?? Helpers::uuidV4()),
            $examId,
            (string) $authUser['id'],
            $nextAttemptNo,
            $now,
            (int) $policy['allowedDurationMinutes'],
            $this->normalizeStoredDateTime((string) $policy['effectiveStartDate']),
            $this->normalizeStoredDateTime((string) $policy['effectiveEndDate']),
        ]);

        $row = $rows[0] ?? null;
        if (!is_array($row)) {
            throw new ApiException(500, 'Attempt start failed.');
        }

        return $this->mapper->mapSubmissionRow($row);
    }

    /**
     * @param array<string, mixed> $authUser
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    public function submitResult(array $authUser, array $payload): array
    {
        $this->assertStudentRole($authUser);

        $answersInput = $this->validateAnswersPayload($payload['answers'] ?? null);
        $submissionId = trim((string) ($payload['submissionId'] ?? ''));
        $submission = null;

        if ($submissionId !== '') {
            $submission = $this->loadSubmissionForUser($authUser, $submissionId);
            $payloadExamId = trim((string) ($payload['examId'] ?? ''));
            if ($payloadExamId !== '' && $payloadExamId !== (string) ($submission['examId'] ?? '')) {
                throw new ApiException(422, 'submissionId does not belong to the provided examId.');
            }
        } else {
            $submission = $this->startAttempt($authUser, $payload);
            $submissionId = (string) ($submission['id'] ?? '');
        }

        if (($submission['status'] ?? '') !== 'in_progress') {
            throw new ApiException(409, 'Only in-progress attempts can be submitted.');
        }

        $now = gmdate('Y-m-d H:i:s');
        if (!$this->isAttemptStillOpen($submission, $now)) {
            $this->markAttemptExpired($submissionId, $now);
            throw new ApiException(409, 'Submission is outside the allowed exam window or time limit.');
        }

        $examId = (string) ($submission['examId'] ?? '');
        $exam = $this->loadAccessibleExam($authUser, $examId);
        $grading = $this->buildGradedAnswers($exam, $answersInput);
        $status = $grading['hasNonMcq'] ? 'submitted' : 'graded';
        $totalScore = $grading['hasNonMcq'] ? null : $grading['mcqScore'];
        $percentage = null;
        $grade = null;
        $gradedAt = null;

        if (!$grading['hasNonMcq']) {
            $totalMarks = (float) ($exam['totalMarks'] ?? 0);
            $percentage = $totalMarks > 0 ? round(($grading['mcqScore'] / $totalMarks) * 100, 2) : 0.0;
            $grade = Helpers::gradeFromPercentage($percentage);
            $gradedAt = $now;
        }

        [$feedbackCiphertext, $feedbackIv, $feedbackTag] = $this->crypto->encryptParams(null);
        $encodedAnswers = json_encode($grading['gradedAnswers'], JSON_UNESCAPED_UNICODE);
        if (!is_string($encodedAnswers)) {
            throw new ApiException(500, 'Unable to encode graded answers.');
        }

        $rows = $this->gateway->call('sp_results_submit_started_attempt', [
            $submissionId,
            $encodedAnswers,
            $totalScore,
            $percentage,
            $grade,
            $feedbackCiphertext,
            $feedbackIv,
            $feedbackTag,
            null,
            $now,
            $gradedAt,
            $status,
        ]);

        $row = $rows[0] ?? null;
        if (!is_array($row)) {
            throw new ApiException(500, 'Submission failed.');
        }

        if (array_key_exists('questionTelemetry', $payload) && is_array($payload['questionTelemetry'])) {
            $this->persistQuestionTelemetry(
                $submissionId,
                $examId,
                (string) $authUser['id'],
                $exam['questions'],
                $payload['questionTelemetry'],
            );
        }

        return $this->mapper->mapSubmissionRow($row);
    }

    /**
     * @param array<string, mixed> $authUser
     * @return array<int, array<string, mixed>>
     */
    public function getResultsByStudent(array $authUser, string $studentId): array
    {
        $rows = $this->gateway->call('sp_results_get_by_student_for_user', [
            $studentId,
            $authUser['role'],
            $authUser['id'],
        ]);

        return array_map(fn (array $row): array => $this->mapper->mapSubmissionRow($row), $rows);
    }

    /**
     * @param array<string, mixed> $authUser
     * @param array<int, array<string, mixed>> $grades
     * @return array<string, mixed>
     */
    public function gradeSubmission(array $authUser, string $submissionId, array $grades, string $feedback): array
    {
        $rows = $this->gateway->call('sp_results_get_by_id_for_user', [
            $submissionId,
            $authUser['role'],
            $authUser['id'],
        ]);

        $row = $rows[0] ?? null;
        if (!is_array($row)) {
            throw new ApiException(404, 'Submission not found.');
        }

        $submission = $this->mapper->mapSubmissionRow($row);
        $answers = $submission['answers'];

        $gradeMap = [];
        foreach ($grades as $gradeRow) {
            if (!is_array($gradeRow)) {
                continue;
            }

            $questionId = (string) ($gradeRow['questionId'] ?? '');
            if ($questionId === '') {
                continue;
            }

            $gradeMap[$questionId] = (float) ($gradeRow['marksAwarded'] ?? 0);
        }

        foreach ($answers as $index => $answer) {
            $questionId = (string) ($answer['questionId'] ?? '');
            if ($questionId !== '' && isset($gradeMap[$questionId])) {
                $answers[$index]['marksAwarded'] = $gradeMap[$questionId];
            }
        }

        $totalScore = 0.0;
        foreach ($answers as $answer) {
            $totalScore += (float) ($answer['marksAwarded'] ?? 0);
        }

        $totalMarks = (float) ($row['totalMarks'] ?? 0);
        $percentage = $totalMarks > 0 ? round(($totalScore / $totalMarks) * 100, 2) : 0.0;
        $grade = Helpers::gradeFromPercentage($percentage);
        [$feedbackCiphertext, $feedbackIv, $feedbackTag] = $this->crypto->encryptParams($feedback);

        $updatedRows = $this->gateway->call('sp_results_grade_update', [
            $submissionId,
            json_encode($this->encryptAnswerPayload($answers), JSON_UNESCAPED_UNICODE),
            $totalScore,
            $percentage,
            $grade,
            $feedbackCiphertext,
            $feedbackIv,
            $feedbackTag,
            null,
            gmdate('Y-m-d H:i:s'),
            'graded',
        ]);

        $updatedRow = $updatedRows[0] ?? null;
        if (!is_array($updatedRow)) {
            throw new ApiException(500, 'Grade update failed.');
        }

        return $this->mapper->mapSubmissionRow($updatedRow);
    }

    /**
     * @param mixed $answersInput
     * @return array<int, array<string, mixed>>
     */
    private function validateAnswersPayload(mixed $answersInput): array
    {
        if (!is_array($answersInput)) {
            throw new ApiException(422, 'answers must be an array.');
        }

        $validated = [];
        foreach ($answersInput as $answerRow) {
            $position = count($validated) + 1;
            if (!is_array($answerRow)) {
                throw new ApiException(422, sprintf('Answer %d is invalid.', $position));
            }

            $questionId = trim((string) ($answerRow['questionId'] ?? ''));
            if ($questionId === '') {
                throw new ApiException(422, sprintf('Answer %d questionId is required.', $position));
            }

            $validated[] = $answerRow;
        }

        return $validated;
    }

    /**
     * @param array<string, mixed> $exam
     * @param array<int, array<string, mixed>> $answersInput
     * @return array{gradedAnswers: array<int, array<string, mixed>>, mcqScore: float, hasNonMcq: bool}
     */
    private function buildGradedAnswers(array $exam, array $answersInput): array
    {
        $gradedAnswers = [];
        $mcqScore = 0.0;

        foreach ($answersInput as $answerRow) {
            $questionId = trim((string) ($answerRow['questionId'] ?? ''));
            $answerValue = (string) ($answerRow['answer'] ?? '');
            [$answerCiphertext, $answerIv, $answerTag] = $this->crypto->encryptParams($answerValue);
            if ($answerValue !== '' && $answerCiphertext === null) {
                throw new ApiException(500, 'Failed to encrypt exam answer.');
            }

            $entry = [
                'questionId' => $questionId,
                'answerCiphertext' => $answerCiphertext,
                'answerIv' => $answerIv,
                'answerTag' => $answerTag,
            ];

            foreach ($exam['questions'] as $question) {
                if (($question['id'] ?? '') !== $questionId) {
                    continue;
                }

                if (($question['type'] ?? '') === 'mcq') {
                    $isCorrect = isset($question['correctAnswer']) && $answerValue === (string) $question['correctAnswer'];
                    $marksAwarded = $isCorrect ? (float) ($question['marks'] ?? 0) : 0.0;
                    $entry['marksAwarded'] = $marksAwarded;
                    $mcqScore += $marksAwarded;
                }

                break;
            }

            $gradedAnswers[] = $entry;
        }

        $hasNonMcq = false;
        foreach ($exam['questions'] as $question) {
            if (($question['type'] ?? '') !== 'mcq') {
                $hasNonMcq = true;
                break;
            }
        }

        return [
            'gradedAnswers' => $gradedAnswers,
            'mcqScore' => $mcqScore,
            'hasNonMcq' => $hasNonMcq,
        ];
    }

    /**
     * @param array<string, mixed> $authUser
     * @return array<string, mixed>
     */
    private function loadAccessibleExam(array $authUser, string $examId): array
    {
        $examRows = $this->gateway->call('sp_exams_get_by_id_for_user', [$examId, $authUser['role'], $authUser['id']]);
        $examRow = $examRows[0] ?? null;
        if (!is_array($examRow)) {
            throw new ApiException(404, 'Exam not found.');
        }

        return $this->mapper->mapExamRow($examRow);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function loadAttemptsForStudentExam(string $examId, string $studentId): array
    {
        $rows = $this->gateway->call('sp_results_get_by_exam_and_student', [$examId, $studentId]);
        return array_map(fn (array $row): array => $this->mapper->mapSubmissionRow($row), $rows);
    }

    /**
     * @param array<string, mixed> $authUser
     * @return array<string, mixed>
     */
    private function loadSubmissionForUser(array $authUser, string $submissionId): array
    {
        $rows = $this->gateway->call('sp_results_get_by_id_for_user', [
            $submissionId,
            $authUser['role'],
            $authUser['id'],
        ]);

        $row = $rows[0] ?? null;
        if (!is_array($row)) {
            throw new ApiException(404, 'Submission not found.');
        }

        return $this->mapper->mapSubmissionRow($row);
    }

    /**
     * @param array<int, array<string, mixed>> $attempts
     * @return array<int, array<string, mixed>>
     */
    private function expireClosedAttempts(array $attempts, string $now): array
    {
        foreach ($attempts as $attempt) {
            if (($attempt['status'] ?? '') !== 'in_progress') {
                continue;
            }

            if ($this->isAttemptStillOpen($attempt, $now)) {
                continue;
            }

            $attemptId = (string) ($attempt['id'] ?? '');
            if ($attemptId !== '') {
                $this->markAttemptExpired($attemptId, $now);
            }
        }

        return array_map(
            fn (array $row): array => $row['status'] === 'in_progress' && !$this->isAttemptStillOpen($row, $now)
                ? array_merge($row, ['status' => 'expired', 'submittedAt' => $now])
                : $row,
            $attempts,
        );
    }

    /**
     * @param array<string, mixed> $attempt
     */
    private function isAttemptStillOpen(array $attempt, string $now): bool
    {
        $nowTs = strtotime($now);
        $startedAtTs = strtotime((string) ($attempt['startedAt'] ?? ''));
        $windowEndTs = strtotime((string) ($attempt['effectiveWindowEndAt'] ?? ''));
        if ($nowTs === false || $startedAtTs === false || $windowEndTs === false) {
            return false;
        }

        $allowedDurationMinutes = (int) ($attempt['allowedDurationMinutes'] ?? 0);
        $durationDeadlineTs = $startedAtTs + max(0, $allowedDurationMinutes) * 60;
        $hardDeadlineTs = min($windowEndTs, $durationDeadlineTs);

        return $nowTs <= $hardDeadlineTs;
    }

    /**
     * @param array<string, mixed> $policy
     */
    private function assertWithinAllowedWindow(array $policy, string $now): void
    {
        $nowTs = strtotime($now);
        $startTs = strtotime((string) ($policy['effectiveStartDate'] ?? ''));
        $endTs = strtotime((string) ($policy['effectiveEndDate'] ?? ''));
        if ($nowTs === false || $startTs === false || $endTs === false || $nowTs < $startTs || $nowTs > $endTs) {
            throw new ApiException(409, 'Attempt is outside the allowed exam window.');
        }
    }

    /**
     * @param array<string, mixed> $authUser
     */
    private function assertStudentRole(array $authUser): void
    {
        if (($authUser['role'] ?? '') !== 'student') {
            throw new ApiException(403, 'Only students can manage exam attempts.');
        }
    }

    /**
     * @param array<string, mixed> $exam
     */
    private function assertExamPublished(array $exam): void
    {
        if (($exam['status'] ?? '') !== 'published') {
            throw new ApiException(409, 'Exam is not published.');
        }
    }

    private function markAttemptExpired(string $submissionId, string $now): void
    {
        $this->gateway->call('sp_results_update_status', [
            $submissionId,
            'expired',
            $now,
        ]);
    }

    private function normalizeStoredDateTime(string $value): string
    {
        $timestamp = strtotime($value);
        if ($timestamp === false) {
            throw new ApiException(500, 'A required exam schedule value is invalid.');
        }

        return gmdate('Y-m-d H:i:s', $timestamp);
    }

    /**
     * @param array<int, array<string, mixed>> $answers
     * @return array<int, array<string, mixed>>
     */
    private function encryptAnswerPayload(array $answers): array
    {
        $result = [];
        foreach ($answers as $answer) {
            if (!is_array($answer)) {
                continue;
            }

            $questionId = (string) ($answer['questionId'] ?? '');
            if ($questionId === '') {
                continue;
            }

            $plainAnswer = (string) ($answer['answer'] ?? '');
            [$answerCiphertext, $answerIv, $answerTag] = $this->crypto->encryptParams($plainAnswer);
            if ($plainAnswer !== '' && $answerCiphertext === null) {
                throw new ApiException(500, 'Failed to encrypt exam answer.');
            }

            $entry = [
                'questionId' => $questionId,
                'answerCiphertext' => $answerCiphertext,
                'answerIv' => $answerIv,
                'answerTag' => $answerTag,
            ];

            if (array_key_exists('marksAwarded', $answer)) {
                $entry['marksAwarded'] = (float) $answer['marksAwarded'];
            }

            $result[] = $entry;
        }

        return $result;
    }

    /**
     * @param array<int, array<string, mixed>> $questions
     * @param array<int, array<string, mixed>> $questionTelemetry
     */
    private function persistQuestionTelemetry(
        string $submissionId,
        string $examId,
        string $studentId,
        array $questions,
        array $questionTelemetry,
    ): void {
        if ($submissionId === '') {
            return;
        }

        $questionTopicMap = [];
        foreach ($questions as $question) {
            if (!is_array($question)) {
                continue;
            }

            $questionId = (string) ($question['id'] ?? '');
            if ($questionId === '') {
                continue;
            }

            $questionTopicMap[$questionId] = $this->normalizer->nullableString($question['topic'] ?? null);
        }

        $this->gateway->call('sp_submission_question_metrics_delete_by_submission', [$submissionId]);

        foreach ($questionTelemetry as $metric) {
            if (!is_array($metric)) {
                continue;
            }

            $questionId = trim((string) ($metric['questionId'] ?? ''));
            if ($questionId === '') {
                continue;
            }

            $topic = $this->normalizer->nullableString($metric['topic'] ?? ($questionTopicMap[$questionId] ?? null));

            $this->gateway->call('sp_submission_question_metrics_upsert', [
                $submissionId,
                $examId,
                $studentId,
                $questionId,
                $topic,
                max(0, (int) ($metric['timeSpentSeconds'] ?? 0)),
                max(0, (int) ($metric['visitCount'] ?? 0)),
                max(0, (int) ($metric['answerChangeCount'] ?? 0)),
            ]);
        }
    }
}
