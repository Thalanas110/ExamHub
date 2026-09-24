<?php

declare(strict_types=1);

$root = dirname(__DIR__, 2);
$requiredPaths = [
    $root . '/src/Bootstrap/ServiceContainer.php',
    $root . '/src/Controllers',
    $root . '/src/Database',
    $root . '/src/Http',
    $root . '/src/Logging',
    $root . '/src/Routing/Routes/ApiRouteRegistry.php',
    $root . '/src/Security',
    $root . '/src/Services',
    $root . '/tests',
];

$missing = array_values(array_filter($requiredPaths, static fn (string $path): bool => !file_exists($path)));
if ($missing !== []) {
    fwrite(STDERR, "Baseline source inventory is incomplete:\n" . implode("\n", $missing) . "\n");
    exit(1);
}

$routeFiles = glob($root . '/src/Routing/Routes/*Routes.php');
if (!is_array($routeFiles) || count($routeFiles) < 10) {
    fwrite(STDERR, "Expected at least 10 route registration files.\n");
    exit(1);
}

fwrite(STDOUT, sprintf("Backend baseline captured: %d route files.\n", count($routeFiles)));
