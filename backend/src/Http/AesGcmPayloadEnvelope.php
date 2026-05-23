<?php

declare(strict_types=1);

namespace App\Http;

use App\Security\AesGcmCrypto;
use App\Support\ApiException;
use JsonException;
use RuntimeException;

final class AesGcmPayloadEnvelope
{
    public const HEADER_NAME = 'X-Payload-Encryption';
    public const HEADER_NAME_LOWER = 'x-payload-encryption';
    public const ALGORITHM = 'aes-256-gcm';

    /**
     * @param array<string, mixed> $envelope
     * @return array<string, mixed>
     */
    public static function decryptRequestBody(array $envelope, AesGcmCrypto $crypto): array
    {
        $ciphertext = self::requireEnvelopeField($envelope, 'ciphertext');
        $iv = self::requireEnvelopeField($envelope, 'iv');
        $tag = self::requireEnvelopeField($envelope, 'tag');

        $json = $crypto->decryptFromParts($ciphertext, $iv, $tag);
        if ($json === null) {
            throw new ApiException(400, 'Encrypted request payload could not be decrypted.');
        }

        try {
            $decoded = json_decode($json, true, 512, JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            throw new ApiException(400, 'Encrypted request payload did not contain valid JSON.');
        }

        if (!is_array($decoded)) {
            throw new ApiException(400, 'Encrypted request payload must decode to a JSON object.');
        }

        return $decoded;
    }

    /**
     * @param array<string, mixed>|array<int, mixed> $payload
     * @return array{ciphertext: string, iv: string, tag: string}
     */
    public static function encryptJsonPayload(array $payload, AesGcmCrypto $crypto): array
    {
        $json = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if (!is_string($json)) {
            throw new RuntimeException('Failed to encode payload for AES-GCM transport encryption.');
        }

        $encrypted = $crypto->encrypt($json);
        if ($encrypted === null) {
            throw new RuntimeException('Failed to AES-GCM encrypt transport payload.');
        }

        return $encrypted;
    }

    public static function requireHeaderValue(?string $value): void
    {
        if (strtolower(trim((string) $value)) === self::ALGORITHM) {
            return;
        }

        throw new ApiException(
            400,
            sprintf('Request payloads must include %s: %s.', self::HEADER_NAME, self::ALGORITHM),
        );
    }

    /**
     * @param array<string, mixed> $envelope
     */
    private static function requireEnvelopeField(array $envelope, string $field): string
    {
        $value = $envelope[$field] ?? null;
        if (is_string($value) && trim($value) !== '') {
            return $value;
        }

        throw new ApiException(
            400,
            sprintf('Encrypted request payload is missing required field "%s".', $field),
        );
    }
}
