<?php

declare(strict_types=1);

namespace App\Shared\Observability;

use App\Shared\Database\RoutineGateway;
use App\Shared\Support\ApiException;
use Throwable;

final class ExamViolationService
{
    public function __construct(private ?RoutineGateway $gateway)
    {
    }

    /**
     * Record a single anti-cheat violation for a student during an exam.
     * Stored in examhub_logs (the logging DB), not the main DB.
     *
     * @return array<string, mixed>  The inserted violation row
     * @throws ApiException          When the logging DB is unavailable
     */
    public function record(string $examId, string $studentId, string $type, ?string $details): array
    {
        if (!$this->gateway instanceof RoutineGateway) {
            throw new ApiException(503, 'Violation logging is unavailable.');
        }

        try {
            $rows = $this->gateway->call('sp_violation_create', [
                $examId,
                $studentId,
                $type,
                $details,
            ]);
        } catch (Throwable $e) {
            throw new ApiException(500, 'Failed to record violation: ' . $e->getMessage());
        }

        return $rows[0] ?? [];
    }

    /**
     * List all violations for a specific exam (teacher/admin view).
     *
     * @return array<int, array<string, mixed>>
     * @throws ApiException  When the logging DB is unavailable
     */
    public function listByExam(string $examId): array
    {
        if (!$this->gateway instanceof RoutineGateway) {
            throw new ApiException(503, 'Violation logging is unavailable.');
        }

        try {
            return $this->gateway->call('sp_violation_list_by_exam', [$examId]);
        } catch (Throwable $e) {
            throw new ApiException(500, 'Failed to fetch violations: ' . $e->getMessage());
        }
    }
}
