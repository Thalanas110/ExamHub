<?php

declare(strict_types=1);

namespace App\Shared\Observability;

use App\Shared\Database\RoutineGateway;
use Throwable;

final class LogRetentionService
{
    private static int $lastRunEpoch = 0;

    public function __construct(
        private ?RoutineGateway $gateway,
        private int $retentionDays,
    ) {
    }

    public function maybeRun(): void
    {
        if (!$this->gateway instanceof RoutineGateway) {
            return;
        }

        $now = time();
        if (self::$lastRunEpoch !== 0 && ($now - self::$lastRunEpoch) < 3600) {
            return;
        }

        self::$lastRunEpoch = $now;

        try {
            $this->gateway->call('sp_log_retention_purge', [max(1, $this->retentionDays)]);
        } catch (Throwable) {
            // fail-open by design
        }
    }
}
