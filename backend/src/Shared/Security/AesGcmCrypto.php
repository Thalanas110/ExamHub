<?php

declare(strict_types=1);

namespace App\Shared\Security;

use RuntimeException;

final class AesGcmCrypto
{
    private const CIPHER = 'aes-256-gcm';
    private const IV_LENGTH = 12;
    private const TAG_LENGTH = 16;
    private const ENVELOPE_PREFIX = 'gcmv1';

    private string $key;

    public function __construct(string $rawKey)
    {
        $this->key = $this->normalizeKey($rawKey);
    }

    /**
     * @return array{ciphertext: string, iv: string, tag: string}|null
     */
    public function encrypt(?string $plainText): ?array
    {
        if ($plainText === null || $plainText === '') {
            return null;
        }

        $iv = random_bytes(self::IV_LENGTH);
        $tag = '';
        $cipherText = openssl_encrypt(
            $plainText,
            self::CIPHER,
            $this->key,
            OPENSSL_RAW_DATA,
            $iv,
            $tag,
        );

        if ($cipherText === false || strlen($tag) !== self::TAG_LENGTH) {
            return null;
        }

        return [
            'ciphertext' => base64_encode($cipherText),
            'iv' => base64_encode($iv),
            'tag' => base64_encode($tag),
        ];
    }

    public function encryptLegacy(?string $plainText): ?string
    {
        $payload = $this->encrypt($plainText);
        return $payload === null ? null : $this->legacyEnvelope($payload);
    }

    /**
     * @return array{0: ?string, 1: ?string, 2: ?string}
     */
    public function encryptParams(?string $plainText): array
    {
        $payload = $this->encrypt($plainText);

        return [
            $payload['ciphertext'] ?? null,
            $payload['iv'] ?? null,
            $payload['tag'] ?? null,
        ];
    }

    public function decryptFromParts(?string $ciphertext, ?string $iv, ?string $tag): ?string
    {
        if ($ciphertext === null && $iv === null && $tag === null) {
            return null;
        }

        if ($ciphertext === null || $iv === null || $tag === null) {
            return null;
        }

        $decodedIv = base64_decode($iv, true);
        $decodedTag = base64_decode($tag, true);
        $decodedCiphertext = base64_decode($ciphertext, true);
        if ($decodedIv === false || $decodedTag === false || $decodedCiphertext === false) {
            return null;
        }

        if (strlen($decodedIv) !== self::IV_LENGTH || strlen($decodedTag) !== self::TAG_LENGTH) {
            return null;
        }

        $plainText = openssl_decrypt(
            $decodedCiphertext,
            self::CIPHER,
            $this->key,
            OPENSSL_RAW_DATA,
            $decodedIv,
            $decodedTag,
        );

        return $plainText === false ? null : $plainText;
    }

    public function decryptLegacy(?string $encoded): ?string
    {
        $payload = $this->splitLegacy($encoded);
        if ($payload === null) {
            return null;
        }

        return $this->decryptFromParts(
            $payload['ciphertext'],
            $payload['iv'],
            $payload['tag'],
        );
    }

    public function decryptValue(
        ?string $ciphertext,
        ?string $iv,
        ?string $tag,
        ?string $legacyEncoded = null,
    ): ?string {
        $structuredValue = $this->decryptFromParts($ciphertext, $iv, $tag);
        if ($structuredValue !== null) {
            return $structuredValue;
        }

        if ($ciphertext !== null || $iv !== null || $tag !== null) {
            return null;
        }

        return $this->decryptLegacy($legacyEncoded);
    }

    /**
     * @return array{ciphertext: string, iv: string, tag: string}|null
     */
    public function splitLegacy(?string $encoded): ?array
    {
        if ($encoded === null || $encoded === '') {
            return null;
        }

        if (str_starts_with($encoded, self::ENVELOPE_PREFIX . ':')) {
            return $this->splitEnvelope($encoded);
        }

        return $this->splitLegacyBinaryEnvelope($encoded);
    }

    /**
     * @param array{ciphertext: string, iv: string, tag: string} $payload
     */
    private function legacyEnvelope(array $payload): string
    {
        return implode(':', [
            self::ENVELOPE_PREFIX,
            $payload['iv'],
            $payload['tag'],
            $payload['ciphertext'],
        ]);
    }

    /**
     * @return array{ciphertext: string, iv: string, tag: string}|null
     */
    private function splitEnvelope(string $encoded): ?array
    {
        $parts = explode(':', $encoded, 4);
        if (count($parts) !== 4 || $parts[0] !== self::ENVELOPE_PREFIX) {
            return null;
        }

        $iv = base64_decode($parts[1], true);
        $tag = base64_decode($parts[2], true);
        $cipherText = base64_decode($parts[3], true);
        if ($iv === false || $tag === false || $cipherText === false) {
            return null;
        }

        if (strlen($iv) !== self::IV_LENGTH || strlen($tag) !== self::TAG_LENGTH) {
            return null;
        }

        return [
            'ciphertext' => $parts[3],
            'iv' => $parts[1],
            'tag' => $parts[2],
        ];
    }

    /**
     * @return array{ciphertext: string, iv: string, tag: string}|null
     */
    private function splitLegacyBinaryEnvelope(string $encoded): ?array
    {
        $binary = base64_decode($encoded, true);
        if ($binary === false || strlen($binary) < (self::IV_LENGTH + self::TAG_LENGTH)) {
            return null;
        }

        $iv = substr($binary, 0, self::IV_LENGTH);
        $tag = substr($binary, self::IV_LENGTH, self::TAG_LENGTH);
        $cipherText = substr($binary, self::IV_LENGTH + self::TAG_LENGTH);

        return [
            'ciphertext' => base64_encode($cipherText),
            'iv' => base64_encode($iv),
            'tag' => base64_encode($tag),
        ];
    }

    private function normalizeKey(string $rawKey): string
    {
        $candidate = trim($rawKey);
        if (str_starts_with($candidate, 'base64:')) {
            $decoded = base64_decode(substr($candidate, 7), true);
            if ($decoded === false) {
                throw new RuntimeException('APP_ENCRYPTION_KEY base64 value is invalid.');
            }

            $candidate = $decoded;
        } elseif (preg_match('/^[0-9a-fA-F]{64}$/', $candidate) === 1) {
            $decoded = hex2bin($candidate);
            if ($decoded === false) {
                throw new RuntimeException('APP_ENCRYPTION_KEY hex value is invalid.');
            }

            $candidate = $decoded;
        } elseif (preg_match('/^[A-Za-z0-9+\/]+=*$/', $candidate) === 1) {
            $decoded = base64_decode($candidate, true);
            if ($decoded !== false && strlen($decoded) === 32) {
                $candidate = $decoded;
            }
        }

        if (strlen($candidate) === 32) {
            return $candidate;
        }

        throw new RuntimeException(
            'APP_ENCRYPTION_KEY must resolve to exactly 32 bytes (raw, base64, base64:, or 64-char hex).'
        );
    }
}
