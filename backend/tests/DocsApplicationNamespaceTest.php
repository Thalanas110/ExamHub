<?php

declare(strict_types=1);

require_once __DIR__ . '/../bootstrap/autoload.php';

if (!class_exists(App\Modules\Docs\Application\ApiDocsVerificationService::class)) {
    throw new RuntimeException('ApiDocsVerificationService should be provided by the docs application module.');
}

$service = new App\Modules\Docs\Application\ApiDocsVerificationService();
$result = $service->verifyRequiredEndpoints();
if (!isset($result['summary']['required'], $result['summary']['matched'])) {
    throw new RuntimeException('API docs verification should return a route summary.');
}

fwrite(STDOUT, "Docs application namespace tests passed.\n");
