<?php

declare(strict_types=1);

namespace App\Shared\Database;

use PDO;
use Pdo\Mysql;
use RuntimeException;

final class SqlScriptRunner
{
    public function __construct(private PDO $pdo)
    {
    }

    public function runFile(string $filePath): int
    {
        $sql = file_get_contents($filePath);
        if ($sql === false) {
            throw new RuntimeException(sprintf('Unable to read SQL file: %s', $filePath));
        }

        return $this->runScript($sql);
    }

    public function runScript(string $sql): int
    {
        $executed = 0;
        $sql = self::stripUtf8Bom($sql);

        foreach (self::splitStatements($sql) as $statement) {
            $trimmed = trim($statement);
            if ($trimmed === '') {
                continue;
            }

            $this->pdo->exec($trimmed);
            $executed++;
        }

        return $executed;
    }

    /**
     * @return array<int, string>
     */
    public static function splitStatements(string $sql): array
    {
        $delimiter = ';';
        $buffer = '';
        $statements = [];
        $lines = preg_split("/\r\n|\n|\r/", $sql);
        if (!is_array($lines)) {
            return [];
        }

        foreach ($lines as $line) {
            $trimmed = trim($line);

            if ($trimmed === '' && trim($buffer) === '') {
                continue;
            }

            if (trim($buffer) === '' && preg_match('/^DELIMITER\s+(\S+)$/i', $trimmed, $matches) === 1) {
                $delimiter = $matches[1];
                $buffer = '';
                continue;
            }

            $buffer .= $line . "\n";
            if (!self::bufferEndsWithDelimiter($buffer, $delimiter)) {
                continue;
            }

            $statement = trim(substr(rtrim($buffer), 0, -strlen($delimiter)));
            if ($statement !== '') {
                $statements[] = $statement;
            }

            $buffer = '';
        }

        $tail = trim($buffer);
        if ($tail !== '') {
            $statements[] = $tail;
        }

        return $statements;
    }

    public static function retargetDatabase(string $sql, string $sourceDatabase, string $targetDatabase): string
    {
        $sql = self::stripUtf8Bom($sql);
        $createPattern = sprintf(
            '/^\s*CREATE DATABASE IF NOT EXISTS\s+`?%s`?\s+CHARACTER SET\s+utf8mb4\s+COLLATE\s+utf8mb4_unicode_ci;\s*/im',
            preg_quote($sourceDatabase, '/'),
        );
        $sql = (string) preg_replace($createPattern, '', $sql, 1);

        $usePattern = sprintf(
            '/^\s*USE\s+`?%s`?\s*;\s*/im',
            preg_quote($sourceDatabase, '/'),
        );

        $sql = (string) preg_replace(
            $usePattern,
            'USE ' . self::quoteIdentifier($targetDatabase) . ";\n\n",
            $sql,
            1,
        );

        $quotedQualifiedPattern = sprintf(
            '/`%s`\s*\./i',
            preg_quote($sourceDatabase, '/'),
        );
        $sql = (string) preg_replace(
            $quotedQualifiedPattern,
            self::quoteIdentifier($targetDatabase) . '.',
            $sql,
        );

        $qualifiedPattern = sprintf(
            '/\b%s\s*\./i',
            preg_quote($sourceDatabase, '/'),
        );
        return (string) preg_replace(
            $qualifiedPattern,
            self::quoteIdentifier($targetDatabase) . '.',
            $sql,
        );
    }

    private static function bufferEndsWithDelimiter(string $buffer, string $delimiter): bool
    {
        return str_ends_with(rtrim($buffer), $delimiter);
    }

    private static function quoteIdentifier(string $identifier): string
    {
        return '`' . str_replace('`', '``', $identifier) . '`';
    }

    private static function stripUtf8Bom(string $sql): string
    {
        return str_starts_with($sql, "\xEF\xBB\xBF") ? substr($sql, 3) : $sql;
    }
}
