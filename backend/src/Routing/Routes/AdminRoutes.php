<?php

declare(strict_types=1);

namespace App\Routing\Routes;

use App\Controllers\AdminController;
use App\Http\Request;
use App\Routing\Router;

final class AdminRoutes
{
    public static function register(Router $router, AdminController $controller): void
    {
        $router->add('GET', '/admin/exams', static fn (Request $request, array $params, ?array $authUser): array => $controller->getAdminExams(), true, ['admin']);
        $router->add('GET', '/admin/results', static fn (Request $request, array $params, ?array $authUser): array => $controller->getAdminResults(), true, ['admin']);
        $router->add('GET', '/admin/logs', static fn (Request $request, array $params, ?array $authUser): array => $controller->getAdminLogs(), true, ['admin']);
        $router->add('GET', '/admin/violations', static fn (Request $request, array $params, ?array $authUser): array => $controller->getAdminViolations(), true, ['admin']);
    }
}
