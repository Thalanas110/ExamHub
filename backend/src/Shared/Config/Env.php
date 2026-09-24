<?php

declare(strict_types=1);

namespace App\Shared\Config;

final class Env
{
    /** @var array<string, string> */
    private array $values = [];

    public function __construct(string $envFile)
    {
        if (!is_file($envFile)) {
            return;
        }

        $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        if ($lines === false) {
            return;
        }

        foreach ($lines as $line) {
            $trimmed = trim($line);
            if ($trimmed === '' || str_starts_with($trimmed, '#')) {
                continue;
            }

            $parts = explode('=', $trimmed, 2);
            if (count($parts) !== 2) {
                continue;
            }

            $key = trim($parts[0]);
            $value = trim($parts[1]);
            $value = trim($value, "\"'");
            $this->values[$key] = $value;
        }
    }

    public function get(string $key, string $default = ''): string
    {
        $fromEnv = getenv($key);
        if (is_string($fromEnv) && $fromEnv !== '') {
            return $fromEnv;
        }

        return $this->values[$key] ?? $default;
    }

    public function getInt(string $key, int $default): int
    {
        return (int) $this->get($key, (string) $default);
    }

    public function getBool(string $key, bool $default): bool
    {
        $value = strtolower($this->get($key, $default ? 'true' : 'false'));
        return in_array($value, ['1', 'true', 'yes', 'on'], true);
    }

    /**
     * @throws \RuntimeException if the variable is not set or empty
     */
    public function require(string $key): string
    {
        $value = $this->get($key);
        if ($value === '') {
            throw new \RuntimeException("Required environment variable '{$key}' is not set.");
        }
        return $value;
    }
}
