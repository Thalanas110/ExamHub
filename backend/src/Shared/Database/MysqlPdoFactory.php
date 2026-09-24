<?php

declare(strict_types=1);

namespace App\Shared\Database;

use PDO;
use Pdo\Mysql;
use RuntimeException;

final class MysqlPdoFactory
{
    public static function create(
        string $host,
        int $port,
        string $database,
        string $user,
        string $password,
        string $sslMode = '',
        ?string $sslCa = null,
        bool $useBufferedQueries = true,
    ): PDO {
        $normalizedSslMode = self::normalizeSslMode($sslMode);
        $normalizedSslCa = self::normalizeSslCa($sslCa);

        return new PDO(
            self::dsn($host, $port, $database, $normalizedSslMode, $normalizedSslCa),
            $user,
            $password,
            self::options($normalizedSslMode, $normalizedSslCa, $useBufferedQueries),
        );
    }

    public static function dsn(
        string $host,
        int $port,
        string $database,
        string $sslMode = '',
        ?string $sslCa = null,
    ): string {
        $dsn = sprintf(
            'mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4',
            $host,
            $port,
            $database,
        );

        if ($sslMode !== '') {
            $dsn .= ';sslmode=' . $sslMode;
        }

        if ($sslCa !== null) {
            $dsn .= ';sslrootcert=' . $sslCa;
        }

        return $dsn;
    }

    /**
     * @return array<int, mixed>
     */
    private static function options(string $sslMode, ?string $sslCa, bool $useBufferedQueries): array
    {
        $options = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ];

        if ($useBufferedQueries) {
            $options[Mysql::ATTR_USE_BUFFERED_QUERY] = true;
        }

        if ($sslCa !== null) {
            $options[Mysql::ATTR_SSL_CA] = $sslCa;
        }

        if (in_array($sslMode, ['verify-ca', 'verify-full'], true)) {
            if ($sslCa === null) {
                throw new RuntimeException('MySQL SSL CA file is required when DB_SSL_MODE is verify-ca or verify-full.');
            }

            $options[Mysql::ATTR_SSL_VERIFY_SERVER_CERT] = true;
        }

        return $options;
    }

    private static function normalizeSslMode(string $sslMode): string
    {
        $normalized = strtolower(str_replace('_', '-', trim($sslMode)));
        if ($normalized === 'disabled') {
            return '';
        }

        return $normalized;
    }

    private static function normalizeSslCa(?string $sslCa): ?string
    {
        if ($sslCa === null) {
            return null;
        }

        $normalized = trim($sslCa);
        if ($normalized === '') {
            return null;
        }

        if (!is_readable($normalized)) {
            throw new RuntimeException(sprintf('MySQL SSL CA file is not readable: %s', $normalized));
        }

        return $normalized;
    }
}
