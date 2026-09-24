<?php

declare(strict_types=1);

require_once __DIR__ . '/../bootstrap/autoload.php';

foreach ([
    App\Modules\Violations\Presentation\ExamViolationsController::class,
    App\Modules\Violations\Presentation\ExamViolationRoutes::class,
    App\Modules\Health\Presentation\HealthController::class,
    App\Modules\Health\Presentation\HealthRoutes::class,
] as $className) {
    if (!class_exists($className)) {
        throw new RuntimeException($className . ' should be provided by its module presentation surface.');
    }
}

fwrite(STDOUT, "Violations and health presentation namespace tests passed.\n");
