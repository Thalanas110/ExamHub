<?php

declare(strict_types=1);

namespace App\Application;

use App\Bootstrap\ServiceContainer;
use App\Shared\Config\AppConfig;
use App\Shared\Database\RoutineGateway;
use App\Shared\Http\Router;

final class BackendApplicationFactory
{
    public static function create(AppConfig $config, RoutineGateway $gateway): BackendApplication
    {
        $services = ServiceContainer::build($config, $gateway);
        $application = new BackendApplication(new Router(), $services);
        ModuleRegistry::register($application);

        return $application;
    }
}
