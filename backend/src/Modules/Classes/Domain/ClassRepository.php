<?php

declare(strict_types=1);

namespace App\Modules\Classes\Domain;

interface ClassRepository
{
    /**
     * @return array<int, array<string, mixed>>
     */
    public function findAll(): array;

    /**
     * @return array<string, mixed>|null
     */
    public function findById(string $classId): ?array;

    /**
     * @return array<string, mixed>|null
     */
    public function findByCode(string $code): ?array;
}
