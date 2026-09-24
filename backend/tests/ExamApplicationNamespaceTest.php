<?php

declare(strict_types=1);

require_once __DIR__ . '/../bootstrap/autoload.php';

if (!class_exists(App\Modules\Exams\Application\ExamPayloadValidator::class)) {
    throw new RuntimeException('ExamPayloadValidator should be provided by the exams application module.');
}

if (!class_exists(App\Modules\Exams\Application\ExamService::class)) {
    throw new RuntimeException('ExamService should be provided by the exams application module.');
}

if (!class_exists(App\Modules\Exams\Application\StudentExamAccommodationService::class)) {
    throw new RuntimeException('StudentExamAccommodationService should be provided by the exams application module.');
}

fwrite(STDOUT, "Exams application namespace tests passed.\n");
