<?php

declare(strict_types=1);

$backendRoot = dirname(__DIR__);
$moduleRegistry = file_get_contents($backendRoot . '/src/Application/ModuleRegistry.php');
if (!is_string($moduleRegistry)) {
    throw new RuntimeException('ModuleRegistry source should be readable.');
}

$routeFiles = glob($backendRoot . '/src/Modules/*/Presentation/*Routes.php');
if (!is_array($routeFiles) || count($routeFiles) < 12) {
    throw new RuntimeException('Expected all module route files to live under module presentations.');
}

$routeCount = 0;
foreach ($routeFiles as $routeFile) {
    $source = file_get_contents($routeFile);
    if (!is_string($source)) {
        throw new RuntimeException('Unable to read route file: ' . $routeFile);
    }

    $routeCount += preg_match_all('/\$router->add\(/', $source) ?: 0;
    $className = pathinfo($routeFile, PATHINFO_FILENAME);
    if (!str_contains($moduleRegistry, $className . '::register')) {
        throw new RuntimeException($className . ' is not registered by ModuleRegistry.');
    }
}

if ($routeCount !== 44) {
    throw new RuntimeException('Route parity changed unexpectedly; expected 44 registered routes, got ' . $routeCount . '.');
}

if (file_exists($backendRoot . '/src/Routing/Routes/ApiRouteRegistry.php')) {
    throw new RuntimeException('The legacy ApiRouteRegistry must remain deleted.');
}

fwrite(STDOUT, "Route parity tests passed for {$routeCount} module routes.\n");
