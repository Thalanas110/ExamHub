<?php

declare(strict_types=1);

namespace App\Shared\Support;

final class Helpers
{
    public static function uuidV4(): string
    {
        $data = random_bytes(16);
        $data[6] = chr((ord($data[6]) & 0x0F) | 0x40);
        $data[8] = chr((ord($data[8]) & 0x3F) | 0x80);

        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }

    public static function gradeFromPercentage(float $percentage): string
    {
        if ($percentage >= 90.0) {
            return 'A+';
        }
        if ($percentage >= 80.0) {
            return 'A';
        }
        if ($percentage >= 70.0) {
            return 'B';
        }
        if ($percentage >= 60.0) {
            return 'C';
        }
        if ($percentage >= 50.0) {
            return 'D';
        }

        return 'F';
    }

    /**
     * @param mixed $value
     * @return array<int|string, mixed>
     */
    public static function decodeJsonDocument(mixed $value): array
    {
        if (is_array($value)) {
            return $value;
        }

        if (!is_string($value) || trim($value) === '') {
            return [];
        }

        $decoded = json_decode($value, true);
        return is_array($decoded) ? $decoded : [];
    }

    /**
     * @param mixed $value
     * @return array<int, mixed>
     */
    public static function decodeJsonArray(mixed $value): array
    {
        return array_values(self::decodeJsonDocument($value));
    }
}
