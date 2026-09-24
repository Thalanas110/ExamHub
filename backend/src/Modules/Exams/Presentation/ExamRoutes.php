<?php

declare(strict_types=1);

namespace App\Modules\Exams\Presentation;

use App\Shared\Http\Request;
use App\Shared\Http\Router;

final class ExamRoutes
{
    public static function register(Router $router, ExamsController $controller): void
    {
        $router->add('GET', '/exams', static fn (Request $request, array $params, ?array $authUser): array => $controller->getExams($authUser ?? []), true);
        $router->add('POST', '/exams', static fn (Request $request, array $params, ?array $authUser): array => $controller->createExam($request, $authUser ?? []), true, ['admin', 'teacher']);
        $router->add('GET', '/exams/:id/accommodations', static fn (Request $request, array $params, ?array $authUser): array => $controller->getExamAccommodations($params, $authUser ?? []), true, ['admin', 'teacher']);
        $router->add('GET', '/exams/:id/accommodations/:studentId', static fn (Request $request, array $params, ?array $authUser): array => $controller->getExamAccommodation($params, $authUser ?? []), true, ['admin', 'teacher']);
        $router->add('PUT', '/exams/:id/accommodations/:studentId', static fn (Request $request, array $params, ?array $authUser): array => $controller->upsertExamAccommodation($request, $params, $authUser ?? []), true, ['admin', 'teacher']);
        $router->add('DELETE', '/exams/:id/accommodations/:studentId', static fn (Request $request, array $params, ?array $authUser): array => $controller->deleteExamAccommodation($params, $authUser ?? []), true, ['admin', 'teacher']);
        $router->add('GET', '/exams/:id', static fn (Request $request, array $params, ?array $authUser): array => $controller->getExamById($params, $authUser ?? []), true);
        $router->add('PUT', '/exams/:id', static fn (Request $request, array $params, ?array $authUser): array => $controller->updateExam($request, $params, $authUser ?? []), true, ['admin', 'teacher']);
        $router->add('DELETE', '/exams/:id', static fn (Request $request, array $params, ?array $authUser): array => $controller->deleteExam($params, $authUser ?? []), true, ['admin', 'teacher']);
    }
}
