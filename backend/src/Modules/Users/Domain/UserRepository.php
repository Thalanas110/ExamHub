<?php

declare(strict_types=1);

namespace App\Modules\Users\Domain;

interface UserRepository
{
    /**
     * @return array<int, array<string, mixed>>
     */
    public function findAll(): array;

    /**
     * @return array<string, mixed>|null
     */
    public function findById(string $userId): ?array;

    /**
     * @param array<int, mixed> $parameters
     * @return array<string, mixed>|null
     */
    public function create(array $parameters): ?array;

    /**
     * @param array<int, mixed> $parameters
     * @return array<string, mixed>|null
     */
    public function update(array $parameters): ?array;

    public function delete(string $userId): void;
}
