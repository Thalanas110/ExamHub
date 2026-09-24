<?php

declare(strict_types=1);

namespace App\Services;

use App\Shared\Database\RoutineGateway;
use App\Shared\Support\ApiException;
use App\Shared\Support\Helpers;
use Throwable;

final class ViolationCaseService
{
    private const ALLOWED_SEVERITIES = ['low', 'medium', 'high', 'critical'];
    private const ALLOWED_OUTCOMES   = ['pending', 'dismissed', 'warned', 'score_penalized', 'invalidated'];

    public function __construct(private ?RoutineGateway $gateway)
    {
    }

    /**
     * List all violation cases for an exam (teacher/admin queue).
     *
     * @return array<int, array<string, mixed>>
     */
    public function getByExam(string $examId): array
    {
        if (!$this->gateway instanceof RoutineGateway) {
            throw new ApiException(503, 'Violation case service is unavailable.');
        }

        try {
            return $this->gateway->call('sp_violation_case_get_by_exam', [$examId]);
        } catch (Throwable $e) {
            throw new ApiException(500, 'Failed to fetch violation cases: ' . $e->getMessage());
        }
    }

    /**
     * Get a single violation case for a student within an exam.
     *
     * @return array<string, mixed>
     */
    public function getByExamAndStudent(string $examId, string $studentId): array
    {
        if (!$this->gateway instanceof RoutineGateway) {
            throw new ApiException(503, 'Violation case service is unavailable.');
        }

        try {
            $rows = $this->gateway->call('sp_violation_case_get_by_exam_student', [$examId, $studentId]);
            return $rows[0] ?? [];
        } catch (Throwable $e) {
            throw new ApiException(500, 'Failed to fetch violation case: ' . $e->getMessage());
        }
    }

    /**
     * Create or update a violation case decision.
     *
     * @param array<string, mixed> $data  Keys: id?, severity, outcome, notes?
     * @return array<string, mixed>        The saved case row
     */
    public function upsert(string $examId, string $studentId, array $data, string $reviewedBy): array
    {
        $id = isset($data['id']) && is_string($data['id']) && $data['id'] !== ''
            ? $data['id']
            : Helpers::uuidV4();

        $severity = (string) ($data['severity'] ?? 'low');
        $outcome  = (string) ($data['outcome']  ?? 'pending');
        $notes    = isset($data['notes']) && $data['notes'] !== '' ? (string) $data['notes'] : null;

        if (!in_array($severity, self::ALLOWED_SEVERITIES, true)) {
            throw new ApiException(422, 'Invalid severity. Allowed: ' . implode(', ', self::ALLOWED_SEVERITIES));
        }
        if (!in_array($outcome, self::ALLOWED_OUTCOMES, true)) {
            throw new ApiException(422, 'Invalid outcome. Allowed: ' . implode(', ', self::ALLOWED_OUTCOMES));
        }

        if (!$this->gateway instanceof RoutineGateway) {
            throw new ApiException(503, 'Violation case service is unavailable.');
        }

        try {
            $rows = $this->gateway->call('sp_violation_case_upsert', [
                $id,
                $examId,
                $studentId,
                $severity,
                $outcome,
                $notes,
                $reviewedBy,
            ]);
            return $rows[0] ?? [];
        } catch (Throwable $e) {
            throw new ApiException(500, 'Failed to save violation case: ' . $e->getMessage());
        }
    }
}
