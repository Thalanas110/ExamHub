<?php

declare(strict_types=1);

require_once __DIR__ . '/../bootstrap/autoload.php';

use App\Modules\Users\Domain\UserRepository;
use App\Modules\Users\Infrastructure\RoutineUserRepository;
use App\Modules\Users\Application\UserService;

if (!is_subclass_of(RoutineUserRepository::class, UserRepository::class)) {
    throw new RuntimeException('RoutineUserRepository should implement UserRepository.');
}

$constructor = new ReflectionMethod(UserService::class, '__construct');
$parameters = $constructor->getParameters();

if ($parameters[0]->getType()?->getName() !== UserRepository::class) {
    throw new RuntimeException('UserService should depend on UserRepository.');
}

fwrite(STDOUT, "Users repository contract tests passed.\n");
