<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Shared\Http\Request;
use App\Services\ExamService;
use App\Shared\Support\ApiException;

final class ExamsController
{
    /*
    public function __construct($examService)
    {
        $this->examService = $examService;
    }
    */
    public function __construct(private ExamService $examService)
    {
    }

    /**
     * @param array<string, mixed> $authUser
     * @return array{status: int, data: array<string, mixed>|array<int, mixed>}
     */
    public function getExams(array $authUser): array
    {
        return ['status' => 200, 'data' => $this->examService->getExams($authUser)];
    }

    /**
     * @param array<string, mixed> $authUser
     * @return array{status: int, data: array<string, mixed>|array<int, mixed>}
     */
    public function createExam(Request $request, array $authUser): array
    {
        return ['status' => 201, 'data' => $this->examService->createExam($authUser, $request->body)];
    }

    /**
     * @param array<string, string> $params
     * @param array<string, mixed> $authUser
     * @return array{status: int, data: array<string, mixed>|array<int, mixed>}
     */
    public function getExamById(array $params, array $authUser): array
    {
        $id = (string) ($params['id'] ?? '');
        if ($id === '') {
            throw new ApiException(422, 'Exam id is required.');
        }

        return ['status' => 200, 'data' => $this->examService->getExamById($authUser, $id)];
    }

    /**
     * @param array<string, string> $params
     * @param array<string, mixed> $authUser
     * @return array{status: int, data: array<string, mixed>|array<int, mixed>}
     */
    public function getExamAccommodations(array $params, array $authUser): array
    {
        $id = (string) ($params['id'] ?? '');
        if ($id === '') {
            throw new ApiException(422, 'Exam id is required.');
        }

        return ['status' => 200, 'data' => $this->examService->getExamAccommodations($authUser, $id)];
    }

    /**
     * @param array<string, string> $params
     * @param array<string, mixed> $authUser
     * @return array{status: int, data: array<string, mixed>|array<int, mixed>}
     */
    public function getExamAccommodation(array $params, array $authUser): array
    {
        $id = (string) ($params['id'] ?? '');
        $studentId = (string) ($params['studentId'] ?? '');
        if ($id === '' || $studentId === '') {
            throw new ApiException(422, 'Exam id and studentId are required.');
        }

        return ['status' => 200, 'data' => $this->examService->getExamAccommodation($authUser, $id, $studentId)];
    }

    /**
     * @param array<string, string> $params
     * @param array<string, mixed> $authUser
     * @return array{status: int, data: array<string, mixed>|array<int, mixed>}
     */
    public function upsertExamAccommodation(Request $request, array $params, array $authUser): array
    {
        $id = (string) ($params['id'] ?? '');
        $studentId = (string) ($params['studentId'] ?? '');
        if ($id === '' || $studentId === '') {
            throw new ApiException(422, 'Exam id and studentId are required.');
        }

        return ['status' => 200, 'data' => $this->examService->upsertExamAccommodation($authUser, $id, $studentId, $request->body)];
    }

    /**
     * @param array<string, string> $params
     * @param array<string, mixed> $authUser
     * @return array{status: int, data: array<string, mixed>|array<int, mixed>}
     */
    public function deleteExamAccommodation(array $params, array $authUser): array
    {
        $id = (string) ($params['id'] ?? '');
        $studentId = (string) ($params['studentId'] ?? '');
        if ($id === '' || $studentId === '') {
            throw new ApiException(422, 'Exam id and studentId are required.');
        }

        $this->examService->deleteExamAccommodation($authUser, $id, $studentId);
        return ['status' => 200, 'data' => ['success' => true]];
    }

    /**
     * @param array<string, string> $params
     * @param array<string, mixed> $authUser
     * @return array{status: int, data: array<string, mixed>|array<int, mixed>}
     */
    public function updateExam(Request $request, array $params, array $authUser): array
    {
        $id = (string) ($params['id'] ?? '');
        if ($id === '') {
            throw new ApiException(422, 'Exam id is required.');
        }

        return ['status' => 200, 'data' => $this->examService->updateExam($authUser, $id, $request->body)];
    }

    /**
     * @param array<string, string> $params
     * @param array<string, mixed> $authUser
     * @return array{status: int, data: array<string, mixed>|array<int, mixed>}
     */
    public function deleteExam(array $params, array $authUser): array
    {
        $id = (string) ($params['id'] ?? '');
        if ($id === '') {
            throw new ApiException(422, 'Exam id is required.');
        }

        $this->examService->deleteExam($authUser, $id);
        return ['status' => 200, 'data' => ['success' => true]];
    }
}
