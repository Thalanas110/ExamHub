<?php

declare(strict_types=1);

namespace App\Shared\Security;

use JsonException;

final class JwtService
{
    public function __construct(private string $secret)
    {
    }

    /**
     * @param array<string, mixed> $claims
     */
    public function issue(array $claims, int $ttlSeconds): string
    {
        $now = time();
        $payload = array_merge($claims, [
            'iat' => $now,
            'exp' => $now + $ttlSeconds,
        ]);

        try {
            $header = $this->base64UrlEncode(json_encode(['alg' => 'HS256', 'typ' => 'JWT'], JSON_THROW_ON_ERROR));
            $body = $this->base64UrlEncode(json_encode($payload, JSON_THROW_ON_ERROR));
        } catch (JsonException) {
            return '';
        }

        $signature = hash_hmac('sha256', $header . '.' . $body, $this->secret, true);
        return $header . '.' . $body . '.' . $this->base64UrlEncode($signature);
    }

    /**
     * @return array<string, mixed>|null
     */
    public function verify(string $token): ?array
    {
        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            return null;
        }

        [$header, $body, $signature] = $parts;
        $expectedSig = $this->base64UrlEncode(hash_hmac('sha256', $header . '.' . $body, $this->secret, true));

        if (!hash_equals($expectedSig, $signature)) {
            return null;
        }

        $decodedPayload = $this->base64UrlDecode($body);
        if ($decodedPayload === null) {
            return null;
        }

        try {
            $payload = json_decode($decodedPayload, true, 512, JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            return null;
        }

        if (!is_array($payload)) {
            return null;
        }

        if (isset($payload['exp']) && (int) $payload['exp'] < time()) {
            return null;
        }

        return $payload;
    }

    private function base64UrlEncode(string $binary): string
    {
        return rtrim(strtr(base64_encode($binary), '+/', '-_'), '=');
    }

    private function base64UrlDecode(string $encoded): ?string
    {
        $remainder = strlen($encoded) % 4;
        if ($remainder > 0) {
            $encoded .= str_repeat('=', 4 - $remainder);
        }

        $decoded = base64_decode(strtr($encoded, '-_', '+/'), true);
        return $decoded === false ? null : $decoded;
    }
}
