<?php

declare(strict_types=1);

namespace App\Modules\Classes\Application;

use App\Shared\Support\Helpers;
use App\Services\Support\ValueNormalizer;

final class ClassMapper
{
    public function __construct(private ValueNormalizer $normalizer)
    {
    }

    /**
     * @param array<string, mixed> $row
     * @return array<string, mixed>
     */
    public function mapRow(array $row): array
    {
        $studentIds = Helpers::decodeJsonArray($row['studentIds'] ?? '[]');
        $studentIds = array_values(array_filter(
            array_map(static fn (mixed $id): string => (string) $id, $studentIds),
            static fn (string $id): bool => $id !== '',
        ));

        return [
            'id' => (string) ($row['id'] ?? ''),
            'name' => (string) ($row['name'] ?? ''),
            'subject' => (string) ($row['subject'] ?? ''),
            'teacherId' => (string) ($row['teacherId'] ?? ''),
            'studentIds' => $studentIds,
            'code' => (string) ($row['code'] ?? ''),
            'createdAt' => (string) ($row['createdAt'] ?? date('Y-m-d')),
            'description' => $this->normalizer->nullableString($row['description'] ?? null),
        ];
    }
}
