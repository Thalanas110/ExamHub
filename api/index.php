<?php

declare(strict_types=1);

use App\Application\BackendApplicationFactory;
use App\Shared\Config\AppConfig;
use App\Shared\Config\Env;
use App\Shared\Database\DbConnection;
use App\Shared\Database\RoutineGateway;
use App\Shared\Http\CorsPolicy;
use App\Shared\Http\Request;
use App\Shared\Http\Response;
use App\Shared\Support\ApiException;
use App\Shared\Support\Helpers;

require_once __DIR__ . '/../backend/bootstrap/autoload.php';

$env = new Env(__DIR__ . '/../backend/.env');
$config = AppConfig::fromEnv($env);
$corsAllowed = CorsPolicy::apply($config);

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code($corsAllowed ? 200 : 403);
    exit;
}

if (!$corsAllowed) {
    Response::json(['error' => 'Origin not allowed by CORS policy.'], 403);
    exit;
}

try {
    $pdo = (new DbConnection($config))->pdo();
    $gateway = new RoutineGateway($pdo);

    $application = BackendApplicationFactory::create($config, $gateway);
    $container = $application->services;
    $container->seedService->bootstrap();
    $container->logRetentionService->maybeRun();

    $scriptName = str_replace('\\', '/', (string) ($_SERVER['SCRIPT_NAME'] ?? ''));
    $basePath = rtrim(str_replace('/index.php', '', $scriptName), '/');
    $request = Request::fromGlobals($basePath === '' ? '/api' : $basePath);
    $requestId = Helpers::uuidV4();
    header('X-Request-Id: ' . $requestId);
    $startedAt = microtime(true);

    $result = $application->router->dispatch(
        $request,
        static fn (Request $incomingRequest): ?array => $container->authService->authenticateFromToken($incomingRequest->bearerToken()),
    );

    $durationMs = (int) round((microtime(true) - $startedAt) * 1000);
    $meta = is_array($result['meta'] ?? null) ? $result['meta'] : [];
    $authUser = is_array($meta['authUser'] ?? null) ? $meta['authUser'] : null;

    $pathParamsRaw = is_array($meta['params'] ?? null) ? $meta['params'] : [];
    $pathParams = [];
    foreach ($pathParamsRaw as $key => $value) {
        if (!is_string($key)) {
            continue;
        }
        $pathParams[$key] = is_string($value) ? $value : '';
    }

    $routePattern = is_string($meta['pattern'] ?? null) ? $meta['pattern'] : null;
    $statusCode = (int) ($result['status'] ?? 500);

    $errorSummary = null;
    if ($statusCode >= 400 && is_array($result['data'] ?? null)) {
        $error = $result['data']['error'] ?? null;
        if (is_string($error) && trim($error) !== '') {
            $errorSummary = substr(trim($error), 0, 255);
        }
    }

    $forwardedFor = trim((string) ($_SERVER['HTTP_X_FORWARDED_FOR'] ?? ''));
    $ipAddress = $forwardedFor !== ''
        ? trim((string) explode(',', $forwardedFor)[0])
        : trim((string) ($_SERVER['REMOTE_ADDR'] ?? ''));
    $ipAddress = $ipAddress === '' ? null : $ipAddress;

    $container->requestLogService->write(
        requestId: $requestId,
        method: $request->method,
        path: $request->path,
        statusCode: $statusCode,
        durationMs: $durationMs,
        userId: is_array($authUser) && isset($authUser['id']) ? (string) $authUser['id'] : null,
        role: is_array($authUser) && isset($authUser['role']) ? (string) $authUser['role'] : null,
        ipAddress: $ipAddress,
        userAgent: $request->header('user-agent'),
        errorSummary: $errorSummary,
    );

    $container->auditLogService->writeHttpEvent(
        requestId: $requestId,
        method: $request->method,
        path: $request->path,
        routePattern: $routePattern,
        pathParams: $pathParams,
        statusCode: $statusCode,
        durationMs: $durationMs,
        actorUserId: is_array($authUser) && isset($authUser['id']) ? (string) $authUser['id'] : null,
        actorRole: is_array($authUser) && isset($authUser['role']) ? (string) $authUser['role'] : null,
    );

    Response::json($result['data'], $result['status']);
} catch (ApiException $apiException) {
    Response::json(['error' => $apiException->getMessage()], $apiException->status);
} catch (Throwable $throwable) {
    Response::json(['error' => 'Backend bootstrap failed.'], 500);
}
