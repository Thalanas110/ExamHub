<?php

declare(strict_types=1);

require_once __DIR__ . '/../bootstrap/autoload.php';

$source = file_get_contents(__DIR__ . '/../src/Application/ModuleRegistry.php');
if (!is_string($source) || str_contains($source, 'ApiRouteRegistry')) {
    throw new RuntimeException('ModuleRegistry must own route composition directly.');
}

if (!class_exists(App\Application\ModuleRegistry::class)) {
    throw new RuntimeException('ModuleRegistry should be available from the application layer.');
}

fwrite(STDOUT, "Module registry tests passed.\n");
