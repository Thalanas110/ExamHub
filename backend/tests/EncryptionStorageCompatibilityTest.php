<?php

declare(strict_types=1);

require_once __DIR__ . '/../bootstrap/autoload.php';

use App\Shared\Security\AesGcmCrypto;
use App\Shared\Security\LegacyEncryptedDataRepair;

$failures = [];

try {
    $crypto = new AesGcmCrypto('0123456789abcdef0123456789abcdef');
    $payload = $crypto->encrypt('Sensitive value');

    if (!is_array($payload)) {
        $failures[] = 'Structured encryption should return an array payload.';
    } else {
        foreach (['ciphertext', 'iv', 'tag'] as $requiredKey) {
            if (!isset($payload[$requiredKey]) || !is_string($payload[$requiredKey]) || $payload[$requiredKey] === '') {
                $failures[] = sprintf('Structured encryption is missing %s.', $requiredKey);
            }
        }

        if ($failures === []) {
            $decrypted = $crypto->decryptFromParts(
                $payload['ciphertext'],
                $payload['iv'],
                $payload['tag'],
            );

            if ($decrypted !== 'Sensitive value') {
                $failures[] = 'Structured AES payload did not decrypt back to the original value.';
            }

            $legacyEnvelope = sprintf(
                'gcmv1:%s:%s:%s',
                $payload['iv'],
                $payload['tag'],
                $payload['ciphertext'],
            );

            if ($crypto->decryptLegacy($legacyEnvelope) !== 'Sensitive value') {
                $failures[] = 'Legacy envelope fallback did not decrypt correctly.';
            }
        }
    }
} catch (Throwable $throwable) {
    $failures[] = 'Structured AES compatibility test crashed: ' . $throwable->getMessage();
}

try {
    $crypto = new AesGcmCrypto('0123456789abcdef0123456789abcdef');
    $repair = new LegacyEncryptedDataRepair($crypto);
    $legacyDepartment = $crypto->encryptLegacy('Computer Science');
    $legacyAnswer = $crypto->encryptLegacy('Essay answer');
    $legacyFeedback = $crypto->encryptLegacy('Great work');

    $migratedUser = $repair->migrateUserRow([
        'departmentEnc' => $legacyDepartment,
        'phoneEnc' => null,
        'bioEnc' => null,
    ]);

    foreach (['departmentCiphertext', 'departmentIv', 'departmentTag'] as $requiredKey) {
        if (!isset($migratedUser[$requiredKey]) || !is_string($migratedUser[$requiredKey]) || $migratedUser[$requiredKey] === '') {
            $failures[] = sprintf('Migrated user row should contain %s.', $requiredKey);
        }
    }

    if (!array_key_exists('departmentEnc', $migratedUser) || $migratedUser['departmentEnc'] !== null) {
        $failures[] = 'Migrated user row should clear the legacy departmentEnc field.';
    }

    $migratedSubmission = $repair->migrateSubmissionRow([
        'answers' => json_encode([
            [
                'questionId' => 'q1',
                'answer' => $legacyAnswer,
            ],
        ], JSON_UNESCAPED_UNICODE),
        'feedbackEnc' => $legacyFeedback,
    ]);

    $decodedAnswers = json_decode((string) ($migratedSubmission['answers'] ?? ''), true);
    $firstAnswer = is_array($decodedAnswers) ? ($decodedAnswers[0] ?? null) : null;

    if (!is_array($firstAnswer)) {
        $failures[] = 'Migrated submission answers should remain valid JSON.';
    } else {
        foreach (['answerCiphertext', 'answerIv', 'answerTag'] as $requiredKey) {
            if (!isset($firstAnswer[$requiredKey]) || !is_string($firstAnswer[$requiredKey]) || $firstAnswer[$requiredKey] === '') {
                $failures[] = sprintf('Migrated answer should contain %s.', $requiredKey);
            }
        }

        if (array_key_exists('answer', $firstAnswer)) {
            $failures[] = 'Migrated answer should remove the legacy answer envelope key.';
        }
    }

    foreach (['feedbackCiphertext', 'feedbackIv', 'feedbackTag'] as $requiredKey) {
        if (!isset($migratedSubmission[$requiredKey]) || !is_string($migratedSubmission[$requiredKey]) || $migratedSubmission[$requiredKey] === '') {
            $failures[] = sprintf('Migrated submission should contain %s.', $requiredKey);
        }
    }

    if (!array_key_exists('feedbackEnc', $migratedSubmission) || $migratedSubmission['feedbackEnc'] !== null) {
        $failures[] = 'Migrated submission should clear the legacy feedbackEnc field.';
    }
} catch (Throwable $throwable) {
    $failures[] = 'Legacy repair compatibility test crashed: ' . $throwable->getMessage();
}

if ($failures !== []) {
    foreach ($failures as $failure) {
        fwrite(STDERR, "FAIL: {$failure}\n");
    }
    exit(1);
}

echo "Encryption storage compatibility tests passed.\n";
