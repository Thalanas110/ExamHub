<?php

declare(strict_types=1);

require_once __DIR__ . '/../bootstrap/autoload.php';

use App\Http\Request;
use App\Routing\Router;
use App\Shared\Support\ApiException;

function routerAssertSame(mixed $expected, mixed $actual, string $message): void
{
    if ($expected !== $actual) {
        throw new RuntimeException(sprintf(
            "%s Expected %s, got %s.\n",
            $message,
            var_export($expected, true),
            var_export($actual, true),
        ));
    }
}

$request = static fn (string $method, string $path): Request => new Request($method, $path, [], []);

$router = new Router();
$router->add('GET', '/items/:id', static function (Request $incoming, array $params, ?array $authUser): array {
    return [
        'status' => 200,
        'data' => [
            'id' => $params['id'] ?? null,
            'auth' => $authUser,
        ],
    ];
}, true, ['admin']);

$authorized = $router->dispatch(
    $request('GET', '/items/abc'),
    static fn (Request $incoming): ?array => ['id' => 'user-1', 'role' => 'admin'],
);
routerAssertSame(200, $authorized['status'], 'Authorized route should return its status.');
routerAssertSame('abc', $authorized['data']['id'] ?? null, 'Path parameter should be captured.');
routerAssertSame('/items/:id', $authorized['meta']['pattern'] ?? null, 'Route pattern should be included in metadata.');
routerAssertSame('abc', $authorized['meta']['params']['id'] ?? null, 'Metadata should include path parameters.');

$unauthorized = $router->dispatch($request('GET', '/items/abc'), static fn (Request $incoming): ?array => null);
routerAssertSame(401, $unauthorized['status'], 'Missing auth should return 401.');

$forbidden = $router->dispatch(
    $request('GET', '/items/abc'),
    static fn (Request $incoming): ?array => ['id' => 'user-2', 'role' => 'student'],
);
routerAssertSame(403, $forbidden['status'], 'Wrong role should return 403.');

$notFound = $router->dispatch($request('GET', '/missing'), static fn (Request $incoming): ?array => null);
routerAssertSame(404, $notFound['status'], 'Unknown route should return 404.');

$options = $router->dispatch($request('OPTIONS', '/items/abc'), static fn (Request $incoming): ?array => null);
routerAssertSame(200, $options['status'], 'OPTIONS should return 200.');

$exceptionRouter = new Router();
$exceptionRouter->add('GET', '/failure', static function (): array {
    throw new ApiException(422, 'Invalid item.');
});
$exceptionResponse = $exceptionRouter->dispatch($request('GET', '/failure'), static fn (Request $incoming): ?array => null);
routerAssertSame(422, $exceptionResponse['status'], 'ApiException status should be preserved.');
routerAssertSame('Invalid item.', $exceptionResponse['data']['error'] ?? null, 'ApiException message should be preserved.');

fwrite(STDOUT, "Router contract tests passed.\n");
