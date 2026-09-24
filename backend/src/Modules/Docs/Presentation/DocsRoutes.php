<?php

declare(strict_types=1);

namespace App\Modules\Docs\Presentation;

use App\Shared\Http\Request;
use App\Shared\Http\Router;

final class DocsRoutes
{
    public static function register(Router $router, DocsController $controller): void
    {
        $router->add(
            'GET',
            '/docs/verify',
            static fn (Request $request, array $params, ?array $authUser): array => $controller->verify(),
            true,
            ['admin'],
        );
    }
}
