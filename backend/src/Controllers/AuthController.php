<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Shared\Http\Request;
use App\Modules\Auth\Application\AuthService;

final class AuthController
{
    public function __construct(private AuthService $authService)
    {
    }

    /**
     * @param array<string, mixed>|null $authUser
     * @return array{status: int, data: array<string, mixed>|array<int, mixed>}
     */
    public function register(Request $request, ?array $authUser = null): array
    {
        $result = $this->authService->register($request->body);
        return ['status' => 201, 'data' => $result];
    }

    /**
     * @param array<string, mixed>|null $authUser
     * @return array{status: int, data: array<string, mixed>|array<int, mixed>}
     */
    public function login(Request $request, ?array $authUser = null): array
    {
        $result = $this->authService->login($request->body);
        return ['status' => 200, 'data' => $result];
    }

    /**
     * @return array{status: int, data: array<string, mixed>|array<int, mixed>}
     */
    public function logout(Request $request): array
    {
        $this->authService->logout($request->bearerToken());
        return ['status' => 200, 'data' => ['success' => true]];
    }
}
