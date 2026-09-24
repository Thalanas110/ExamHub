<?php

declare(strict_types=1);

require_once __DIR__ . '/../bootstrap/autoload.php';

foreach ([
    App\Modules\Exams\Presentation\ExamsController::class,
    App\Modules\Exams\Presentation\ExamRoutes::class,
] as $className) {
    if (!class_exists($className)) {
        throw new RuntimeException($className . ' should be provided by the exams presentation module.');
    }
}

fwrite(STDOUT, "Exams presentation namespace tests passed.\n");
