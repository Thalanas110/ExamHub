<?php

declare(strict_types=1);

require_once __DIR__ . '/../bootstrap/autoload.php';

use App\Modules\Classes\Application\ClassService;
use App\Modules\Classes\Domain\ClassRepository;
use App\Modules\Classes\Infrastructure\RoutineClassRepository;

if (!is_subclass_of(RoutineClassRepository::class, ClassRepository::class)) {
    throw new RuntimeException('RoutineClassRepository should implement ClassRepository.');
}

$constructor = new ReflectionMethod(ClassService::class, '__construct');
if ($constructor->getParameters()[0]->getType()?->getName() !== ClassRepository::class) {
    throw new RuntimeException('ClassService should depend on ClassRepository.');
}

foreach ([
    App\Modules\Classes\Presentation\ClassesController::class,
    App\Modules\Classes\Presentation\ClassRoutes::class,
] as $className) {
    if (!class_exists($className)) {
        throw new RuntimeException($className . ' should be provided by the classes presentation module.');
    }
}

fwrite(STDOUT, "Classes repository and presentation contracts passed.\n");
