<?php

declare(strict_types=1);

require_once __DIR__ . '/../bootstrap/autoload.php';

use App\Modules\Auth\Application\AuthService;
use App\Modules\Auth\Domain\AuthRepository;
use App\Modules\Auth\Infrastructure\RoutineAuthRepository;

$constructor = new ReflectionMethod(AuthService::class, '__construct');
$parameters = $constructor->getParameters();
if ($parameters[1]->getType()?->getName() !== AuthRepository::class) {
    throw new RuntimeException('AuthService should depend on AuthRepository.');
}

if (!is_subclass_of(RoutineAuthRepository::class, AuthRepository::class)) {
    throw new RuntimeException('RoutineAuthRepository should implement AuthRepository.');
}

fwrite(STDOUT, "Auth repository contract tests passed.\n");
