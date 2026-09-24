<?php

declare(strict_types=1);

require_once __DIR__ . '/../bootstrap/autoload.php';

if (!class_exists(App\Modules\Violations\Application\ViolationCaseService::class)) {
    throw new RuntimeException('ViolationCaseService should be provided by the violations application module.');
}

fwrite(STDOUT, "Violations application namespace tests passed.\n");
