<?php

declare(strict_types=1);

namespace App\Routing\Routes;

use App\Controllers\ExamViolationsController;
use App\Shared\Http\Request;
use App\Shared\Http\Router;

final class ExamViolationRoutes
{
    public static function register(Router $router, ExamViolationsController $controller): void
    {
        // Student records a violation while taking the exam
        $router->add(
            'POST',
            '/exams/:id/violations',
            static fn (Request $request, array $params, ?array $authUser): array =>
                $controller->recordViolation($request, $params, $authUser ?? []),
            true,
            ['student'],
        );

        // Teacher / admin views all violations for an exam
        $router->add(
            'GET',
            '/exams/:id/violations',
            static fn (Request $request, array $params, ?array $authUser): array =>
                $controller->listViolations($params, $authUser ?? []),
            true,
            ['teacher', 'admin'],
        );

        // Teacher / admin views all case decisions for an exam
        $router->add(
            'GET',
            '/exams/:id/violation-cases',
            static fn (Request $request, array $params, ?array $authUser): array =>
                $controller->listCases($params, $authUser ?? []),
            true,
            ['teacher', 'admin'],
        );

        // Teacher / admin creates or updates a case decision for a student
        $router->add(
            'PUT',
            '/exams/:id/violation-cases/:studentId',
            static fn (Request $request, array $params, ?array $authUser): array =>
                $controller->upsertCase($request, $params, $authUser ?? []),
            true,
            ['teacher', 'admin'],
        );
    }
}
