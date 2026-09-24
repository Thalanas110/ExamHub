<?php

declare(strict_types=1);

use App\Bootstrap\ServiceContainer;
use App\Shared\Config\AppConfig;
use App\Shared\Config\Env;
use App\Database\DbConnection;
use App\Database\RoutineGateway;
use App\Http\CorsPolicy;
use App\Http\Request;
use App\Http\Response;
use App\Routing\Router;
use App\Routing\Routes\ApiRouteRegistry;
use App\Security\AesGcmCrypto;
use App\Shared\Support\ApiException;
use App\Shared\Support\Helpers;

require_once __DIR__ . '/../backend/bootstrap/autoload.php';

$env = new Env(__DIR__ . '/../backend/.env');
$config = AppConfig::fromEnv($env);
$transportCrypto = new AesGcmCrypto($config->encryptionKey);

$requestHeaders = function_exists('getallheaders') ? getallheaders() : [];
if (!is_array($requestHeaders)) {
    $requestHeaders = [];
}
if ($requestHeaders === []) {
    foreach ($_SERVER as $key => $value) {
        if (!str_starts_with((string) $key, 'HTTP_')) {
            continue;
        }

        $headerName = str_replace('_', '-', strtolower(substr((string) $key, 5)));
        $requestHeaders[$headerName] = (string) $value;
    }
}

$normalizedRequestHeaders = [];
foreach ($requestHeaders as $key => $value) {
    $normalizedRequestHeaders[strtolower((string) $key)] = (string) $value;
}

$usePlaintextTransport = false;
if ($config->transportAllowPlaintextRequests) {
    $transportMode = strtolower(trim((string) ($normalizedRequestHeaders['x-transport-mode'] ?? '')));
    $providedBypassKey = trim((string) ($normalizedRequestHeaders['x-transport-bypass-key'] ?? ''));
    $expectedBypassKey = (string) ($config->transportPlaintextBypassKey ?? '');

    if (
        $transportMode === 'plain'
        && $expectedBypassKey !== ''
        && hash_equals($expectedBypassKey, $providedBypassKey)
    ) {
        $usePlaintextTransport = true;
    }
}

$responseTransportCrypto = $usePlaintextTransport ? null : $transportCrypto;

$corsAllowed = CorsPolicy::apply($config);

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code($corsAllowed ? 200 : 403);
    exit;
}

if (!$corsAllowed) {
    Response::json(['error' => 'Origin not allowed by CORS policy.'], 403, $responseTransportCrypto);
    exit;
}

try {
    $pdo = (new DbConnection($config))->pdo();
    $gateway = new RoutineGateway($pdo);

    $container = ServiceContainer::build($config, $gateway);
    $container->seedService->bootstrap();
    $container->logRetentionService->maybeRun();

    $router = new Router();
    ApiRouteRegistry::register($router, $container);

    $scriptName = str_replace('\\', '/', (string) ($_SERVER['SCRIPT_NAME'] ?? ''));
    $basePath = rtrim(str_replace('/index.php', '', $scriptName), '/');
    $request = Request::fromGlobals($basePath === '' ? '/api' : $basePath, $responseTransportCrypto);
    $requestId = Helpers::uuidV4();
    header('X-Request-Id: ' . $requestId);
    $startedAt = microtime(true);

    $result = $router->dispatch(
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

    Response::json($result['data'], $result['status'], $responseTransportCrypto);
} catch (ApiException $apiException) {
    Response::json(['error' => $apiException->getMessage()], $apiException->status, $responseTransportCrypto);
} catch (Throwable $throwable) {
    Response::json(['error' => 'Backend bootstrap failed.'], 500, $responseTransportCrypto);
}
