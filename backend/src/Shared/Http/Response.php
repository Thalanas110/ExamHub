<?php

declare(strict_types=1);

namespace App\Shared\Http;

use App\Shared\Security\AesGcmCrypto;

final class Response
{
    /**
     * @param array<string, mixed>|array<int, mixed> $payload
     */
    public static function json(array $payload, int $statusCode = 200, ?AesGcmCrypto $transportCrypto = null): void
    {
        http_response_code($statusCode);
        header('Content-Type: application/json; charset=utf-8');

        $output = $payload;
        if ($transportCrypto !== null) {
            header(AesGcmPayloadEnvelope::HEADER_NAME . ': ' . AesGcmPayloadEnvelope::TRANSPORT_MARKER);
            $output = AesGcmPayloadEnvelope::encryptJsonPayload($payload, $transportCrypto);
        }

        if ($transportCrypto === null && self::isLargeCollectionPayload($output)) {
            self::streamLargeCollectionPayload($output);
            return;
        }

        echo json_encode($output, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }

    /**
     * @param array<string, mixed>|array<int, mixed> $payload
     */
    private static function isLargeCollectionPayload(array $payload): bool
    {
        foreach (['users', 'exams', 'classes', 'submissions'] as $key) {
            if (!array_key_exists($key, $payload) || !is_array($payload[$key])) {
                return false;
            }
        }

        return true;
    }

    /**
     * Keep the aggregate read response compatible while avoiding a second
     * full-size JSON string allocation under PHP's memory limit.
     *
     * @param array<string, mixed>|array<int, mixed> $payload
     */
    private static function streamLargeCollectionPayload(array $payload): void
    {
        $firstProperty = true;
        echo '{';

        foreach ($payload as $key => $value) {
            if (!$firstProperty) {
                echo ',';
            }
            $firstProperty = false;

            echo self::encodeFragment((string) $key), ':';
            if (!is_array($value) || !array_is_list($value)) {
                echo self::encodeFragment($value);
                continue;
            }

            echo '[';
            $firstItem = true;
            foreach ($value as $item) {
                if (!$firstItem) {
                    echo ',';
                }
                $firstItem = false;
                echo self::encodeFragment($item);
            }
            echo ']';
        }

        echo '}';
    }

    private static function encodeFragment(mixed $value): string
    {
        $encoded = json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        return is_string($encoded) ? $encoded : 'null';
    }
}
