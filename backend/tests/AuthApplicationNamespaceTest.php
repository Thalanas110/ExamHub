<?php

declare(strict_types=1);

require_once __DIR__ . '/../bootstrap/autoload.php';

if (!class_exists(App\Modules\Auth\Application\AuthService::class)) {
    throw new RuntimeException('AuthService should be provided by the auth application module.');
}

fwrite(STDOUT, "Auth application namespace tests passed.\n");
