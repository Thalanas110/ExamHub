<?php

declare(strict_types=1);

require_once __DIR__ . '/../bootstrap/autoload.php';

use App\Shared\Database\MysqlPdoFactory;

$failures = [];
$caPath = tempnam(sys_get_temp_dir(), 'aiven-ca-');
if ($caPath === false || file_put_contents($caPath, "test-ca\n") === false) {
    fwrite(STDERR, "FAIL: Could not create temporary CA file.\n");
    exit(1);
}

$dsn = MysqlPdoFactory::dsn(
    'mysql-example.aivencloud.com',
    12691,
    'defaultdb',
    'verify-ca',
    $caPath,
);

if (!str_contains($dsn, 'sslmode=verify-ca')) {
    $failures[] = 'Aiven DSN should include sslmode=verify-ca when TLS verification is enabled.';
}

if (!str_contains($dsn, 'sslrootcert=' . $caPath)) {
    $failures[] = 'Aiven DSN should include the configured CA certificate path.';
}

try {
    MysqlPdoFactory::create(
        'mysql-example.aivencloud.com',
        12691,
        'defaultdb',
        'avnadmin',
        'password',
        'verify-ca',
    );
    $failures[] = 'verify-ca mode should fail before connecting when no CA path is configured.';
} catch (RuntimeException) {
}

@unlink($caPath);

if ($failures !== []) {
    foreach ($failures as $failure) {
        fwrite(STDERR, "FAIL: {$failure}\n");
    }
    exit(1);
}

echo "MySQL PDO factory tests passed.\n";
