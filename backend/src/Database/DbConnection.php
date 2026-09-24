<?php

declare(strict_types=1);

namespace App\Database;

use App\Shared\Config\AppConfig;
use PDO;

final class DbConnection
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
            $this->config->dbHost,
            $this->config->dbPort,
            $this->config->dbName,
            $this->config->dbUser,
            $this->config->dbPass,
            $this->config->dbSslMode,
            $this->config->dbSslCa,
        );

        return $this->pdo;
    }
}
