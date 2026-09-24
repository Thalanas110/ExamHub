<?php

declare(strict_types=1);

namespace App\Shared\Config;

final class AppConfig
{
    public function __construct(
        public string $dbHost,
        public int $dbPort,
        public string $dbName,
        public string $dbUser,
        public string $dbPass,
        public string $logDbHost,
        public int $logDbPort,
        public string $logDbName,
        public string $logDbUser,
        public string $logDbPass,
        public int $logRetentionDays,
        public string $jwtSecret,
        public string $encryptionKey,
        public bool $transportAllowPlaintextRequests,
        public ?string $transportPlaintextBypassKey,
        public int $tokenTtlSeconds,
        public bool $allowCorsAll,
        public array $corsAllowedOrigins,
        public string $seedAdminName,
        public string $seedAdminEmail,
        public string $seedAdminPassword,
        public ?string $seedAdminDepartment,
        public string $seedTeacherName,
        public string $seedTeacherEmail,
        public string $seedTeacherPassword,
        public ?string $seedTeacherDepartment,
        public string $seedStudentName,
        public string $seedStudentEmail,
        public string $seedStudentPassword,
        public ?string $seedStudentDepartment,
        public int $sessionIdleTtlSeconds = 1200,
        public string $dbSslMode = '',
        public ?string $dbSslCa = null,
        public string $logDbSslMode = '',
        public ?string $logDbSslCa = null,
    ) {
    }

    public static function fromEnv(Env $env): self
    {
        return new self(
            dbHost: $env->require('DB_HOST'),
            dbPort: $env->getInt('DB_PORT', 3306),
            dbName: $env->require('DB_NAME'),
            dbUser: $env->require('DB_USER'),
            dbPass: $env->get('DB_PASS', ''),
            logDbHost: $env->get('LOG_DB_HOST', $env->require('DB_HOST')),
            logDbPort: $env->getInt('LOG_DB_PORT', $env->getInt('DB_PORT', 3306)),
            logDbName: $env->get('LOG_DB_NAME', $env->require('DB_NAME') . '_logs'),
            logDbUser: $env->get('LOG_DB_USER', $env->require('DB_USER')),
            logDbPass: $env->get('LOG_DB_PASS', $env->get('DB_PASS', '')),
            logRetentionDays: $env->getInt('LOG_RETENTION_DAYS', 90),
            jwtSecret: $env->require('APP_JWT_SECRET'),
            encryptionKey: $env->require('APP_ENCRYPTION_KEY'),
            transportAllowPlaintextRequests: $env->getBool('TRANSPORT_ALLOW_PLAINTEXT_REQUESTS', false),
            transportPlaintextBypassKey: self::nullableEnv($env->get('TRANSPORT_PLAINTEXT_BYPASS_KEY', '')),
            tokenTtlSeconds: $env->getInt('AUTH_TOKEN_TTL_SECONDS', 28800),
            allowCorsAll: $env->getBool('CORS_ALLOW_ALL', true),
            corsAllowedOrigins: self::csvEnv($env->get('CORS_ALLOWED_ORIGINS', '')),
            seedAdminName: $env->get('SEED_ADMIN_NAME', 'System Administrator'),
            seedAdminEmail: $env->get('SEED_ADMIN_EMAIL', ''),
            seedAdminPassword: $env->get('SEED_ADMIN_PASSWORD', ''),
            seedAdminDepartment: self::nullableEnv($env->get('SEED_ADMIN_DEPARTMENT', '')),
            seedTeacherName: $env->get('SEED_TEACHER_NAME', 'Seed Teacher'),
            seedTeacherEmail: $env->get('SEED_TEACHER_EMAIL', ''),
            seedTeacherPassword: $env->get('SEED_TEACHER_PASSWORD', ''),
            seedTeacherDepartment: self::nullableEnv($env->get('SEED_TEACHER_DEPARTMENT', '')),
            seedStudentName: $env->get('SEED_STUDENT_NAME', 'Seed Student'),
            seedStudentEmail: $env->get('SEED_STUDENT_EMAIL', ''),
            seedStudentPassword: $env->get('SEED_STUDENT_PASSWORD', ''),
            seedStudentDepartment: self::nullableEnv($env->get('SEED_STUDENT_DEPARTMENT', '')),
            sessionIdleTtlSeconds: max(1, $env->getInt('AUTH_SESSION_IDLE_TTL_SECONDS', 1200)),
            dbSslMode: $env->get('DB_SSL_MODE', ''),
            dbSslCa: self::nullableEnv($env->get('DB_SSL_CA', '')),
            logDbSslMode: $env->get('LOG_DB_SSL_MODE', $env->get('DB_SSL_MODE', '')),
            logDbSslCa: self::nullableEnv($env->get('LOG_DB_SSL_CA', $env->get('DB_SSL_CA', ''))),
        );
    }

    private static function nullableEnv(string $value): ?string
    {
        $trimmed = trim($value);
        return $trimmed === '' ? null : $trimmed;
    }

    /**
     * @return array<int, string>
     */
    private static function csvEnv(string $value): array
    {
        if (trim($value) === '') {
            return [];
        }

        $items = array_map(
            static fn (string $item): string => trim($item),
            explode(',', $value),
        );

        return array_values(
            array_filter(
                $items,
                static fn (string $item): bool => $item !== '',
            ),
        );
    }
}
