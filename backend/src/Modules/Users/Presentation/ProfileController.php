<?php

declare(strict_types=1);

namespace App\Modules\Users\Presentation;

use App\Shared\Http\Request;
use App\Modules\Users\Application\ProfileService;

final class ProfileController
{
    public function __construct(private ProfileService $profileService)
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
            'data' => $this->profileService->getProfile((string) $authUser['id']),
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
            'data' => $this->profileService->updateProfile((string) $authUser['id'], $request->body),
        ];
    }
}
