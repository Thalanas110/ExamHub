<?php

declare(strict_types=1);

namespace App\Application;

use App\Bootstrap\ServiceContainer;
use App\Shared\Http\Router;

final class BackendApplication
{
    public function __construct(
        public Router $router,
        public ServiceContainer $services,
    ) {
    }
}
