<?php

declare(strict_types=1);

namespace App\Logging;

use App\Shared\Database\RoutineGateway;
use Throwable;

final class AuditLogService
{
    public function __construct(private ?RoutineGateway $gateway)
    {
    }

    /**
     * @param array<string, string> $pathParams
     */
    public function writeHttpEvent(
        string $requestId,
        string $method,
        string $path,
        ?string $routePattern,
        array $pathParams,
        int $statusCode,
        int $durationMs,
        ?string $actorUserId,
        ?string $actorRole,
    ): void {
        if (!$this->gateway instanceof RoutineGateway) {
            return;
        }

        $targetId = $pathParams['id'] ?? $pathParams['studentId'] ?? null;
        $outcome = $statusCode >= 400 ? 'failure' : 'success';

        try {
            $this->gateway->call('sp_log_audit_create', [
                $requestId,
                strtoupper($method),
                $path,
                $routePattern,
                $targetId,
                $outcome,
                $statusCode,
                $durationMs,
                $actorUserId,
                $actorRole,
            ]);
        } catch (Throwable) {
            // fail-open by design
        }
    }
}
