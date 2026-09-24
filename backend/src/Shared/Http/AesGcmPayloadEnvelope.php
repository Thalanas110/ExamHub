<?php

declare(strict_types=1);

namespace App\Shared\Http;

use App\Shared\Security\AesGcmCrypto;
use App\Shared\Support\ApiException;
use JsonException;
use RuntimeException;

final class AesGcmPayloadEnvelope
{
    public const HEADER_NAME = 'X-Payload-Encryption';
    public const HEADER_NAME_LOWER = 'x-payload-encryption';
    public const TRANSPORT_MARKER = 'v1';

    private const OPAQUE_FIELD = 'payload';
    private const IV_LENGTH = 12;
    private const TAG_LENGTH = 16;

    /**
     * @param array<string, mixed> $envelope
     * @return array<string, mixed>
     */
    public static function decryptRequestBody(array $envelope, AesGcmCrypto $crypto): array
    {
        $opaquePayload = self::requireEnvelopeField($envelope, self::OPAQUE_FIELD);
        $json = $crypto->decryptLegacy($opaquePayload);
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
     * @return array{payload: string}
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

        return [
            self::OPAQUE_FIELD => self::packOpaquePayload($encrypted),
        ];
    }

    public static function requireHeaderValue(?string $value): void
    {
        if (trim((string) $value) === self::TRANSPORT_MARKER) {
            return;
        }

        throw new ApiException(
            400,
            sprintf('Request payloads must include %s: %s.', self::HEADER_NAME, self::TRANSPORT_MARKER),
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

    /**
     * @param array{ciphertext: string, iv: string, tag: string} $payload
     */
    private static function packOpaquePayload(array $payload): string
    {
        $iv = base64_decode($payload['iv'], true);
        $tag = base64_decode($payload['tag'], true);
        $ciphertext = base64_decode($payload['ciphertext'], true);

        if ($iv === false || $tag === false || $ciphertext === false) {
            throw new RuntimeException('Failed to encode encrypted payload envelope.');
        }

        if (strlen($iv) !== self::IV_LENGTH || strlen($tag) !== self::TAG_LENGTH || $ciphertext === '') {
            throw new RuntimeException('Failed to encode encrypted payload envelope.');
        }

        return base64_encode($iv . $tag . $ciphertext);
    }
}
