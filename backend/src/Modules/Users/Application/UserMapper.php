<?php

declare(strict_types=1);

namespace App\Modules\Users\Application;

use App\Shared\Security\AesGcmCrypto;
use App\Services\Support\ValueNormalizer;

final class UserMapper
{
    public function __construct(
        private AesGcmCrypto $crypto,
        private ValueNormalizer $normalizer,
    ) {
    }

    /**
     * @param array<string, mixed> $row
     * @return array<string, mixed>
     */
    public function mapRow(array $row): array
    {
        return [
            'id' => (string) ($row['id'] ?? ''),
            'name' => (string) ($row['name'] ?? ''),
            'email' => (string) ($row['email'] ?? ''),
            'role' => (string) ($row['role'] ?? 'student'),
            'joinedAt' => (string) ($row['joinedAt'] ?? date('Y-m-d')),
            'department' => $this->decryptField($row, 'departmentCiphertext', 'departmentIv', 'departmentTag', 'departmentEnc'),
            'phone' => $this->decryptField($row, 'phoneCiphertext', 'phoneIv', 'phoneTag', 'phoneEnc'),
            'bio' => $this->decryptField($row, 'bioCiphertext', 'bioIv', 'bioTag', 'bioEnc'),
        ];
    }

    /**
     * @param array<string, mixed> $row
     */
    private function decryptField(
        array $row,
        string $ciphertextKey,
        string $ivKey,
        string $tagKey,
        string $legacyKey,
    ): ?string {
        return $this->crypto->decryptValue(
            $this->normalizer->nullableString($row[$ciphertextKey] ?? null),
            $this->normalizer->nullableString($row[$ivKey] ?? null),
            $this->normalizer->nullableString($row[$tagKey] ?? null),
            $this->normalizer->nullableString($row[$legacyKey] ?? null),
        );
    }
}
