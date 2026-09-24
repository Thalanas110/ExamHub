<?php

declare(strict_types=1);

namespace App\Modules\Users\Presentation;

use App\Shared\Http\Request;
use App\Shared\Http\Router;

final class UserRoutes
{
    public static function register(Router $router, UsersController $controller): void
    {
        $router->add('GET', '/users', static fn (Request $request, array $params, ?array $authUser): array => $controller->getUsers(), true, ['admin']);
        $router->add('POST', '/users', static fn (Request $request, array $params, ?array $authUser): array => $controller->createUser($request), true, ['admin']);
        $router->add('PUT', '/users/:id', static fn (Request $request, array $params, ?array $authUser): array => $controller->updateUser($request, $params), true, ['admin']);
        $router->add('DELETE', '/users/:id', static fn (Request $request, array $params, ?array $authUser): array => $controller->deleteUser($params), true, ['admin']);
    }
}
