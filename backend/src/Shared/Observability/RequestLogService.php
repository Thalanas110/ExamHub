<?php

declare(strict_types=1);

namespace App\Shared\Observability;

use App\Shared\Database\RoutineGateway;
use Throwable;

final class RequestLogService
{
    public function __construct(private ?RoutineGateway $gateway)
    {
    }

    public function write(
        string $requestId,
        string $method,
        string $path,
        int $statusCode,
        int $durationMs,
        ?string $userId,
        ?string $role,
        ?string $ipAddress,
        ?string $userAgent,
        ?string $errorSummary,
    ): void {
        if (!$this->gateway instanceof RoutineGateway) {
            return;
        }

        try {
            $this->gateway->call('sp_log_request_create', [
                $requestId,
                strtoupper($method),
                $path,
                $statusCode,
                $durationMs,
                $userId,
                $role,
                $ipAddress,
                $userAgent,
                $errorSummary,
            ]);
        } catch (Throwable) {
            // fail-open by design
        }
    }
}
