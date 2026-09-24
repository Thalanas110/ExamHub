<?php

declare(strict_types=1);

namespace App\Modules\Docs\Application;

final class ApiDocsVerificationService
{
    /**
     * @var array<int, array{group: string, method: string, path: string}>
     */
    private const REQUIRED_ENDPOINTS = [
        ['group' => 'Auth', 'method' => 'POST', 'path' => '/api/auth/register'],
        ['group' => 'Auth', 'method' => 'POST', 'path' => '/api/auth/login'],
        ['group' => 'Profile & User Management', 'method' => 'GET', 'path' => '/api/users/profile'],
        ['group' => 'Profile & User Management', 'method' => 'PUT', 'path' => '/api/users/profile'],
        ['group' => 'Exams', 'method' => 'POST', 'path' => '/api/exams'],
        ['group' => 'Exams', 'method' => 'GET', 'path' => '/api/exams'],
        ['group' => 'Exams', 'method' => 'GET', 'path' => '/api/exams/{exam_id}'],
        ['group' => 'Results', 'method' => 'POST', 'path' => '/api/results/submit'],
        ['group' => 'Results', 'method' => 'GET', 'path' => '/api/results/student/{student_id}'],
        ['group' => 'Admin & Reporting', 'method' => 'GET', 'path' => '/api/admin/exams'],
        ['group' => 'Admin & Reporting', 'method' => 'GET', 'path' => '/api/admin/results'],
        ['group' => 'Admin & Reporting', 'method' => 'GET', 'path' => '/api/reports/exam-performance'],
        ['group' => 'Admin & Reporting', 'method' => 'GET', 'path' => '/api/reports/pass-fail'],
    ];

    /**
     * @return array<string, mixed>
     */
    public function verifyRequiredEndpoints(): array
    {
        $indexedRoutes = $this->indexRegisteredRoutes();
        $checks = [];
        $matched = 0;

        foreach (self::REQUIRED_ENDPOINTS as $required) {
            $routeKey = $this->routeKey($required['method'], $required['path']);
            $match = $indexedRoutes[$routeKey] ?? null;
            $exists = $match !== null;

            if ($exists) {
                $matched++;
            }

            $checks[] = [
                'group' => $required['group'],
                'method' => $required['method'],
                'path' => $required['path'],
                'exists' => $exists,
                'matchedRoute' => $exists ? $match['path'] : null,
                'canonicalPath' => $this->normalizePath($required['path']),
                'sourceFile' => $exists ? $match['sourceFile'] : null,
            ];
        }

        return [
            'generatedAt' => gmdate('c'),
            'summary' => [
                'required' => count(self::REQUIRED_ENDPOINTS),
                'matched' => $matched,
                'missing' => count(self::REQUIRED_ENDPOINTS) - $matched,
            ],
            'checks' => $checks,
        ];
    }

    /**
     * @return array<string, array{method: string, path: string, sourceFile: string}>
     */
    private function indexRegisteredRoutes(): array
    {
        $routes = [];
        foreach ($this->routeFiles() as $filePath) {
            $lines = file($filePath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            if (!is_array($lines)) {
                continue;
            }

            foreach ($lines as $line) {
                $match = [];
                if (preg_match("/->add\(\s*'([A-Z]+)'\s*,\s*'([^']+)'/", $line, $match) !== 1) {
                    continue;
                }

                $method = strtoupper((string) ($match[1] ?? ''));
                $path = (string) ($match[2] ?? '');
                if ($method === '' || $path === '') {
                    continue;
                }

                $key = $this->routeKey($method, $path);
                $routes[$key] = [
                    'method' => $method,
                    'path' => $path,
                    'sourceFile' => basename($filePath),
                ];
            }
        }

        return $routes;
    }

    /**
     * @return array<int, string>
     */
    private function routeFiles(): array
    {
        $directory = dirname(__DIR__, 3) . '/Routing/Routes';
        $files = glob($directory . '/*Routes.php');
        if (!is_array($files)) {
            return [];
        }

        sort($files);
        return $files;
    }

    private function routeKey(string $method, string $path): string
    {
        return strtoupper($method) . ' ' . $this->normalizePath($path);
    }

    private function normalizePath(string $path): string
    {
        $normalized = trim($path);
        if ($normalized === '') {
            return '/';
        }

        if (str_starts_with($normalized, '/api/')) {
            $normalized = substr($normalized, 4);
        }

        if ($normalized === '') {
            $normalized = '/';
        }

        $normalized = preg_replace('/:[a-zA-Z_][a-zA-Z0-9_]*/', '{param}', $normalized) ?? $normalized;
        $normalized = preg_replace('/\{[a-zA-Z_][a-zA-Z0-9_]*\}/', '{param}', $normalized) ?? $normalized;
        return $normalized;
    }
}
