<?php

declare(strict_types=1);

namespace App\Shared\Observability;

use App\Shared\Database\RoutineGateway;
use App\Shared\Support\ApiException;
use Throwable;

final class AdminLogReadService
{
    public function __construct(private ?RoutineGateway $gateway)
    {
    }

    /**
     * @return array<string, mixed>
     */
    public function getLogs(int $limit = 200): array
    {
        $gateway = $this->requireGateway('Admin log visibility is unavailable.');

        try {
            $rowsets = $gateway->callMulti('sp_admin_log_activity_read', [$this->normalizeLimit($limit)]);
        } catch (Throwable $throwable) {
            throw new ApiException(500, 'Failed to fetch admin logs: ' . $throwable->getMessage());
        }

        $requestSummary = $rowsets[0][0] ?? [];
        $requestLogs = $rowsets[1] ?? [];
        $auditSummary = $rowsets[2][0] ?? [];
        $auditLogs = $rowsets[3] ?? [];

        return [
            'requestSummary' => [
                'totalRequests' => self::intValue($requestSummary, 'totalRequests'),
                'failedRequests' => self::intValue($requestSummary, 'failedRequests'),
                'averageDurationMs' => self::intValue($requestSummary, 'averageDurationMs'),
                'uniqueUsers' => self::intValue($requestSummary, 'uniqueUsers'),
                'latestRequestAt' => self::nullableString($requestSummary, 'latestRequestAt'),
            ],
            'requestLogs' => array_map([self::class, 'mapRequestLog'], $requestLogs),
            'auditSummary' => [
                'totalAuditEvents' => self::intValue($auditSummary, 'totalAuditEvents'),
                'failedAuditEvents' => self::intValue($auditSummary, 'failedAuditEvents'),
                'uniqueActors' => self::intValue($auditSummary, 'uniqueActors'),
                'latestAuditAt' => self::nullableString($auditSummary, 'latestAuditAt'),
            ],
            'auditLogs' => array_map([self::class, 'mapAuditLog'], $auditLogs),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function getViolationDashboard(int $limit = 200): array
    {
        $gateway = $this->requireGateway('Admin violation visibility is unavailable.');

        try {
            $rowsets = $gateway->callMulti('sp_admin_violation_dashboard', [$this->normalizeLimit($limit)]);
        } catch (Throwable $throwable) {
            throw new ApiException(500, 'Failed to fetch violation dashboard: ' . $throwable->getMessage());
        }

        $violationSummary = $rowsets[0][0] ?? [];
        $caseSummary = $rowsets[1][0] ?? [];
        $rows = $rowsets[2] ?? [];

        return [
            'summary' => [
                'totalViolations' => self::intValue($violationSummary, 'totalViolations'),
                'impactedStudents' => self::intValue($violationSummary, 'impactedStudents'),
                'autoSubmittedCount' => self::intValue($violationSummary, 'autoSubmittedCount'),
                'latestViolationAt' => self::nullableString($violationSummary, 'latestViolationAt'),
                'totalCases' => self::intValue($caseSummary, 'totalCases'),
                'pendingCases' => self::intValue($caseSummary, 'pendingCases'),
                'elevatedCases' => self::intValue($caseSummary, 'elevatedCases'),
            ],
            'rows' => array_map([self::class, 'mapViolationRow'], $rows),
        ];
    }

    private function requireGateway(string $message): RoutineGateway
    {
        if (!$this->gateway instanceof RoutineGateway) {
            throw new ApiException(503, $message);
        }

        return $this->gateway;
    }

    private function normalizeLimit(int $limit): int
    {
        return max(1, min(500, $limit));
    }

    /**
     * @param array<string, mixed> $row
     * @return array<string, mixed>
     */
    private static function mapRequestLog(array $row): array
    {
        return [
            'id' => self::intValue($row, 'id'),
            'requestId' => self::stringValue($row, 'requestId'),
            'method' => self::stringValue($row, 'method'),
            'path' => self::stringValue($row, 'path'),
            'statusCode' => self::intValue($row, 'statusCode'),
            'durationMs' => self::intValue($row, 'durationMs'),
            'userId' => self::nullableString($row, 'userId'),
            'role' => self::nullableString($row, 'role'),
            'ipAddress' => self::nullableString($row, 'ipAddress'),
            'userAgent' => self::nullableString($row, 'userAgent'),
            'errorSummary' => self::nullableString($row, 'errorSummary'),
            'createdAt' => self::nullableString($row, 'createdAt'),
        ];
    }

    /**
     * @param array<string, mixed> $row
     * @return array<string, mixed>
     */
    private static function mapAuditLog(array $row): array
    {
        return [
            'id' => self::intValue($row, 'id'),
            'requestId' => self::stringValue($row, 'requestId'),
            'actionMethod' => self::stringValue($row, 'actionMethod'),
            'resourcePath' => self::stringValue($row, 'resourcePath'),
            'routePattern' => self::nullableString($row, 'routePattern'),
            'targetId' => self::nullableString($row, 'targetId'),
            'outcome' => self::stringValue($row, 'outcome'),
            'statusCode' => self::intValue($row, 'statusCode'),
            'durationMs' => self::intValue($row, 'durationMs'),
            'actorUserId' => self::nullableString($row, 'actorUserId'),
            'actorRole' => self::nullableString($row, 'actorRole'),
            'createdAt' => self::nullableString($row, 'createdAt'),
        ];
    }

    /**
     * @param array<string, mixed> $row
     * @return array<string, mixed>
     */
    private static function mapViolationRow(array $row): array
    {
        return [
            'examId' => self::stringValue($row, 'examId'),
            'examTitle' => self::stringValue($row, 'examTitle'),
            'className' => self::nullableString($row, 'className'),
            'studentId' => self::stringValue($row, 'studentId'),
            'studentName' => self::stringValue($row, 'studentName'),
            'studentEmail' => self::nullableString($row, 'studentEmail'),
            'violationCount' => self::intValue($row, 'violationCount'),
            'firstOccurredAt' => self::nullableString($row, 'firstOccurredAt'),
            'lastOccurredAt' => self::nullableString($row, 'lastOccurredAt'),
            'latestType' => self::nullableString($row, 'latestType'),
            'latestDetails' => self::nullableString($row, 'latestDetails'),
            'caseId' => self::nullableString($row, 'caseId'),
            'severity' => self::nullableString($row, 'severity'),
            'outcome' => self::nullableString($row, 'outcome'),
            'teacherNotes' => self::nullableString($row, 'teacherNotes'),
            'reviewedBy' => self::nullableString($row, 'reviewedBy'),
            'reviewerName' => self::nullableString($row, 'reviewerName'),
            'reviewedAt' => self::nullableString($row, 'reviewedAt'),
            'createdAt' => self::nullableString($row, 'createdAt'),
            'updatedAt' => self::nullableString($row, 'updatedAt'),
        ];
    }

    /**
     * @param array<string, mixed> $row
     */
    private static function intValue(array $row, string $key): int
    {
        return (int) ($row[$key] ?? 0);
    }

    /**
     * @param array<string, mixed> $row
     */
    private static function stringValue(array $row, string $key): string
    {
        return (string) ($row[$key] ?? '');
    }

    /**
     * @param array<string, mixed> $row
     */
    private static function nullableString(array $row, string $key): ?string
    {
        $value = $row[$key] ?? null;
        if ($value === null) {
            return null;
        }

        $stringValue = trim((string) $value);
        return $stringValue === '' ? null : $stringValue;
    }
}
