<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Shared\Http\Request;
use App\Services\AuthService;

final class ProfileController
{
    public function __construct(private AuthService $authService)
    {
    }

    /**
     * @param array<string, mixed> $authUser
     * @return array{status: int, data: array<string, mixed>|array<int, mixed>}
     */
    public function getProfile(array $authUser): array
    {
        return [
            'status' => 200,
            'data' => $this->authService->getProfile((string) $authUser['id']),
        ];
    }

    /**
     * @param array<string, mixed> $authUser
     * @return array{status: int, data: array<string, mixed>|array<int, mixed>}
     */
    public function updateProfile(Request $request, array $authUser): array
    {
        return [
            'status' => 200,
            'data' => $this->authService->updateProfile((string) $authUser['id'], $request->body),
        ];
    }
}
