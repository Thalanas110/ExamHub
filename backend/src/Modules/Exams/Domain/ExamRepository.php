<?php

declare(strict_types=1);

namespace App\Modules\Exams\Domain;

interface ExamRepository
{
    /**
     * @return array<int, array<string, mixed>>
     */
    public function findForUser(string $role, string $userId): array;

    /**
     * @return array<string, mixed>|null
     */
    public function findByIdForUser(string $examId, string $role, string $userId): ?array;

    /**
     * @return array<string, mixed>|null
     */
    public function findById(string $examId): ?array;

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

    public function delete(string $examId): void;
}
