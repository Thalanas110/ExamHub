<?php

declare(strict_types=1);

require_once __DIR__ . '/../bootstrap/autoload.php';

if (!class_exists(App\Modules\Reports\Application\ReportService::class)) {
    throw new RuntimeException('ReportService should be provided by the reports application module.');
}

fwrite(STDOUT, "Reports application namespace tests passed.\n");
