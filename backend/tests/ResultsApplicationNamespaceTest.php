<?php

declare(strict_types=1);

require_once __DIR__ . '/../bootstrap/autoload.php';

if (!class_exists(App\Modules\Results\Application\ResultService::class)) {
    throw new RuntimeException('ResultService should be provided by the results application module.');
}

fwrite(STDOUT, "Results application namespace tests passed.\n");
