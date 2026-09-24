<?php

declare(strict_types=1);

require_once __DIR__ . '/../bootstrap/autoload.php';

use App\Security\AesGcmCrypto;
use App\Security\JwtService;
use App\Shared\Support\Helpers;

$failures = [];

$crypto = new AesGcmCrypto('0123456789abcdef0123456789abcdef');
$plain = 'Sensitive text 123';
$payload = $crypto->encrypt($plain);
if (!is_array($payload)) {
    $failures[] = 'Encryption did not produce a structured AES payload.';
} else {
    foreach (['ciphertext', 'iv', 'tag'] as $requiredKey) {
        if (!isset($payload[$requiredKey]) || !is_string($payload[$requiredKey]) || $payload[$requiredKey] === '') {
            $failures[] = sprintf('Structured AES payload is missing %s.', $requiredKey);
        }
    }

    $roundTrip = $crypto->decryptFromParts(
        $payload['ciphertext'] ?? null,
        $payload['iv'] ?? null,
        $payload['tag'] ?? null,
    );
    if ($roundTrip !== $plain) {
        $failures[] = 'AES-256-GCM decrypt mismatch.';
    }

    $legacyEnvelope = $crypto->encryptLegacy($plain);
    if (!is_string($legacyEnvelope) || $legacyEnvelope === '') {
        $failures[] = 'Legacy envelope generation failed.';
    } elseif ($crypto->decryptLegacy($legacyEnvelope) !== $plain) {
        $failures[] = 'Legacy AES envelope decrypt mismatch.';
    }
}

$renderStyleBase64Key = base64_encode('0123456789abcdef0123456789abcdef');
try {
    $renderCrypto = new AesGcmCrypto($renderStyleBase64Key);
    $renderPayload = $renderCrypto->encrypt($plain);
    $renderRoundTrip = is_array($renderPayload)
        ? $renderCrypto->decryptFromParts(
            $renderPayload['ciphertext'] ?? null,
            $renderPayload['iv'] ?? null,
            $renderPayload['tag'] ?? null,
        )
        : null;

    if ($renderRoundTrip !== $plain) {
        $failures[] = 'Plain base64 APP_ENCRYPTION_KEY values should round-trip correctly.';
    }
} catch (Throwable $throwable) {
    $failures[] = 'Plain base64 APP_ENCRYPTION_KEY support failed: ' . $throwable->getMessage();
}

$jwt = new JwtService('unit-test-jwt-secret');
$token = $jwt->issue(['sub' => 'u1', 'role' => 'admin'], 60);
$payload = $jwt->verify($token);
if (!is_array($payload) || ($payload['sub'] ?? null) !== 'u1') {
    $failures[] = 'JWT verification failed for valid token.';
}

$badToken = $token . 'x';
if ($jwt->verify($badToken) !== null) {
    $failures[] = 'JWT verification accepted tampered token.';
}

if (Helpers::gradeFromPercentage(95) !== 'A+') {
    $failures[] = 'Grade helper returned unexpected value.';
}

if ($failures !== []) {
    foreach ($failures as $failure) {
        fwrite(STDERR, "FAIL: {$failure}\n");
    }
    exit(1);
}

echo "Security smoke tests passed.\n";
