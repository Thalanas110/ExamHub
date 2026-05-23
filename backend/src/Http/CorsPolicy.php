<?php

declare(strict_types=1);

namespace App\Http;

use App\Config\AppConfig;

final class CorsPolicy
{
    public static function apply(AppConfig $config): bool
    {
        header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Payload-Encryption');
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Max-Age: 86400');

        $origin = trim((string) ($_SERVER['HTTP_ORIGIN'] ?? ''));
        $allowedOrigin = self::resolveAllowedOrigin($config, $origin === '' ? null : $origin);

        if ($allowedOrigin === null) {
            if ($origin === '') {
                return true;
            }

            return false;
        }

        header('Access-Control-Allow-Origin: ' . $allowedOrigin);
        if ($allowedOrigin !== '*') {
            header('Vary: Origin');
        }

        return true;
    }

    public static function resolveAllowedOrigin(AppConfig $config, ?string $origin): ?string
    {
        if ($config->allowCorsAll) {
            return '*';
        }

        $normalizedOrigin = trim((string) $origin);
        if ($normalizedOrigin === '') {
            return null;
        }

        if (in_array($normalizedOrigin, $config->corsAllowedOrigins, true)) {
            return $normalizedOrigin;
        }

        return null;
    }
}
