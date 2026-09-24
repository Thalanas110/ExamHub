<?php

declare(strict_types=1);

use App\Shared\Config\AppConfig;
use App\Shared\Config\Env;
use App\Shared\Database\DbConnection;
use App\Shared\Security\AesGcmCrypto;
use App\Shared\Security\PasswordHasher;

require_once __DIR__ . '/../bootstrap/autoload.php';

const DEFAULT_CSV_PATH = __DIR__ . '/../database/seeds/fake_users_5701.csv';

main($argv);

/**
 * @param array<int, string> $argv
 */
function main(array $argv): void
{
    $options = parseOptions($argv);

    if (array_key_exists('help', $options)) {
        printUsage();
        exit(0);
    }

    $csvPath = resolveCsvPath((string) ($options['csv'] ?? DEFAULT_CSV_PATH));
    if (!is_file($csvPath) || !is_readable($csvPath)) {
        throw new RuntimeException('CSV file is not readable: ' . $csvPath);
    }

    $env = new Env(__DIR__ . '/../.env');
    $config = AppConfig::fromEnv($env);
    $pdo = (new DbConnection($config))->pdo();

    $crypto = new AesGcmCrypto($config->encryptionKey);
    $passwordHasher = new PasswordHasher();

    $handle = fopen($csvPath, 'rb');
    if ($handle === false) {
        throw new RuntimeException('Unable to open CSV file: ' . $csvPath);
    }

    $header = fgetcsv($handle, 0, ',', '"', '\\');
    if ($header === false) {
        throw new RuntimeException('CSV file is empty: ' . $csvPath);
    }

    $header = normalizeHeader($header);
    assertRequiredColumns($header, [
        'id',
        'name',
        'email',
        'role',
        'password',
        'department',
        'phone',
        'bio',
        'joined_at',
    ]);

    $sql = <<<SQL
INSERT IGNORE INTO users (
    id, name, email, password_hash, role,
    department_ciphertext, department_iv, department_tag, department_enc,
    phone_ciphertext, phone_iv, phone_tag, phone_enc,
    bio_ciphertext, bio_iv, bio_tag, bio_enc,
    joined_at
) VALUES (
    :id, :name, :email, :password_hash, :role,
    :department_ciphertext, :department_iv, :department_tag, :department_enc,
    :phone_ciphertext, :phone_iv, :phone_tag, :phone_enc,
    :bio_ciphertext, :bio_iv, :bio_tag, :bio_enc,
    :joined_at
)
SQL;
    $statement = $pdo->prepare($sql);

    $passwordHashCache = [];
    $inserted = 0;
    $ignored = 0;
    $lineNumber = 1;
    $insertedByRole = ['admin' => 0, 'teacher' => 0, 'student' => 0];
    $ignoredByRole = ['admin' => 0, 'teacher' => 0, 'student' => 0];

    try {
        $pdo->beginTransaction();

        while (($row = fgetcsv($handle, 0, ',', '"', '\\')) !== false) {
            $lineNumber++;
            if (isBlankRow($row)) {
                continue;
            }

            if (count($row) !== count($header)) {
                throw new RuntimeException(sprintf('Line %d has %d columns; expected %d.', $lineNumber, count($row), count($header)));
            }

            $record = array_combine($header, $row);
            if ($record === false) {
                throw new RuntimeException(sprintf('Line %d could not be parsed.', $lineNumber));
            }

            $id = trim((string) $record['id']);
            $name = trim((string) $record['name']);
            $email = strtolower(trim((string) $record['email']));
            $role = normalizeRole((string) $record['role']);
            $password = (string) $record['password'];
            $joinedAt = normalizeDate((string) $record['joined_at'], $lineNumber);

            if ($id === '' || $name === '') {
                throw new RuntimeException(sprintf('Line %d requires non-empty id and name.', $lineNumber));
            }
            if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                throw new RuntimeException(sprintf('Line %d has invalid email: %s', $lineNumber, $email));
            }
            if ($password === '') {
                throw new RuntimeException(sprintf('Line %d requires non-empty password.', $lineNumber));
            }

            if (!array_key_exists($password, $passwordHashCache)) {
                $passwordHashCache[$password] = $passwordHasher->hash($password);
            }
            $passwordHash = $passwordHashCache[$password];

            [$departmentCiphertext, $departmentIv, $departmentTag] = $crypto->encryptParams(nullableString($record['department'] ?? null));
            [$phoneCiphertext, $phoneIv, $phoneTag] = $crypto->encryptParams(nullableString($record['phone'] ?? null));
            [$bioCiphertext, $bioIv, $bioTag] = $crypto->encryptParams(nullableString($record['bio'] ?? null));

            $statement->execute([
                ':id' => $id,
                ':name' => $name,
                ':email' => $email,
                ':password_hash' => $passwordHash,
                ':role' => $role,
                ':department_ciphertext' => $departmentCiphertext,
                ':department_iv' => $departmentIv,
                ':department_tag' => $departmentTag,
                ':department_enc' => null,
                ':phone_ciphertext' => $phoneCiphertext,
                ':phone_iv' => $phoneIv,
                ':phone_tag' => $phoneTag,
                ':phone_enc' => null,
                ':bio_ciphertext' => $bioCiphertext,
                ':bio_iv' => $bioIv,
                ':bio_tag' => $bioTag,
                ':bio_enc' => null,
                ':joined_at' => $joinedAt,
            ]);

            if ($statement->rowCount() === 1) {
                $inserted++;
                $insertedByRole[$role]++;
                continue;
            }

            $ignored++;
            $ignoredByRole[$role]++;
        }

        $pdo->commit();
    } catch (Throwable $throwable) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $throwable;
    } finally {
        fclose($handle);
    }

    fwrite(STDOUT, "Fake user CSV import completed.\n");
    fwrite(STDOUT, "CSV: {$csvPath}\n");
    fwrite(STDOUT, sprintf("Inserted rows: %d\n", $inserted));
    fwrite(STDOUT, sprintf("Ignored rows (duplicates): %d\n", $ignored));
    fwrite(STDOUT, sprintf(
        "Inserted by role: admin=%d, teacher=%d, student=%d\n",
        $insertedByRole['admin'],
        $insertedByRole['teacher'],
        $insertedByRole['student'],
    ));
    fwrite(STDOUT, sprintf(
        "Ignored by role: admin=%d, teacher=%d, student=%d\n",
        $ignoredByRole['admin'],
        $ignoredByRole['teacher'],
        $ignoredByRole['student'],
    ));
}

/**
 * @param array<int, string> $argv
 * @return array<string, string>
 */
function parseOptions(array $argv): array
{
    $options = [];
    $count = count($argv);

    for ($index = 1; $index < $count; $index++) {
        $argument = $argv[$index];
        if (!str_starts_with($argument, '--')) {
            continue;
        }

        $argument = substr($argument, 2);
        if ($argument === '') {
            continue;
        }

        if (str_contains($argument, '=')) {
            [$key, $value] = explode('=', $argument, 2);
            $options[$key] = $value;
            continue;
        }

        $next = $argv[$index + 1] ?? '';
        if ($next !== '' && !str_starts_with($next, '--')) {
            $options[$argument] = $next;
            $index++;
            continue;
        }

        $options[$argument] = '1';
    }

    return $options;
}

function resolveCsvPath(string $csvPath): string
{
    $trimmed = trim($csvPath);
    if ($trimmed === '') {
        return DEFAULT_CSV_PATH;
    }

    if (preg_match('/^[A-Za-z]:\\\\/', $trimmed) === 1) {
        return $trimmed;
    }

    if (str_starts_with($trimmed, '/') || str_starts_with($trimmed, '\\')) {
        return $trimmed;
    }

    return realpath(__DIR__ . '/..') . DIRECTORY_SEPARATOR . str_replace(['/', '\\'], DIRECTORY_SEPARATOR, $trimmed);
}

/**
 * @param array<int, mixed> $header
 * @return array<int, string>
 */
function normalizeHeader(array $header): array
{
    $normalized = [];
    foreach ($header as $index => $columnName) {
        $value = trim((string) $columnName);
        if ($index === 0) {
            $value = ltrim($value, "\xEF\xBB\xBF");
        }
        $normalized[] = $value;
    }

    return $normalized;
}

/**
 * @param array<int, string> $header
 * @param array<int, string> $requiredColumns
 */
function assertRequiredColumns(array $header, array $requiredColumns): void
{
    foreach ($requiredColumns as $column) {
        if (!in_array($column, $header, true)) {
            throw new RuntimeException(sprintf('CSV header must include "%s".', $column));
        }
    }
}

/**
 * @param array<int, mixed> $row
 */
function isBlankRow(array $row): bool
{
    foreach ($row as $value) {
        if (trim((string) $value) !== '') {
            return false;
        }
    }

    return true;
}

function normalizeRole(string $role): string
{
    $normalized = strtolower(trim($role));
    if ($normalized === 'professor') {
        return 'teacher';
    }

    if (!in_array($normalized, ['student', 'teacher', 'admin'], true)) {
        throw new RuntimeException(sprintf('Unsupported role "%s".', $role));
    }

    return $normalized;
}

function normalizeDate(string $date, int $lineNumber): string
{
    $trimmed = trim($date);
    $parsed = DateTimeImmutable::createFromFormat('Y-m-d', $trimmed);
    if ($parsed === false || $parsed->format('Y-m-d') !== $trimmed) {
        throw new RuntimeException(sprintf('Line %d has invalid joined_at date "%s". Expected YYYY-MM-DD.', $lineNumber, $date));
    }

    return $trimmed;
}

function nullableString(mixed $value): ?string
{
    if (!is_string($value)) {
        return null;
    }

    $trimmed = trim($value);
    return $trimmed === '' ? null : $trimmed;
}

function printUsage(): void
{
    $usage = <<<TXT
Usage:
  php scripts/import_fake_users_csv.php [--csv PATH]

Defaults:
  --csv backend/database/seeds/fake_users_5701.csv

Behavior:
  - Inserts users from CSV into users table.
  - Uses INSERT IGNORE, so existing rows (same email) are left untouched.
  - Encrypts department/phone/bio using APP_ENCRYPTION_KEY.
  - Hashes password values from CSV.

TXT;
    fwrite(STDOUT, $usage);
}
