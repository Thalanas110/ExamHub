<?php

declare(strict_types=1);

namespace App\Routing\Routes;

use App\Controllers\HealthController;
use App\Shared\Http\Request;
use App\Shared\Http\Router;

final class HealthRoutes
{
    public static function register(Router $router, HealthController $controller): void
    {
        $router->add('GET', '/health', static fn (Request $request, array $params, ?array $authUser): array => $controller->health());
    }
}
