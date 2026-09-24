<?php

declare(strict_types=1);

namespace App\Modules\Results\Presentation;

use App\Shared\Http\Request;
use App\Shared\Http\Router;

final class ResultRoutes
{
    public static function register(Router $router, ResultsController $controller): void
    {
        $router->add('POST', '/results/start', static fn (Request $request, array $params, ?array $authUser): array => $controller->startAttempt($request, $authUser ?? []), true, ['student']);
        $router->add('POST', '/results/submit', static fn (Request $request, array $params, ?array $authUser): array => $controller->submitResult($request, $authUser ?? []), true, ['student']);
        $router->add('GET', '/results/student/:id', static fn (Request $request, array $params, ?array $authUser): array => $controller->getResultsByStudent($params, $authUser ?? []), true);
        $router->add('PUT', '/results/:id/grade', static fn (Request $request, array $params, ?array $authUser): array => $controller->gradeResult($request, $params, $authUser ?? []), true, ['admin', 'teacher']);
    }
}
