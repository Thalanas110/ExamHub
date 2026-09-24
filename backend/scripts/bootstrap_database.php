<?php

declare(strict_types=1);

use App\Shared\Config\AppConfig;
use App\Shared\Config\Env;
use App\Shared\Database\DbConnection;
use App\Shared\Database\MysqlPdoFactory;
use App\Shared\Database\RoutineGateway;
use App\Shared\Database\SqlScriptRunner;
use App\Shared\Security\AesGcmCrypto;
use App\Shared\Security\EncryptionRepairService;
use App\Shared\Security\LegacyEncryptedDataRepair;

require_once __DIR__ . '/../bootstrap/autoload.php';

/**
 * Connect to an already-provisioned database and apply the repo SQL files
 * without assuming hardcoded local database names.
 */
function bootstrapPdo(
    string $host,
    int $port,
    string $database,
    string $user,
    string $password,
    string $sslMode = '',
    ?string $sslCa = null,
): PDO
{
    return MysqlPdoFactory::create(
        $host,
        $port,
        $database,
        $user,
        $password,
        $sslMode,
        $sslCa,
    );
}

/**
 * @return array<int, string>
 */
function discoverSqlPaths(string $databaseDir, string $pattern): array
{
    $paths = glob($databaseDir . '/' . $pattern);
    if (!is_array($paths)) {
        return [];
    }

    sort($paths, SORT_STRING);
    return $paths;
}

try {
    $env = new Env(__DIR__ . '/../.env');
    $config = AppConfig::fromEnv($env);
    $databaseDir = __DIR__ . '/../database';
    $primarySqlPaths = discoverSqlPaths($databaseDir, 'app_*.sql');
    $logSqlPaths = discoverSqlPaths($databaseDir, 'logs_*.sql');

    if ($primarySqlPaths === [] || $logSqlPaths === []) {
        throw new RuntimeException('One or more ordered SQL file groups could not be discovered.');
    }

    $primaryRunner = new SqlScriptRunner(
        bootstrapPdo(
            $config->dbHost,
            $config->dbPort,
            $config->dbName,
            $config->dbUser,
            $config->dbPass,
            $config->dbSslMode,
            $config->dbSslCa,
        ),
    );

    $primaryStatements = 0;
    foreach ($primarySqlPaths as $sqlPath) {
        $sql = file_get_contents($sqlPath);
        if ($sql === false) {
            throw new RuntimeException(sprintf('SQL file could not be read: %s', basename($sqlPath)));
        }

        $primaryStatements += $primaryRunner->runScript(
            SqlScriptRunner::retargetDatabase($sql, 'examhub', $config->dbName),
        );
    }

    $logRunner = new SqlScriptRunner(
        bootstrapPdo(
            $config->logDbHost,
            $config->logDbPort,
            $config->logDbName,
            $config->logDbUser,
            $config->logDbPass,
            $config->logDbSslMode,
            $config->logDbSslCa,
        ),
    );

    $logStatements = 0;
    foreach ($logSqlPaths as $sqlPath) {
        $sql = file_get_contents($sqlPath);
        if ($sql === false) {
            throw new RuntimeException(sprintf('SQL file could not be read: %s', basename($sqlPath)));
        }

        $retargetedSql = SqlScriptRunner::retargetDatabase($sql, 'examhub_logs', $config->logDbName);
        $retargetedSql = SqlScriptRunner::retargetDatabase($retargetedSql, 'examhub', $config->dbName);

        $logStatements += $logRunner->runScript($retargetedSql);
    }

    $gateway = new RoutineGateway((new DbConnection($config))->pdo());
    $crypto = new AesGcmCrypto($config->encryptionKey);
    $repairService = new EncryptionRepairService(
        $gateway,
        new LegacyEncryptedDataRepair($crypto),
    );
    $repairSummary = $repairService->repairLegacyRecords();

    fwrite(STDOUT, "Database bootstrap completed.\n");
    fwrite(STDOUT, sprintf("Primary statements applied: %d\n", $primaryStatements));
    fwrite(STDOUT, sprintf("Logging statements applied: %d\n", $logStatements));
    fwrite(STDOUT, sprintf("Users repaired: %d\n", $repairSummary['usersRepaired'] ?? 0));
    fwrite(STDOUT, sprintf("Submissions repaired: %d\n", $repairSummary['submissionsRepaired'] ?? 0));
    exit(0);
} catch (Throwable $throwable) {
    fwrite(STDERR, "FAIL: " . $throwable->getMessage() . "\n");
    exit(1);
}
