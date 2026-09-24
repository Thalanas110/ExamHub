<?php

declare(strict_types=1);

use App\Shared\Config\AppConfig;
use App\Shared\Config\Env;
use App\Database\LogDbConnection;
use App\Database\RoutineGateway;

require_once __DIR__ . '/../bootstrap/autoload.php';

try {
    $env = new Env(__DIR__ . '/../.env');
    $config = AppConfig::fromEnv($env);
    $gateway = new RoutineGateway((new LogDbConnection($config))->pdo());
    $retentionDays = max(1, $config->logRetentionDays);

    $gateway->call('sp_log_retention_purge', [$retentionDays]);

    fwrite(
        STDOUT,
        sprintf("Log retention purge completed for records older than %d days.\n", $retentionDays),
    );
    exit(0);
} catch (Throwable $throwable) {
    fwrite(STDERR, "FAIL: " . $throwable->getMessage() . "\n");
    exit(1);
}
