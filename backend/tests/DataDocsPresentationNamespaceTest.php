<?php

declare(strict_types=1);

require_once __DIR__ . '/../bootstrap/autoload.php';

foreach ([
    App\Modules\Data\Presentation\DataController::class,
    App\Modules\Data\Presentation\DataRoutes::class,
    App\Modules\Docs\Presentation\DocsController::class,
    App\Modules\Docs\Presentation\DocsRoutes::class,
] as $className) {
    if (!class_exists($className)) {
        throw new RuntimeException($className . ' should be provided by its module presentation surface.');
    }
}

fwrite(STDOUT, "Data and docs presentation namespace tests passed.\n");
