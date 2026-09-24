<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Shared\Http\Request;
use App\Modules\Classes\Application\ClassService;
use App\Shared\Support\ApiException;

final class ClassesController
{
    public function __construct(private ClassService $classService)
    {
    }

    /**
     * @return array{status: int, data: array<string, mixed>|array<int, mixed>}
     */
    public function getClasses(): array
    {
        return ['status' => 200, 'data' => $this->classService->getClasses()];
    }

    /**
     * @param array<string, mixed> $authUser
     * @return array{status: int, data: array<string, mixed>|array<int, mixed>}
     */
    public function createClass(Request $request, array $authUser): array
    {
        return ['status' => 201, 'data' => $this->classService->createClass($authUser, $request->body)];
    }

    /**
     * @param array<string, string> $params
     * @param array<string, mixed> $authUser
     * @return array{status: int, data: array<string, mixed>|array<int, mixed>}
     */
    public function updateClass(Request $request, array $params, array $authUser): array
    {
        $id = (string) ($params['id'] ?? '');
        if ($id === '') {
            throw new ApiException(422, 'Class id is required.');
        }

        return ['status' => 200, 'data' => $this->classService->updateClass($authUser, $id, $request->body)];
    }

    /**
     * @param array<string, string> $params
     * @param array<string, mixed> $authUser
     * @return array{status: int, data: array<string, mixed>|array<int, mixed>}
     */
    public function deleteClass(array $params, array $authUser): array
    {
        $id = (string) ($params['id'] ?? '');
        if ($id === '') {
            throw new ApiException(422, 'Class id is required.');
        }

        $this->classService->deleteClass($authUser, $id);
        return ['status' => 200, 'data' => ['success' => true]];
    }

    /**
     * @param array<string, mixed> $authUser
     * @return array{status: int, data: array<string, mixed>|array<int, mixed>}
     */
    public function joinClass(Request $request, array $authUser): array
    {
        $code = trim((string) ($request->body['code'] ?? ''));
        if ($code === '') {
            throw new ApiException(422, 'Class code is required.');
        }

        return ['status' => 200, 'data' => $this->classService->joinClass((string) $authUser['id'], $code)];
    }

    /**
     * @param array<string, string> $params
     * @param array<string, mixed> $authUser
     * @return array{status: int, data: array<string, mixed>|array<int, mixed>}
     */
    public function leaveClass(array $params, array $authUser): array
    {
        $id = (string) ($params['id'] ?? '');
        if ($id === '') {
            throw new ApiException(422, 'Class id is required.');
        }

        return ['status' => 200, 'data' => $this->classService->leaveClass($id, (string) $authUser['id'])];
    }

    /**
     * @param array<string, string> $params
     * @param array<string, mixed> $authUser
     * @return array{status: int, data: array<string, mixed>|array<int, mixed>}
     */
    public function enrollStudent(Request $request, array $params, array $authUser): array
    {
        $classId = (string) ($params['id'] ?? '');
        $studentId = trim((string) ($request->body['studentId'] ?? ''));

        if ($classId === '' || $studentId === '') {
            throw new ApiException(422, 'classId and studentId are required.');
        }

        return ['status' => 200, 'data' => $this->classService->enrollStudent($authUser, $classId, $studentId)];
    }

    /**
     * @param array<string, string> $params
     * @param array<string, mixed> $authUser
     * @return array{status: int, data: array<string, mixed>|array<int, mixed>}
     */
    public function removeStudent(array $params, array $authUser): array
    {
        $classId = (string) ($params['id'] ?? '');
        $studentId = (string) ($params['studentId'] ?? '');

        if ($classId === '' || $studentId === '') {
            throw new ApiException(422, 'classId and studentId are required.');
        }

        return ['status' => 200, 'data' => $this->classService->removeStudent($authUser, $classId, $studentId)];
    }
}
