<?php

declare(strict_types=1);

require_once __DIR__ . '/../bootstrap/autoload.php';

use App\Shared\Observability\AuditLogService;
use App\Shared\Observability\LogRetentionService;
use App\Shared\Observability\RequestLogService;

$requestLog = new RequestLogService(null);
$requestLog->write('request-1', 'get', '/health', 200, 1, null, null, null, null, null);

$auditLog = new AuditLogService(null);
$auditLog->writeHttpEvent('request-1', 'GET', '/health', '/health', [], 200, 1, null, null);

$retention = new LogRetentionService(null, 90);
$retention->maybeRun();

fwrite(STDOUT, "Observability fail-open tests passed.\n");
