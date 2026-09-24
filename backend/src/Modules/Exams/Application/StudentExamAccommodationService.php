<?php

declare(strict_types=1);

namespace App\Modules\Exams\Application;

use App\Shared\Database\RoutineGateway;
use App\Shared\Security\AesGcmCrypto;
use App\Services\Support\ExamMapper;
use App\Shared\Support\ValueNormalizer;
use App\Shared\Support\ApiException;

final class StudentExamAccommodationService
{
    public function __construct(
        private RoutineGateway $gateway,
        private AesGcmCrypto $crypto,
        private ExamMapper $mapper,
        private ValueNormalizer $normalizer,
    ) {
    }

    /**
     * @param array<string, mixed> $authUser
     * @return array<int, array<string, mixed>>
     */
    public function getExamAccommodations(array $authUser, string $examId): array
    {
        $this->resolveManageableExam($authUser, $examId);
        $rows = $this->gateway->call('sp_student_exam_accommodations_get_by_exam', [$examId]);

        return array_map(fn (array $row): array => $this->mapper->mapAccommodationRow($row), $rows);
    }

    /**
     * @param array<string, mixed> $authUser
     * @return array<string, mixed>
     */
    public function getExamAccommodation(array $authUser, string $examId, string $studentId): array
    {
        $exam = $this->resolveManageableExam($authUser, $examId);
        $this->resolveStudentInExamClass($studentId, $exam);

        $row = $this->gateway->call('sp_student_exam_accommodations_get_by_exam_student', [$examId, $studentId])[0] ?? null;
        if (!is_array($row)) {
            throw new ApiException(404, 'Accommodation not found.');
        }

        return $this->mapper->mapAccommodationRow($row);
    }

    /**
     * @param array<string, mixed> $authUser
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    public function upsertExamAccommodation(array $authUser, string $examId, string $studentId, array $payload): array
    {
        $exam = $this->resolveManageableExam($authUser, $examId);
        $this->resolveStudentInExamClass($studentId, $exam);
        $validated = $this->validateAccommodationPayload($payload, $exam);
        [$preferencesCiphertext, $preferencesIv, $preferencesTag] = $this->encryptAccessibilityPreferences(
            $validated['accessibilityPreferences'],
        );

        $rows = $this->gateway->call('sp_student_exam_accommodations_upsert', [
            $examId,
            $studentId,
            $validated['extraTimeMinutes'],
            $validated['alternateStartAt'],
            $validated['alternateEndAt'],
            $validated['attemptLimit'],
            $preferencesCiphertext,
            $preferencesIv,
            $preferencesTag,
        ]);

        $row = $rows[0] ?? null;
        if (!is_array($row)) {
            throw new ApiException(500, 'Accommodation save failed.');
        }

        return $this->mapper->mapAccommodationRow($row);
    }

    /**
     * @param array<string, mixed> $authUser
     */
    public function deleteExamAccommodation(array $authUser, string $examId, string $studentId): void
    {
        $exam = $this->resolveManageableExam($authUser, $examId);
        $this->resolveStudentInExamClass($studentId, $exam);

        $row = $this->gateway->call('sp_student_exam_accommodations_get_by_exam_student', [$examId, $studentId])[0] ?? null;
        if (!is_array($row)) {
            throw new ApiException(404, 'Accommodation not found.');
        }

        $this->gateway->call('sp_student_exam_accommodations_delete', [$examId, $studentId]);
    }

    /**
     * @param array<string, mixed> $exam
     * @return array<string, mixed>
     */
    public function enrichStudentExam(array $exam, string $studentId): array
    {
        $policy = $this->resolveExamPolicy($exam, $studentId);
        $attemptCountRow = $this->buildAttemptCountMap($studentId)[$exam['id'] ?? ''] ?? [
            'attemptsUsed' => 0,
        ];

        $exam['attemptLimit'] = $policy['attemptLimit'];
        $exam['attemptsUsed'] = (int) ($attemptCountRow['attemptsUsed'] ?? 0);
        $exam['extraTimeMinutes'] = $policy['extraTimeMinutes'];
        $exam['effectiveStartDate'] = $policy['effectiveStartDate'];
        $exam['effectiveEndDate'] = $policy['effectiveEndDate'];
        $exam['accessibilityPreferences'] = $policy['accessibilityPreferences'];

        return $exam;
    }

    /**
     * @param array<int, array<string, mixed>> $exams
     * @return array<int, array<string, mixed>>
     */
    public function enrichStudentExams(array $exams, string $studentId): array
    {
        $accommodations = $this->buildAccommodationMap($studentId);
        $attemptCounts = $this->buildAttemptCountMap($studentId);
        $result = [];

        foreach ($exams as $exam) {
            if (!is_array($exam)) {
                continue;
            }

            $examId = (string) ($exam['id'] ?? '');
            $policy = $this->mergeExamPolicy($exam, $accommodations[$examId] ?? null);
            $exam['attemptLimit'] = $policy['attemptLimit'];
            $exam['attemptsUsed'] = (int) ($attemptCounts[$examId]['attemptsUsed'] ?? 0);
            $exam['extraTimeMinutes'] = $policy['extraTimeMinutes'];
            $exam['effectiveStartDate'] = $policy['effectiveStartDate'];
            $exam['effectiveEndDate'] = $policy['effectiveEndDate'];
            $exam['accessibilityPreferences'] = $policy['accessibilityPreferences'];
            $result[] = $exam;
        }

        return $result;
    }

    /**
     * @param array<string, mixed> $exam
     * @return array<string, mixed>
     */
    public function resolveExamPolicy(array $exam, string $studentId): array
    {
        $examId = trim((string) ($exam['id'] ?? ''));
        if ($examId === '') {
            throw new ApiException(500, 'Exam id is required to resolve accommodations.');
        }

        $row = $this->gateway->call('sp_student_exam_accommodations_get_by_exam_student', [$examId, $studentId])[0] ?? null;
        $accommodation = is_array($row) ? $this->mapper->mapAccommodationRow($row) : null;

        return $this->mergeExamPolicy($exam, $accommodation);
    }

    /**
     * @return array<string, array<string, mixed>>
     */
    private function buildAccommodationMap(string $studentId): array
    {
        $rows = $this->gateway->call('sp_student_exam_accommodations_get_by_student', [$studentId]);
        $result = [];

        foreach ($rows as $row) {
            $mapped = $this->mapper->mapAccommodationRow($row);
            $examId = (string) ($mapped['examId'] ?? '');
            if ($examId === '') {
                continue;
            }

            $result[$examId] = $mapped;
        }

        return $result;
    }

    /**
     * @return array<string, array<string, mixed>>
     */
    private function buildAttemptCountMap(string $studentId): array
    {
        $rows = $this->gateway->call('sp_results_get_attempt_counts_for_student', [$studentId]);
        $result = [];

        foreach ($rows as $row) {
            $examId = (string) ($row['examId'] ?? '');
            if ($examId === '') {
                continue;
            }

            $result[$examId] = [
                'attemptsUsed' => (int) ($row['attemptsUsed'] ?? 0),
                'latestAttemptNo' => isset($row['latestAttemptNo']) ? (int) $row['latestAttemptNo'] : 0,
            ];
        }

        return $result;
    }

    /**
     * @param array<string, mixed> $exam
     * @param array<string, mixed>|null $accommodation
     * @return array<string, mixed>
     */
    private function mergeExamPolicy(array $exam, ?array $accommodation): array
    {
        $examStart = (string) ($exam['startDate'] ?? '');
        $examEnd = (string) ($exam['endDate'] ?? '');
        $extraTimeMinutes = (int) ($accommodation['extraTimeMinutes'] ?? 0);
        $effectiveStartDate = (string) ($accommodation['alternateStartAt'] ?? $examStart);
        $effectiveEndDate = (string) ($accommodation['alternateEndAt'] ?? $examEnd);

        return [
            'attemptLimit' => isset($accommodation['attemptLimit']) ? (int) $accommodation['attemptLimit'] : 1,
            'extraTimeMinutes' => $extraTimeMinutes,
            'effectiveStartDate' => $effectiveStartDate,
            'effectiveEndDate' => $effectiveEndDate,
            'allowedDurationMinutes' => max(0, (int) ($exam['duration'] ?? 0) + $extraTimeMinutes),
            'accessibilityPreferences' => is_array($accommodation['accessibilityPreferences'] ?? null)
                ? $accommodation['accessibilityPreferences']
                : [],
        ];
    }

    /**
     * @param array<string, mixed> $authUser
     * @return array<string, mixed>
     */
    private function resolveManageableExam(array $authUser, string $examId): array
    {
        $role = (string) ($authUser['role'] ?? '');
        if (!in_array($role, ['admin', 'teacher'], true)) {
            throw new ApiException(403, 'Only admin or teacher users can manage accommodations.');
        }

        $row = $this->gateway->call('sp_exams_get_by_id', [$examId])[0] ?? null;
        if (!is_array($row)) {
            throw new ApiException(404, 'Exam not found.');
        }

        $exam = $this->mapper->mapExamRow($row);
        if ($role === 'teacher' && ($exam['teacherId'] ?? '') !== ($authUser['id'] ?? '')) {
            throw new ApiException(403, 'Teachers can only manage accommodations for their own exams.');
        }

        return $exam;
    }

    /**
     * @param array<string, mixed> $exam
     * @return array<string, mixed>
     */
    private function resolveStudentInExamClass(string $studentId, array $exam): array
    {
        $studentRow = $this->gateway->call('sp_auth_get_user_by_id', [$studentId])[0] ?? null;
        if (!is_array($studentRow)) {
            throw new ApiException(404, 'Student not found.');
        }

        $student = $this->mapper->mapUserRow($studentRow);
        if (($student['role'] ?? '') !== 'student') {
            throw new ApiException(422, 'Target user must be a student.');
        }

        $classId = (string) ($exam['classId'] ?? '');
        $classRow = $this->gateway->call('sp_classes_get_by_id', [$classId])[0] ?? null;
        if (!is_array($classRow)) {
            throw new ApiException(404, 'Exam class not found.');
        }

        $class = $this->mapper->mapClassRow($classRow);
        if (!in_array($studentId, $class['studentIds'], true)) {
            throw new ApiException(422, 'Student is not enrolled in the exam class.');
        }

        return $student;
    }

    /**
     * @param array<string, mixed> $payload
     * @param array<string, mixed> $exam
     * @return array<string, mixed>
     */
    private function validateAccommodationPayload(array $payload, array $exam): array
    {
        $extraTimeMinutes = (int) ($payload['extraTimeMinutes'] ?? 0);
        if ($extraTimeMinutes < 0 || $extraTimeMinutes > 1440) {
            throw new ApiException(422, 'extraTimeMinutes must be between 0 and 1440.');
        }

        $attemptLimit = null;
        if (array_key_exists('attemptLimit', $payload) && $payload['attemptLimit'] !== null && $payload['attemptLimit'] !== '') {
            $attemptLimit = (int) $payload['attemptLimit'];
            if ($attemptLimit < 1 || $attemptLimit > 20) {
                throw new ApiException(422, 'attemptLimit must be between 1 and 20.');
            }
        }

        $hasAlternateStart = array_key_exists('alternateStartAt', $payload);
        $hasAlternateEnd = array_key_exists('alternateEndAt', $payload);
        if ($hasAlternateStart xor $hasAlternateEnd) {
            throw new ApiException(422, 'alternateStartAt and alternateEndAt must be provided together.');
        }

        $alternateStartAt = null;
        $alternateEndAt = null;
        if ($hasAlternateStart && $hasAlternateEnd) {
            $alternateStartAt = $this->normalizeNullableDateTime($payload['alternateStartAt'] ?? null, 'alternateStartAt');
            $alternateEndAt = $this->normalizeNullableDateTime($payload['alternateEndAt'] ?? null, 'alternateEndAt');

            if (($alternateStartAt === null) !== ($alternateEndAt === null)) {
                throw new ApiException(422, 'alternateStartAt and alternateEndAt must be provided together.');
            }
        }

        $effectiveStart = $alternateStartAt ?? $this->normalizeRequiredStoredDate((string) ($exam['startDate'] ?? ''), 'Exam startDate');
        $effectiveEnd = $alternateEndAt ?? $this->normalizeRequiredStoredDate((string) ($exam['endDate'] ?? ''), 'Exam endDate');
        if (strtotime($effectiveEnd) <= strtotime($effectiveStart)) {
            throw new ApiException(422, 'The effective exam end must be later than the effective start.');
        }

        $accessibilityPreferences = $this->normalizeAccessibilityPreferences(
            $payload['accessibilityPreferences'] ?? [],
        );

        return [
            'extraTimeMinutes' => $extraTimeMinutes,
            'attemptLimit' => $attemptLimit,
            'alternateStartAt' => $alternateStartAt,
            'alternateEndAt' => $alternateEndAt,
            'accessibilityPreferences' => $accessibilityPreferences,
        ];
    }

    /**
     * @param array<int|string, mixed> $preferences
     * @return array{0: ?string, 1: ?string, 2: ?string}
     */
    private function encryptAccessibilityPreferences(array $preferences): array
    {
        if ($preferences === []) {
            return [null, null, null];
        }

        $encoded = json_encode($preferences, JSON_UNESCAPED_UNICODE);
        if (!is_string($encoded)) {
            throw new ApiException(500, 'Failed to encode accessibility preferences.');
        }

        [$ciphertext, $iv, $tag] = $this->crypto->encryptParams($encoded);
        if ($ciphertext === null || $iv === null || $tag === null) {
            throw new ApiException(500, 'Failed to encrypt accessibility preferences.');
        }

        return [$ciphertext, $iv, $tag];
    }

    /**
     * @param mixed $value
     * @return array<int|string, mixed>
     */
    private function normalizeAccessibilityPreferences(mixed $value): array
    {
        if ($value === null || $value === '') {
            return [];
        }

        if (!is_array($value)) {
            throw new ApiException(422, 'accessibilityPreferences must be an array or object.');
        }

        $encoded = json_encode($value, JSON_UNESCAPED_UNICODE);
        if (!is_string($encoded)) {
            throw new ApiException(422, 'accessibilityPreferences must be JSON-encodable.');
        }

        return $value;
    }

    /**
     * @param mixed $value
     */
    private function normalizeNullableDateTime(mixed $value, string $field): ?string
    {
        $string = $this->normalizer->nullableString($value);
        if ($string === null) {
            return null;
        }

        $timestamp = strtotime($string);
        if ($timestamp === false) {
            throw new ApiException(422, sprintf('%s must be a valid datetime.', $field));
        }

        return gmdate('Y-m-d H:i:s', $timestamp);
    }

    private function normalizeRequiredStoredDate(string $value, string $field): string
    {
        $normalized = $this->normalizeNullableDateTime($value, $field);
        if ($normalized === null) {
            throw new ApiException(500, sprintf('%s is missing.', $field));
        }

        return $normalized;
    }
}
