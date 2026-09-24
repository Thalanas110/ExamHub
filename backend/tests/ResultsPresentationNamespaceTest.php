<?php

declare(strict_types=1);

require_once __DIR__ . '/../bootstrap/autoload.php';

foreach ([
    App\Modules\Results\Presentation\ResultsController::class,
    App\Modules\Results\Presentation\ResultRoutes::class,
] as $className) {
    if (!class_exists($className)) {
        throw new RuntimeException($className . ' should be provided by the results presentation module.');
    }
}

fwrite(STDOUT, "Results presentation namespace tests passed.\n");
