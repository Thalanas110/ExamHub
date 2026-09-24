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

if (!is_subclass_of(App\Modules\Exams\Infrastructure\RoutineExamRepository::class, App\Modules\Exams\Domain\ExamRepository::class)) {
    throw new RuntimeException('RoutineExamRepository should implement ExamRepository.');
}

$constructor = new ReflectionMethod(App\Modules\Exams\Application\ExamService::class, '__construct');
if ($constructor->getParameters()[0]->getType()?->getName() !== App\Modules\Exams\Domain\ExamRepository::class) {
    throw new RuntimeException('ExamService should depend on ExamRepository.');
}

fwrite(STDOUT, "Exams application namespace tests passed.\n");
