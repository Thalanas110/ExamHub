<?php

declare(strict_types=1);

require_once __DIR__ . '/../bootstrap/autoload.php';

foreach ([
    App\Modules\Reports\Presentation\AdminController::class,
    App\Modules\Reports\Presentation\ReportsController::class,
    App\Modules\Reports\Presentation\AdminRoutes::class,
    App\Modules\Reports\Presentation\ReportRoutes::class,
] as $className) {
    if (!class_exists($className)) {
        throw new RuntimeException($className . ' should be provided by the reports presentation module.');
    }
}

fwrite(STDOUT, "Reports presentation namespace tests passed.\n");
