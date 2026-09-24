<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Shared\Http\Request;
use App\Modules\Users\Application\UserService;
use App\Shared\Support\ApiException;

final class UsersController
{
    public function __construct(private UserService $userService)
    {
    }

    /**
     * @return array{status: int, data: array<string, mixed>|array<int, mixed>}
     */
    public function getUsers(): array
    {
        return ['status' => 200, 'data' => $this->userService->getUsers()];
    }

    /**
     * @return array{status: int, data: array<string, mixed>|array<int, mixed>}
     */
    public function createUser(Request $request): array
    {
        return ['status' => 201, 'data' => $this->userService->createUser($request->body)];
    }

    /**
     * @param array<string, string> $params
     * @return array{status: int, data: array<string, mixed>|array<int, mixed>}
     */
    public function updateUser(Request $request, array $params): array
    {
        $id = (string) ($params['id'] ?? '');
        if ($id === '') {
            throw new ApiException(422, 'User id is required.');
        }

        return ['status' => 200, 'data' => $this->userService->updateUser($id, $request->body)];
    }

    /**
     * @param array<string, string> $params
     * @return array{status: int, data: array<string, mixed>|array<int, mixed>}
     */
    public function deleteUser(array $params): array
    {
        $id = (string) ($params['id'] ?? '');
        if ($id === '') {
            throw new ApiException(422, 'User id is required.');
        }

        $this->userService->deleteUser($id);
        return ['status' => 200, 'data' => ['success' => true]];
    }
}
