<?php

declare(strict_types=1);

namespace App\Modules\Results\Infrastructure;

use App\Modules\Results\Domain\ResultRepository;
use App\Shared\Database\RoutineGateway;

final class RoutineResultRepository implements ResultRepository
{
    public function __construct(private RoutineGateway $gateway)
    {
    }

    public function startAttempt(array $parameters): ?array
    {
        $row = $this->gateway->call('sp_results_start_attempt', $parameters)[0] ?? null;
        return is_array($row) ? $row : null;
    }

    public function submitStartedAttempt(array $parameters): ?array
    {
        $row = $this->gateway->call('sp_results_submit_started_attempt', $parameters)[0] ?? null;
        return is_array($row) ? $row : null;
    }

    public function findByStudentForUser(string $studentId, string $role, string $userId): array
    {
        return $this->gateway->call('sp_results_get_by_student_for_user', [$studentId, $role, $userId]);
    }

    public function findByIdForUser(string $submissionId, string $role, string $userId): ?array
    {
        $row = $this->gateway->call('sp_results_get_by_id_for_user', [$submissionId, $role, $userId])[0] ?? null;
        return is_array($row) ? $row : null;
    }

    public function updateGrade(array $parameters): ?array
    {
        $row = $this->gateway->call('sp_results_grade_update', $parameters)[0] ?? null;
        return is_array($row) ? $row : null;
    }

    public function findExamForUser(string $examId, string $role, string $userId): ?array
    {
        $row = $this->gateway->call('sp_exams_get_by_id_for_user', [$examId, $role, $userId])[0] ?? null;
        return is_array($row) ? $row : null;
    }

    public function findByExamAndStudent(string $examId, string $studentId): array
    {
        return $this->gateway->call('sp_results_get_by_exam_and_student', [$examId, $studentId]);
    }

    public function updateStatus(string $submissionId, string $status, string $updatedAt): void
    {
        $this->gateway->call('sp_results_update_status', [$submissionId, $status, $updatedAt]);
    }

    public function deleteQuestionMetrics(string $submissionId): void
    {
        $this->gateway->call('sp_submission_question_metrics_delete_by_submission', [$submissionId]);
    }

    public function upsertQuestionMetric(array $parameters): void
    {
        $this->gateway->call('sp_submission_question_metrics_upsert', $parameters);
    }
}
