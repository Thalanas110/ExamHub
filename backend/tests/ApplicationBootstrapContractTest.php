<?php

declare(strict_types=1);

require_once __DIR__ . '/../bootstrap/autoload.php';

if (!class_exists(App\Application\BackendApplication::class)) {
    throw new RuntimeException('BackendApplication should be available.');
}

if (!class_exists(App\Application\ModuleRegistry::class)) {
    throw new RuntimeException('ModuleRegistry should be available.');
}

if (!method_exists(App\Application\ModuleRegistry::class, 'register')) {
    throw new RuntimeException('ModuleRegistry::register should be available.');
}

fwrite(STDOUT, "Application bootstrap contract tests passed.\n");
