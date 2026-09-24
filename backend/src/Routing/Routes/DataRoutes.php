<?php

declare(strict_types=1);

namespace App\Routing\Routes;

use App\Controllers\DataController;
use App\Shared\Http\Request;
use App\Shared\Http\Router;

final class DataRoutes
{
    public static function register(Router $router, DataController $controller): void
    {
        $router->add('GET', '/data/all', static fn (Request $request, array $params, ?array $authUser): array => $controller->getAllData($authUser ?? []), true);
        $router->add('POST', '/data/reseed', static fn (Request $request, array $params, ?array $authUser): array => $controller->reseedData($request), true, ['admin']);
    }
}
