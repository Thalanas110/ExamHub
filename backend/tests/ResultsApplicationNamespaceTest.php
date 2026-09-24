<?php

declare(strict_types=1);

require_once __DIR__ . '/../bootstrap/autoload.php';

if (!class_exists(App\Modules\Results\Application\ResultService::class)) {
    throw new RuntimeException('ResultService should be provided by the results application module.');
}

if (!is_subclass_of(App\Modules\Results\Infrastructure\RoutineResultRepository::class, App\Modules\Results\Domain\ResultRepository::class)) {
    throw new RuntimeException('RoutineResultRepository should implement ResultRepository.');
}

$constructor = new ReflectionMethod(App\Modules\Results\Application\ResultService::class, '__construct');
$parameters = $constructor->getParameters();
if ($parameters[5]->getType()?->getName() !== App\Modules\Results\Domain\ResultRepository::class) {
    throw new RuntimeException('ResultService should depend on ResultRepository.');
}

fwrite(STDOUT, "Results application namespace tests passed.\n");
