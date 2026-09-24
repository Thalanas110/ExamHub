<?php

declare(strict_types=1);

namespace App\Routing\Routes;

use App\Controllers\AuthController;
use App\Shared\Http\Request;
use App\Shared\Http\Router;

final class AuthRoutes
{
    public static function register(Router $router, AuthController $controller): void
    {
        $router->add('POST', '/auth/register', static fn (Request $request, array $params, ?array $authUser): array => $controller->register($request));
        $router->add('POST', '/auth/login', static fn (Request $request, array $params, ?array $authUser): array => $controller->login($request));
        $router->add('DELETE', '/auth/logout', static fn (Request $request, array $params, ?array $authUser): array => $controller->logout($request), true);
    }
}
