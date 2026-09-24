<?php

declare(strict_types=1);

require_once __DIR__ . '/../bootstrap/autoload.php';

if (!class_exists(App\Modules\Users\Application\UserService::class)) {
    throw new RuntimeException('UserService should be provided by the users application module.');
}

if (!class_exists(App\Modules\Users\Application\ProfileService::class)) {
    throw new RuntimeException('ProfileService should be provided by the users application module.');
}

fwrite(STDOUT, "Users application namespace tests passed.\n");
