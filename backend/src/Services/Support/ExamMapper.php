<?php

declare(strict_types=1);

namespace App\Services\Support;

use App\Security\AesGcmCrypto;
use App\Shared\Support\ApiException;
use App\Shared\Support\Helpers;

final class ExamMapper
{
    public function __construct(
        private AesGcmCrypto $crypto,
        private ValueNormalizer $normalizer,
    ) {
    }

    /**
     * @param array<string, mixed> $row
     * @return array<string, mixed>
     */
    public function mapUserRow(array $row): array
    {
        return [
            'id' => (string) ($row['id'] ?? ''),
            'name' => (string) ($row['name'] ?? ''),
            'email' => (string) ($row['email'] ?? ''),
            'role' => (string) ($row['role'] ?? 'student'),
            'joinedAt' => (string) ($row['joinedAt'] ?? date('Y-m-d')),
            'department' => $this->decryptField($row, 'departmentCiphertext', 'departmentIv', 'departmentTag', 'departmentEnc'),
            'phone' => $this->decryptField($row, 'phoneCiphertext', 'phoneIv', 'phoneTag', 'phoneEnc'),
            'bio' => $this->decryptField($row, 'bioCiphertext', 'bioIv', 'bioTag', 'bioEnc'),
        ];
    }

    /**
     * @param array<string, mixed> $row
     * @return array<string, mixed>
     */
    public function mapClassRow(array $row): array
    {
        $studentIds = Helpers::decodeJsonArray($row['studentIds'] ?? '[]');
        $studentIds = array_values(array_filter(
            array_map(static fn (mixed $id): string => (string) $id, $studentIds),
            static fn (string $id): bool => $id !== '',
        ));

        return [
            'id' => (string) ($row['id'] ?? ''),
            'name' => (string) ($row['name'] ?? ''),
            'subject' => (string) ($row['subject'] ?? ''),
            'teacherId' => (string) ($row['teacherId'] ?? ''),
            'studentIds' => $studentIds,
            'code' => (string) ($row['code'] ?? ''),
            'createdAt' => (string) ($row['createdAt'] ?? date('Y-m-d')),
            'description' => $this->normalizer->nullableString($row['description'] ?? null),
        ];
    }

    /**
     * @param array<string, mixed> $row
     * @return array<string, mixed>
     */
    public function mapExamRow(array $row): array
    {
        $questions = Helpers::decodeJsonArray($row['questions'] ?? '[]');
        $normalizedQuestions = [];

        foreach ($questions as $question) {
            if (!is_array($question)) {
                continue;
            }

            $entry = [
                'id' => (string) ($question['id'] ?? ''),
                'text' => (string) ($question['text'] ?? ''),
                'type' => (string) ($question['type'] ?? 'mcq'),
                'marks' => (int) ($question['marks'] ?? 0),
            ];

            $topic = trim((string) ($question['topic'] ?? ''));
            if ($topic !== '') {
                $entry['topic'] = $topic;
            }

            if (isset($question['options']) && is_array($question['options'])) {
                $entry['options'] = array_values(
                    array_map(static fn (mixed $value): string => (string) $value, $question['options']),
                );
            }

            if (array_key_exists('correctAnswer', $question)) {
                $entry['correctAnswer'] = (string) $question['correctAnswer'];
            }

            $normalizedQuestions[] = $entry;
        }

        return [
            'id' => (string) ($row['id'] ?? ''),
            'title' => (string) ($row['title'] ?? ''),
            'description' => (string) ($row['description'] ?? ''),
            'classId' => (string) ($row['classId'] ?? ''),
            'teacherId' => (string) ($row['teacherId'] ?? ''),
            'duration' => (int) ($row['duration'] ?? 0),
            'totalMarks' => (int) ($row['totalMarks'] ?? 0),
            'passingMarks' => (int) ($row['passingMarks'] ?? 0),
            'startDate' => (string) ($row['startDate'] ?? ''),
            'endDate' => (string) ($row['endDate'] ?? ''),
            'status' => (string) ($row['status'] ?? 'draft'),
            'questions' => $normalizedQuestions,
            'createdAt' => (string) ($row['createdAt'] ?? date('Y-m-d')),
        ];
    }

    /**
     * @param array<string, mixed> $row
     * @return array<string, mixed>
     */
    public function mapSubmissionRow(array $row): array
    {
        $answers = Helpers::decodeJsonArray($row['answers'] ?? '[]');
        $normalizedAnswers = [];

        foreach ($answers as $answer) {
            if (!is_array($answer)) {
                continue;
            }

            $entry = [
                'questionId' => (string) ($answer['questionId'] ?? ''),
                'answer' => $this->decryptAnswer($answer),
            ];

            if (array_key_exists('marksAwarded', $answer)) {
                $entry['marksAwarded'] = (float) $answer['marksAwarded'];
            }

            $normalizedAnswers[] = $entry;
        }

        return [
            'id' => (string) ($row['id'] ?? ''),
            'examId' => (string) ($row['examId'] ?? ''),
            'studentId' => (string) ($row['studentId'] ?? ''),
            'attemptNo' => isset($row['attemptNo']) ? (int) $row['attemptNo'] : 1,
            'answers' => $normalizedAnswers,
            'totalScore' => isset($row['totalScore']) ? (float) $row['totalScore'] : null,
            'percentage' => isset($row['percentage']) ? (float) $row['percentage'] : null,
            'grade' => isset($row['grade']) ? (string) $row['grade'] : null,
            'feedback' => $this->decryptField($row, 'feedbackCiphertext', 'feedbackIv', 'feedbackTag', 'feedbackEnc'),
            'startedAt' => isset($row['startedAt']) ? (string) $row['startedAt'] : null,
            'allowedDurationMinutes' => isset($row['allowedDurationMinutes']) ? (int) $row['allowedDurationMinutes'] : null,
            'effectiveWindowStartAt' => isset($row['effectiveWindowStartAt']) ? (string) $row['effectiveWindowStartAt'] : null,
            'effectiveWindowEndAt' => isset($row['effectiveWindowEndAt']) ? (string) $row['effectiveWindowEndAt'] : null,
            'submittedAt' => isset($row['submittedAt']) ? (string) $row['submittedAt'] : null,
            'gradedAt' => isset($row['gradedAt']) ? (string) $row['gradedAt'] : null,
            'status' => (string) ($row['status'] ?? 'submitted'),
        ];
    }

    /**
     * @param array<string, mixed> $row
     * @return array<string, mixed>
     */
    public function mapAccommodationRow(array $row): array
    {
        $preferences = [];
        $ciphertext = $this->normalizer->nullableString($row['accessibilityPreferencesCiphertext'] ?? null);
        $iv = $this->normalizer->nullableString($row['accessibilityPreferencesIv'] ?? null);
        $tag = $this->normalizer->nullableString($row['accessibilityPreferencesTag'] ?? null);

        if ($ciphertext !== null || $iv !== null || $tag !== null) {
            $decrypted = $this->crypto->decryptFromParts($ciphertext, $iv, $tag);
            if ($decrypted === null) {
                throw new ApiException(500, 'Failed to decrypt accessibility preferences.');
            }

            $decoded = json_decode($decrypted, true);
            if (!is_array($decoded)) {
                throw new ApiException(500, 'Stored accessibility preferences are invalid.');
            }

            $preferences = $decoded;
        }

        return [
            'id' => isset($row['id']) ? (int) $row['id'] : null,
            'examId' => (string) ($row['examId'] ?? ''),
            'studentId' => (string) ($row['studentId'] ?? ''),
            'extraTimeMinutes' => (int) ($row['extraTimeMinutes'] ?? 0),
            'alternateStartAt' => isset($row['alternateStartAt']) ? (string) $row['alternateStartAt'] : null,
            'alternateEndAt' => isset($row['alternateEndAt']) ? (string) $row['alternateEndAt'] : null,
            'attemptLimit' => isset($row['attemptLimit']) ? (int) $row['attemptLimit'] : null,
            'accessibilityPreferences' => $preferences,
            'createdAt' => isset($row['createdAt']) ? (string) $row['createdAt'] : null,
            'updatedAt' => isset($row['updatedAt']) ? (string) $row['updatedAt'] : null,
        ];
    }

    /**
     * @param array<string, mixed> $row
     */
    private function decryptField(
        array $row,
        string $ciphertextKey,
        string $ivKey,
        string $tagKey,
        string $legacyKey,
    ): ?string {
        return $this->crypto->decryptValue(
            $this->normalizer->nullableString($row[$ciphertextKey] ?? null),
            $this->normalizer->nullableString($row[$ivKey] ?? null),
            $this->normalizer->nullableString($row[$tagKey] ?? null),
            $this->normalizer->nullableString($row[$legacyKey] ?? null),
        );
    }

    /**
     * @param array<string, mixed> $answer
     */
    private function decryptAnswer(array $answer): string
    {
        $ciphertext = $this->normalizer->nullableString($answer['answerCiphertext'] ?? null);
        $iv = $this->normalizer->nullableString($answer['answerIv'] ?? null);
        $tag = $this->normalizer->nullableString($answer['answerTag'] ?? null);
        $legacyAnswer = array_key_exists('answer', $answer) ? (string) ($answer['answer'] ?? '') : null;

        if ($ciphertext !== null || $iv !== null || $tag !== null) {
            $resolved = $this->crypto->decryptFromParts($ciphertext, $iv, $tag);
            return $resolved ?? '[decryption_failed]';
        }

        if ($legacyAnswer === null || $legacyAnswer === '') {
            return '';
        }

        $resolved = $this->crypto->decryptLegacy($legacyAnswer);
        return $resolved ?? $legacyAnswer;
    }
}
