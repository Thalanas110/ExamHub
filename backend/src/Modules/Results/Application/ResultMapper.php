<?php

declare(strict_types=1);

namespace App\Modules\Results\Application;

use App\Shared\Security\AesGcmCrypto;
use App\Shared\Support\Helpers;
use App\Shared\Support\ApiException;
use App\Services\Support\ValueNormalizer;

final class ResultMapper
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

    private function decryptField(array $row, string $ciphertextKey, string $ivKey, string $tagKey, string $legacyKey): ?string
    {
        return $this->crypto->decryptValue(
            $this->normalizer->nullableString($row[$ciphertextKey] ?? null),
            $this->normalizer->nullableString($row[$ivKey] ?? null),
            $this->normalizer->nullableString($row[$tagKey] ?? null),
            $this->normalizer->nullableString($row[$legacyKey] ?? null),
        );
    }

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
