<?php

declare(strict_types=1);

namespace App\Shared\Database;

use App\Shared\Config\AppConfig;
use PDO;
use Pdo\Mysql;

final class LogDbConnection
{
    private ?PDO $pdo = null;

    public function __construct(private AppConfig $config)
    {
    }

    public function pdo(): PDO
    {
        if ($this->pdo instanceof PDO) {
            return $this->pdo;
        }

        $this->pdo = MysqlPdoFactory::create(
            $this->config->logDbHost,
            $this->config->logDbPort,
            $this->config->logDbName,
            $this->config->logDbUser,
            $this->config->logDbPass,
            $this->config->logDbSslMode,
            $this->config->logDbSslCa,
            false,
        );

        return $this->pdo;
    }
}
