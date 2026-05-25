<?php

declare(strict_types=1);

namespace App\Http;

use App\Security\AesGcmCrypto;

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

        echo json_encode($output, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }
}
