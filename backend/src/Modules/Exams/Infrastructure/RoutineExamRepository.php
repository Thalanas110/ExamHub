<?php

declare(strict_types=1);

namespace App\Modules\Exams\Infrastructure;

use App\Modules\Exams\Domain\ExamRepository;
use App\Shared\Database\RoutineGateway;

final class RoutineExamRepository implements ExamRepository
{
    public function __construct(private RoutineGateway $gateway)
    {
    }

    public function findForUser(string $role, string $userId): array
    {
        return $this->gateway->call('sp_exams_get_for_user', [$role, $userId]);
    }

    public function findByIdForUser(string $examId, string $role, string $userId): ?array
    {
        $row = $this->gateway->call('sp_exams_get_by_id_for_user', [$examId, $role, $userId])[0] ?? null;
        return is_array($row) ? $row : null;
    }

    public function findById(string $examId): ?array
    {
        $row = $this->gateway->call('sp_exams_get_by_id', [$examId])[0] ?? null;
        return is_array($row) ? $row : null;
    }

    public function create(array $parameters): ?array
    {
        $row = $this->gateway->call('sp_exams_create', $parameters)[0] ?? null;
        return is_array($row) ? $row : null;
    }

    public function update(array $parameters): ?array
    {
        $row = $this->gateway->call('sp_exams_update', $parameters)[0] ?? null;
        return is_array($row) ? $row : null;
    }

    public function delete(string $examId): void
    {
        $this->gateway->call('sp_exams_delete', [$examId]);
    }
}
