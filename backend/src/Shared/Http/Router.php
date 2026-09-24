<?php

declare(strict_types=1);

namespace App\Shared\Http;

use App\Shared\Http\Request;
use App\Shared\Support\ApiException;
use Throwable;

final class Router
{
    /** @var array<int, array{method: string, pattern: string, regex: string, params: array<int, string>, requiresAuth: bool, roles: array<int, string>, handler: callable}> */
    private array $routes = [];

    /**
     * @param array<int, string> $roles
     */
    public function add(
        string $method,
        string $pattern,
        callable $handler,
        bool $requiresAuth = false,
        array $roles = [],
    ): void {
        [$regex, $params] = $this->compilePattern($pattern);

        $this->routes[] = [
            'method' => strtoupper($method),
            'pattern' => $pattern,
            'regex' => $regex,
            'params' => $params,
            'requiresAuth' => $requiresAuth,
            'roles' => $roles,
            'handler' => $handler,
        ];
    }

    /**
     * @param callable $authResolver function(Request): array<string,mixed>|null
     * @return array{
     *   status: int,
     *   data: array<string, mixed>|array<int, mixed>,
     *   meta: array{pattern: string|null, params: array<string, string|null>, authUser: array<string, mixed>|null}
     * }
     */
    public function dispatch(Request $request, callable $authResolver): array
    {
        if ($request->method === 'OPTIONS') {
            return [
                'status' => 200,
                'data' => ['success' => true],
                'meta' => [
                    'pattern' => null,
                    'params' => [],
                    'authUser' => null,
                ],
            ];
        }

        foreach ($this->routes as $route) {
            if ($route['method'] !== $request->method) {
                continue;
            }

            $matches = [];
            if (preg_match($route['regex'], $request->path, $matches) !== 1) {
                continue;
            }

            $pathParams = [];
            foreach ($route['params'] as $index => $name) {
                $pathParams[$name] = $matches[$index + 1] ?? null;
            }

            $authUser = null;
            if ($route['requiresAuth'] === true) {
                $authUser = $authResolver($request);
                if ($authUser === null) {
                    return [
                        'status' => 401,
                        'data' => ['error' => 'Unauthorized'],
                        'meta' => [
                            'pattern' => $route['pattern'],
                            'params' => $pathParams,
                            'authUser' => null,
                        ],
                    ];
                }

                if ($route['roles'] !== [] && !in_array((string) ($authUser['role'] ?? ''), $route['roles'], true)) {
                    return [
                        'status' => 403,
                        'data' => ['error' => 'Forbidden'],
                        'meta' => [
                            'pattern' => $route['pattern'],
                            'params' => $pathParams,
                            'authUser' => $authUser,
                        ],
                    ];
                }
            }

            try {
                $response = ($route['handler'])($request, $pathParams, $authUser);
                $response['meta'] = [
                    'pattern' => $route['pattern'],
                    'params' => $pathParams,
                    'authUser' => $authUser,
                ];
                return $response;
            } catch (ApiException $apiException) {
                return [
                    'status' => $apiException->status,
                    'data' => ['error' => $apiException->getMessage()],
                    'meta' => [
                        'pattern' => $route['pattern'],
                        'params' => $pathParams,
                        'authUser' => $authUser,
                    ],
                ];
            } catch (Throwable $throwable) {
                return [
                    'status' => 500,
                    'data' => ['error' => 'Internal server error'],
                    'meta' => [
                        'pattern' => $route['pattern'],
                        'params' => $pathParams,
                        'authUser' => $authUser,
                    ],
                ];
            }
        }

        return [
            'status' => 404,
            'data' => ['error' => 'Not found'],
            'meta' => [
                'pattern' => null,
                'params' => [],
                'authUser' => null,
            ],
        ];
    }

    /**
     * @return array{0: string, 1: array<int, string>}
     */
    private function compilePattern(string $pattern): array
    {
        $params = [];
        $regex = preg_replace_callback('/:([a-zA-Z_][a-zA-Z0-9_]*)/', static function (array $match) use (&$params): string {
            $params[] = $match[1];
            return '([^/]+)';
        }, $pattern);

        return ['#^' . $regex . '$#', $params];
    }
}
