<?php

declare(strict_types=1);

require_once __DIR__ . '/../bootstrap/autoload.php';

foreach ([
    App\Modules\Users\Presentation\ProfileController::class,
    App\Modules\Users\Presentation\UsersController::class,
    App\Modules\Users\Presentation\ProfileRoutes::class,
    App\Modules\Users\Presentation\UserRoutes::class,
] as $className) {
    if (!class_exists($className)) {
        throw new RuntimeException($className . ' should be provided by the users presentation module.');
    }
}

$constructor = new ReflectionMethod(App\Modules\Users\Presentation\ProfileController::class, '__construct');
if ($constructor->getParameters()[0]->getType()?->getName() !== App\Modules\Users\Application\ProfileService::class) {
    throw new RuntimeException('ProfileController should depend on Users ProfileService.');
}

fwrite(STDOUT, "Users presentation namespace tests passed.\n");
