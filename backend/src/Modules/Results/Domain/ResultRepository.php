<?php

declare(strict_types=1);

namespace App\Modules\Results\Domain;

interface ResultRepository
{
    /**
     * @param array<int, mixed> $parameters
     * @return array<string, mixed>|null
     */
    public function startAttempt(array $parameters): ?array;

    /**
     * @param array<int, mixed> $parameters
     * @return array<string, mixed>|null
     */
    public function submitStartedAttempt(array $parameters): ?array;

    /**
     * @return array<int, array<string, mixed>>
     */
    public function findByStudentForUser(string $studentId, string $role, string $userId): array;

    /**
     * @return array<string, mixed>|null
     */
    public function findByIdForUser(string $submissionId, string $role, string $userId): ?array;

    /**
     * @param array<int, mixed> $parameters
     * @return array<string, mixed>|null
     */
    public function updateGrade(array $parameters): ?array;

    /**
     * @return array<string, mixed>|null
     */
    public function findExamForUser(string $examId, string $role, string $userId): ?array;

    /**
     * @return array<int, array<string, mixed>>
     */
    public function findByExamAndStudent(string $examId, string $studentId): array;

    public function updateStatus(string $submissionId, string $status, string $updatedAt): void;

    public function deleteQuestionMetrics(string $submissionId): void;

    /**
     * @param array<int, mixed> $parameters
     */
    public function upsertQuestionMetric(array $parameters): void;
}
