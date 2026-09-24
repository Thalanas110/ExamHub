<?php

declare(strict_types=1);

namespace App\Application;

use App\Modules\Auth\Presentation\AuthRoutes;
use App\Modules\Classes\Presentation\ClassRoutes;
use App\Modules\Data\Presentation\DataRoutes;
use App\Modules\Docs\Presentation\DocsRoutes;
use App\Modules\Exams\Presentation\ExamRoutes;
use App\Modules\Health\Presentation\HealthRoutes;
use App\Modules\Reports\Presentation\AdminRoutes;
use App\Modules\Reports\Presentation\ReportRoutes;
use App\Modules\Results\Presentation\ResultRoutes;
use App\Modules\Users\Presentation\ProfileRoutes;
use App\Modules\Users\Presentation\UserRoutes;
use App\Modules\Violations\Presentation\ExamViolationRoutes;

final class ModuleRegistry
{
    public static function register(BackendApplication $application): void
    {
        $router = $application->router;
        $container = $application->services;

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
