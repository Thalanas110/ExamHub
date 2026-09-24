<?php

declare(strict_types=1);

namespace App\Services\Support;

use App\Shared\Security\AesGcmCrypto;
use App\Shared\Support\Helpers;

final class LegacyEncryptedDataRepair
{
    public function __construct(private AesGcmCrypto $crypto)
    {
    }

    /**
     * @param array<string, mixed> $row
     * @return array<string, mixed>
     */
    public function migrateUserRow(array $row): array
    {
        $migrated = $row;

        $this->migrateField($migrated, 'departmentEnc', 'departmentCiphertext', 'departmentIv', 'departmentTag');
        $this->migrateField($migrated, 'phoneEnc', 'phoneCiphertext', 'phoneIv', 'phoneTag');
        $this->migrateField($migrated, 'bioEnc', 'bioCiphertext', 'bioIv', 'bioTag');

        return $migrated;
    }

    /**
     * @param array<string, mixed> $row
     * @return array<string, mixed>
     */
    public function migrateSubmissionRow(array $row): array
    {
        $migrated = $row;
        $this->migrateField($migrated, 'feedbackEnc', 'feedbackCiphertext', 'feedbackIv', 'feedbackTag');

        $answers = Helpers::decodeJsonArray($row['answers'] ?? '[]');
        $migrated['answers'] = json_encode(
            $this->migrateAnswerEntries($answers),
            JSON_UNESCAPED_UNICODE,
        );

        return $migrated;
    }

    /**
     * @param array<int, mixed> $answers
     * @return array<int, array<string, mixed>>
     */
    public function migrateAnswerEntries(array $answers): array
    {
        $migrated = [];

        foreach ($answers as $answer) {
            if (!is_array($answer)) {
                continue;
            }

            $entry = $answer;
            $hasStructuredPayload =
                isset($entry['answerCiphertext'], $entry['answerIv'], $entry['answerTag']) &&
                is_string($entry['answerCiphertext']) &&
                is_string($entry['answerIv']) &&
                is_string($entry['answerTag']) &&
                $entry['answerCiphertext'] !== '' &&
                $entry['answerIv'] !== '' &&
                $entry['answerTag'] !== '';

            if ($hasStructuredPayload) {
                unset($entry['answer']);
                $migrated[] = $entry;
                continue;
            }

            $legacyAnswer = isset($entry['answer']) ? (string) $entry['answer'] : '';
            $payload = $this->crypto->splitLegacy($legacyAnswer);
            if ($payload !== null) {
                $entry['answerCiphertext'] = $payload['ciphertext'];
                $entry['answerIv'] = $payload['iv'];
                $entry['answerTag'] = $payload['tag'];
                unset($entry['answer']);
                $migrated[] = $entry;
                continue;
            }

            if ($legacyAnswer === '') {
                $entry['answerCiphertext'] = null;
                $entry['answerIv'] = null;
                $entry['answerTag'] = null;
                unset($entry['answer']);
            }

            $migrated[] = $entry;
        }

        return $migrated;
    }

    /**
     * @param array<string, mixed> $row
     */
    private function migrateField(
        array &$row,
        string $legacyKey,
        string $ciphertextKey,
        string $ivKey,
        string $tagKey,
    ): void {
        $hasStructuredPayload =
            isset($row[$ciphertextKey], $row[$ivKey], $row[$tagKey]) &&
            is_string($row[$ciphertextKey]) &&
            is_string($row[$ivKey]) &&
            is_string($row[$tagKey]) &&
            $row[$ciphertextKey] !== '' &&
            $row[$ivKey] !== '' &&
            $row[$tagKey] !== '';

        if ($hasStructuredPayload) {
            $row[$legacyKey] = null;
            return;
        }

        $legacyValue = isset($row[$legacyKey]) ? trim((string) $row[$legacyKey]) : '';
        $payload = $this->crypto->splitLegacy($legacyValue);
        if ($payload === null) {
            return;
        }

        $row[$ciphertextKey] = $payload['ciphertext'];
        $row[$ivKey] = $payload['iv'];
        $row[$tagKey] = $payload['tag'];
        $row[$legacyKey] = null;
    }
}
