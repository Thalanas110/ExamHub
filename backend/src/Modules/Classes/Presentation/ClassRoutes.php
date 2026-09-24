<?php

declare(strict_types=1);

namespace App\Modules\Classes\Presentation;

use App\Shared\Http\Request;
use App\Shared\Http\Router;

final class ClassRoutes
{
    public static function register(Router $router, ClassesController $controller): void
    {
        $router->add('GET', '/classes', static fn (Request $request, array $params, ?array $authUser): array => $controller->getClasses(), true);
        $router->add('POST', '/classes', static fn (Request $request, array $params, ?array $authUser): array => $controller->createClass($request, $authUser ?? []), true, ['admin', 'teacher']);
        $router->add('PUT', '/classes/:id', static fn (Request $request, array $params, ?array $authUser): array => $controller->updateClass($request, $params, $authUser ?? []), true, ['admin', 'teacher']);
        $router->add('DELETE', '/classes/:id', static fn (Request $request, array $params, ?array $authUser): array => $controller->deleteClass($params, $authUser ?? []), true, ['admin', 'teacher']);
        $router->add('POST', '/classes/join', static fn (Request $request, array $params, ?array $authUser): array => $controller->joinClass($request, $authUser ?? []), true, ['student']);
        $router->add('POST', '/classes/:id/leave', static fn (Request $request, array $params, ?array $authUser): array => $controller->leaveClass($params, $authUser ?? []), true);
        $router->add('POST', '/classes/:id/enroll', static fn (Request $request, array $params, ?array $authUser): array => $controller->enrollStudent($request, $params, $authUser ?? []), true, ['admin', 'teacher']);
        $router->add('DELETE', '/classes/:id/students/:studentId', static fn (Request $request, array $params, ?array $authUser): array => $controller->removeStudent($params, $authUser ?? []), true, ['admin', 'teacher']);
    }
}
