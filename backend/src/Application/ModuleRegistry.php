<?php

declare(strict_types=1);

namespace App\Application;

use App\Routing\Routes\ApiRouteRegistry;

final class ModuleRegistry
{
    public static function register(BackendApplication $application): void
    {
        ApiRouteRegistry::register($application->router, $application->services);
    }
}
