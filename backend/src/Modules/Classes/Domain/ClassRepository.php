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

    /**
     * @param array<int, mixed> $parameters
     */
    public function create(array $parameters): void;

    /**
     * @param array<int, mixed> $parameters
     */
    public function update(array $parameters): void;

    public function delete(string $classId): void;

    public function enrollStudent(string $classId, string $studentId): void;

    public function removeStudent(string $classId, string $studentId): void;
}
