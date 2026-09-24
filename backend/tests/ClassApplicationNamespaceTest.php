<?php

declare(strict_types=1);

require_once __DIR__ . '/../bootstrap/autoload.php';

if (!class_exists(App\Modules\Classes\Application\ClassService::class)) {
    throw new RuntimeException('ClassService should be provided by the classes application module.');
}

fwrite(STDOUT, "Classes application namespace tests passed.\n");
