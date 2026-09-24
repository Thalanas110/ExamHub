<?php

declare(strict_types=1);

namespace App\Routing\Routes;

use App\Bootstrap\ServiceContainer;
use App\Modules\Auth\Presentation\AuthRoutes;
use App\Modules\Users\Presentation\ProfileRoutes;
use App\Modules\Users\Presentation\UserRoutes;
use App\Modules\Classes\Presentation\ClassRoutes;
use App\Modules\Exams\Presentation\ExamRoutes;
use App\Shared\Http\Router;

final class ApiRouteRegistry
{
    public static function register(Router $router, ServiceContainer $container): void
    {
        HealthRoutes::register($router, $container->healthController);
        AuthRoutes::register($router, $container->authController);
        ProfileRoutes::register($router, $container->profileController);
        UserRoutes::register($router, $container->usersController);
        ClassRoutes::register($router, $container->classesController);
        ExamRoutes::register($router, $container->examsController);
        ExamViolationRoutes::register($router, $container->examViolationsController);
        ResultRoutes::register($router, $container->resultsController);
        AdminRoutes::register($router, $container->adminController);
        ReportRoutes::register($router, $container->reportsController);
        DataRoutes::register($router, $container->dataController);
        DocsRoutes::register($router, $container->docsController);
    }
}
