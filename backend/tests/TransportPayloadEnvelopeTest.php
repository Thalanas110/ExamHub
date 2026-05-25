<?php

declare(strict_types=1);

require_once __DIR__ . '/../bootstrap/autoload.php';

use App\Http\AesGcmPayloadEnvelope;
use App\Security\AesGcmCrypto;
use App\Support\ApiException;

$failures = [];

$crypto = new AesGcmCrypto('0123456789abcdef0123456789abcdef');
$payload = [
    'email' => 'student@example.com',
    'password' => 'secret123',
    'meta' => ['attempt' => 1],
];

$encrypted = AesGcmPayloadEnvelope::encryptJsonPayload($payload, $crypto);
foreach (['payload'] as $field) {
    if (!isset($encrypted[$field]) || !is_string($encrypted[$field]) || $encrypted[$field] === '') {
        $failures[] = sprintf('Encrypted transport payload missing required "%s" field.', $field);
    }
}

$decrypted = AesGcmPayloadEnvelope::decryptRequestBody($encrypted, $crypto);
if ($decrypted !== $payload) {
    $failures[] = 'Encrypted transport payload failed to decrypt back to the original request body.';
}

$tampered = $encrypted;
$packedPayload = base64_decode((string) ($tampered['payload'] ?? ''), true);
if (!is_string($packedPayload) || $packedPayload === '') {
    $failures[] = 'Encrypted transport payload should expose a base64 payload blob.';
} else {
    $packedPayload[0] = chr(ord($packedPayload[0]) ^ 0x01);
    $tampered['payload'] = base64_encode($packedPayload);
}

try {
    AesGcmPayloadEnvelope::decryptRequestBody($tampered, $crypto);
    $failures[] = 'Tampered encrypted transport payload should fail decryption.';
} catch (ApiException $exception) {
    if ($exception->status !== 400) {
        $failures[] = sprintf('Tampered payload should return status 400, got %d.', $exception->status);
    }
}

if ($failures !== []) {
    foreach ($failures as $failure) {
        fwrite(STDERR, "FAIL: {$failure}\n");
    }
    exit(1);
}

echo "Transport payload envelope tests passed.\n";
