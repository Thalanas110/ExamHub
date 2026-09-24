<?php

declare(strict_types=1);

namespace App\Modules\Auth\Domain;

final readonly class AuthUser
{
    public function __construct(
        public string $id,
        public string $name,
        public string $email,
        public string $role,
        public string $joinedAt,
        public ?string $department,
        public ?string $phone,
        public ?string $bio,
    ) {
    }

    /**
     * @param array<string, mixed> $attributes
     */
    public static function fromArray(array $attributes): self
    {
        return new self(
            id: (string) ($attributes['id'] ?? ''),
            name: (string) ($attributes['name'] ?? ''),
            email: (string) ($attributes['email'] ?? ''),
            role: (string) ($attributes['role'] ?? 'student'),
            joinedAt: (string) ($attributes['joinedAt'] ?? date('Y-m-d')),
            department: self::nullableString($attributes['department'] ?? null),
            phone: self::nullableString($attributes['phone'] ?? null),
            bio: self::nullableString($attributes['bio'] ?? null),
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
            'email' => $this->email,
            'role' => $this->role,
            'joinedAt' => $this->joinedAt,
            'department' => $this->department,
            'phone' => $this->phone,
            'bio' => $this->bio,
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
