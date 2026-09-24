<?php

declare(strict_types=1);

use App\Shared\Config\AppConfig;
use App\Shared\Config\Env;
use App\Shared\Database\DbConnection;
use App\Shared\Database\RoutineGateway;
use App\Shared\Security\AesGcmCrypto;
use App\Services\EncryptionRepairService;
use App\Services\Support\LegacyEncryptedDataRepair;

require_once __DIR__ . '/../bootstrap/autoload.php';

try {
    $env = new Env(__DIR__ . '/../.env');
    $config = AppConfig::fromEnv($env);
    $gateway = new RoutineGateway((new DbConnection($config))->pdo());
    $crypto = new AesGcmCrypto($config->encryptionKey);
    $service = new EncryptionRepairService(
        $gateway,
        new LegacyEncryptedDataRepair($crypto),
    );

    $summary = $service->repairLegacyRecords();

    fwrite(STDOUT, "Legacy encrypted records repaired.\n");
    fwrite(STDOUT, sprintf("Users repaired: %d\n", $summary['usersRepaired'] ?? 0));
    fwrite(STDOUT, sprintf("Submissions repaired: %d\n", $summary['submissionsRepaired'] ?? 0));
    exit(0);
} catch (Throwable $throwable) {
    fwrite(STDERR, "FAIL: " . $throwable->getMessage() . "\n");
    exit(1);
}
