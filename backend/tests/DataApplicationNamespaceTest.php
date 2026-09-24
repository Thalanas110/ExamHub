<?php

declare(strict_types=1);

require_once __DIR__ . '/../bootstrap/autoload.php';

if (!class_exists(App\Modules\Data\Application\DataService::class)) {
    throw new RuntimeException('DataService should be provided by the data application module.');
}

if (!class_exists(App\Modules\Data\Application\SeedService::class)) {
    throw new RuntimeException('SeedService should be provided by the data application module.');
}

fwrite(STDOUT, "Data application namespace tests passed.\n");
