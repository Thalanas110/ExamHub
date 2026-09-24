<?php

declare(strict_types=1);

require_once __DIR__ . '/../bootstrap/autoload.php';

if (!class_exists(App\Application\BackendApplicationFactory::class)) {
    throw new RuntimeException('BackendApplicationFactory should own backend composition.');
}

$method = new ReflectionMethod(App\Application\BackendApplicationFactory::class, 'create');
if ($method->getReturnType()?->getName() !== App\Application\BackendApplication::class) {
    throw new RuntimeException('BackendApplicationFactory should return BackendApplication.');
}

fwrite(STDOUT, "Backend application factory tests passed.\n");
