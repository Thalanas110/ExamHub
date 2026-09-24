<?php

declare(strict_types=1);

namespace App\Modules\Classes\Domain;

final readonly class Classroom
{
    /**
     * @param array<int, string> $studentIds
     */
    public function __construct(
        public string $id,
        public string $name,
        public string $subject,
        public string $teacherId,
        public array $studentIds,
        public string $code,
        public string $createdAt,
        public ?string $description,
    ) {
    }

    /**
     * @param array<string, mixed> $attributes
     */
    public static function fromArray(array $attributes): self
    {
        $studentIds = $attributes['studentIds'] ?? [];
        if (!is_array($studentIds)) {
            $studentIds = [];
        }

        return new self(
            id: (string) ($attributes['id'] ?? ''),
            name: (string) ($attributes['name'] ?? ''),
            subject: (string) ($attributes['subject'] ?? ''),
            teacherId: (string) ($attributes['teacherId'] ?? ''),
            studentIds: array_values(array_map(static fn (mixed $id): string => (string) $id, $studentIds)),
            code: (string) ($attributes['code'] ?? ''),
            createdAt: (string) ($attributes['createdAt'] ?? date('Y-m-d')),
            description: self::nullableString($attributes['description'] ?? null),
        );
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'subject' => $this->subject,
            'teacherId' => $this->teacherId,
            'studentIds' => $this->studentIds,
            'code' => $this->code,
            'createdAt' => $this->createdAt,
            'description' => $this->description,
        ];
    }

    private static function nullableString(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $string = trim((string) $value);
        return $string === '' ? null : $string;
    }
}
