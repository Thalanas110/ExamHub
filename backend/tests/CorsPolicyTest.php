<?php

declare(strict_types=1);

require_once __DIR__ . '/../bootstrap/autoload.php';

use App\Shared\Config\AppConfig;
use App\Http\CorsPolicy;

/**
 * @param array<int, string> $allowedOrigins
 */
function makeConfig(bool $allowAll, array $allowedOrigins): AppConfig
{
    return new AppConfig(
        dbHost: '127.0.0.1',
        dbPort: 3306,
        dbName: 'examhub',
        dbUser: 'root',
        dbPass: '',
        logDbHost: '127.0.0.1',
        logDbPort: 3306,
        logDbName: 'examhub',
        logDbUser: 'root',
        logDbPass: '',
        logRetentionDays: 90,
        jwtSecret: 'unit-test-secret',
        encryptionKey: '0123456789abcdef0123456789abcdef',
        transportAllowPlaintextRequests: false,
        transportPlaintextBypassKey: null,
        tokenTtlSeconds: 28800,
        allowCorsAll: $allowAll,
        corsAllowedOrigins: $allowedOrigins,
        seedAdminName: 'Admin',
        seedAdminEmail: 'admin@example.com',
        seedAdminPassword: 'Admin123!',
        seedAdminDepartment: null,
        seedTeacherName: 'Teacher',
        seedTeacherEmail: 'teacher@example.com',
        seedTeacherPassword: 'Teacher123!',
        seedTeacherDepartment: null,
        seedStudentName: 'Student',
        seedStudentEmail: 'student@example.com',
        seedStudentPassword: 'Student123!',
        seedStudentDepartment: null,
    );
}

$failures = [];

$allowlisted = CorsPolicy::resolveAllowedOrigin(
    makeConfig(false, ['https://frontend.example.com']),
    'https://frontend.example.com',
);
if ($allowlisted !== 'https://frontend.example.com') {
    $failures[] = 'Allowlisted origins should resolve to their exact origin value.';
}

$blocked = CorsPolicy::resolveAllowedOrigin(
    makeConfig(false, ['https://frontend.example.com']),
    'https://blocked.example.com',
);
if ($blocked !== null) {
    $failures[] = 'Origins outside the allowlist should resolve to null.';
}

$allowAll = CorsPolicy::resolveAllowedOrigin(
    makeConfig(true, []),
    'https://anywhere.example.com',
);
if ($allowAll !== '*') {
    $failures[] = 'CORS_ALLOW_ALL=true should resolve to a wildcard origin.';
}

if ($failures !== []) {
    foreach ($failures as $failure) {
        fwrite(STDERR, "FAIL: {$failure}\n");
    }
    exit(1);
}

echo "CORS policy tests passed.\n";
