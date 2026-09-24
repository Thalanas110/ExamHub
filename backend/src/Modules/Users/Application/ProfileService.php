<?php

declare(strict_types=1);

namespace App\Modules\Users\Application;

use App\Modules\Auth\Application\AuthService;

final class ProfileService
{
    public function __construct(private AuthService $authService)
    {
    }

    /**
     * @return array<string, mixed>
     */
    public function getProfile(string $userId): array
    {
        return $this->authService->getProfile($userId);
    }

    /**
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    public function updateProfile(string $userId, array $payload): array
    {
        return $this->authService->updateProfile($userId, $payload);
    }
}
