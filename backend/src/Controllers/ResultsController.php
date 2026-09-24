<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Shared\Http\Request;
use App\Modules\Results\Application\ResultService;
use App\Shared\Support\ApiException;

final class ResultsController
{
    public function __construct(private ResultService $resultService)
    {
    }

    /**
     * @param array<string, mixed> $authUser
     * @return array{status: int, data: array<string, mixed>|array<int, mixed>}
     */
    public function startAttempt(Request $request, array $authUser): array
    {
        return ['status' => 201, 'data' => $this->resultService->startAttempt($authUser, $request->body)];
    }

    /**
     * @param array<string, mixed> $authUser
     * @return array{status: int, data: array<string, mixed>|array<int, mixed>}
     */
    public function submitResult(Request $request, array $authUser): array
    {
        return ['status' => 201, 'data' => $this->resultService->submitResult($authUser, $request->body)];
    }

    /**
     * @param array<string, string> $params
     * @param array<string, mixed> $authUser
     * @return array{status: int, data: array<string, mixed>|array<int, mixed>}
     */
    public function getResultsByStudent(array $params, array $authUser): array
    {
        $studentId = (string) ($params['id'] ?? '');
        if ($studentId === '') {
            throw new ApiException(422, 'Student id is required.');
        }

        return ['status' => 200, 'data' => $this->resultService->getResultsByStudent($authUser, $studentId)];
    }

    /**
     * @param array<string, string> $params
     * @param array<string, mixed> $authUser
     * @return array{status: int, data: array<string, mixed>|array<int, mixed>}
     */
    public function gradeResult(Request $request, array $params, array $authUser): array
    {
        $id = (string) ($params['id'] ?? '');
        if ($id === '') {
            throw new ApiException(422, 'Result id is required.');
        }

        $grades = is_array($request->body['grades'] ?? null) ? $request->body['grades'] : [];
        $feedback = (string) ($request->body['feedback'] ?? '');

        return ['status' => 200, 'data' => $this->resultService->gradeSubmission($authUser, $id, $grades, $feedback)];
    }
}
