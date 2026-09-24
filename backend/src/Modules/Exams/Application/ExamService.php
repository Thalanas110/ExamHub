<?php

declare(strict_types=1);

namespace App\Modules\Exams\Application;

use App\Shared\Database\RoutineGateway;
use App\Services\Support\ExamMapper;
use App\Modules\Exams\Application\ExamPayloadValidator;
use App\Services\StudentExamAccommodationService;
use App\Services\Support\ValueNormalizer;
use App\Shared\Support\ApiException;
use App\Shared\Support\Helpers;

final class ExamService
{
    public function __construct(
        private RoutineGateway $gateway,
        private ExamMapper $mapper,
        private ValueNormalizer $normalizer,
        private ExamPayloadValidator $validator,
        private StudentExamAccommodationService $accommodationService,
    ) {
    }

    /**
     * @param array<string, mixed> $authUser
     * @return array<int, array<string, mixed>>
     */
    public function getExams(array $authUser): array
    {
        $rows = $this->gateway->call('sp_exams_get_for_user', [
            $authUser['role'],
            $authUser['id'],
        ]);

        $exams = array_map(fn (array $row): array => $this->mapper->mapExamRow($row), $rows);
        if (($authUser['role'] ?? '') === 'student') {
            return $this->accommodationService->enrichStudentExams($exams, (string) $authUser['id']);
        }

        return $exams;
    }

    /**
     * @param array<string, mixed> $authUser
     * @return array<string, mixed>
     */
    public function getExamById(array $authUser, string $examId): array
    {
        $rows = $this->gateway->call('sp_exams_get_by_id_for_user', [
            $examId,
            $authUser['role'],
            $authUser['id'],
        ]);

        $row = $rows[0] ?? null;
        if (!is_array($row)) {
            throw new ApiException(404, 'Exam not found.');
        }

        $exam = $this->mapper->mapExamRow($row);
        if (($authUser['role'] ?? '') === 'student') {
            return $this->accommodationService->enrichStudentExam($exam, (string) $authUser['id']);
        }

        return $exam;
    }

    /**
     * @param array<string, mixed> $authUser
     * @return array<int, array<string, mixed>>
     */
    public function getExamAccommodations(array $authUser, string $examId): array
    {
        return $this->accommodationService->getExamAccommodations($authUser, $examId);
    }

    /**
     * @param array<string, mixed> $authUser
     * @return array<string, mixed>
     */
    public function getExamAccommodation(array $authUser, string $examId, string $studentId): array
    {
        return $this->accommodationService->getExamAccommodation($authUser, $examId, $studentId);
    }

    /**
     * @param array<string, mixed> $authUser
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    public function upsertExamAccommodation(array $authUser, string $examId, string $studentId, array $payload): array
    {
        return $this->accommodationService->upsertExamAccommodation($authUser, $examId, $studentId, $payload);
    }

    /**
     * @param array<string, mixed> $authUser
     */
    public function deleteExamAccommodation(array $authUser, string $examId, string $studentId): void
    {
        $this->accommodationService->deleteExamAccommodation($authUser, $examId, $studentId);
    }

    /**
     * @param array<string, mixed> $authUser
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    public function createExam(array $authUser, array $payload): array
    {
        $validated = $this->validator->validateAndBuild($payload);
        $examId = $this->resolveExamId($payload);
        $teacherId = $this->resolveTeacherId($authUser, $payload);

        $rows = $this->gateway->call('sp_exams_create', [
            $examId,
            $validated['title'],
            $validated['description'],
            $validated['classId'],
            $teacherId,
            $validated['duration'],
            $validated['totalMarks'],
            $validated['passingMarks'],
            $validated['startDate'],
            $validated['endDate'],
            $validated['status'],
            $this->encodeQuestions($validated['questions']),
            $this->normalizer->normalizeDate((string) ($payload['createdAt'] ?? date('Y-m-d')), false),
        ]);

        $row = $rows[0] ?? null;
        if (!is_array($row)) {
            throw new ApiException(500, 'Exam creation failed.');
        }

        return $this->mapper->mapExamRow($row);
    }

    /**
     * @param array<string, mixed> $authUser
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    public function updateExam(array $authUser, string $examId, array $payload): array
    {
        $rows = $this->gateway->call('sp_exams_get_by_id', [$examId]);
        $row = $rows[0] ?? null;
        if (!is_array($row)) {
            throw new ApiException(404, 'Exam not found.');
        }

        $existing = $this->mapper->mapExamRow($row);

        if ($authUser['role'] === 'teacher' && $existing['teacherId'] !== $authUser['id']) {
            throw new ApiException(403, 'Teachers can only update their own exams.');
        }

        $validated = $this->validator->validateAndBuild($payload, $existing);
        $teacherId = $this->resolveTeacherId($authUser, $payload, $existing);

        $updatedRows = $this->gateway->call('sp_exams_update', [
            $examId,
            $validated['title'],
            $validated['description'],
            $validated['classId'],
            $teacherId,
            $validated['duration'],
            $validated['totalMarks'],
            $validated['passingMarks'],
            $validated['startDate'],
            $validated['endDate'],
            $validated['status'],
            $this->encodeQuestions($validated['questions']),
        ]);

        $updatedRow = $updatedRows[0] ?? null;
        if (!is_array($updatedRow)) {
            throw new ApiException(500, 'Exam update failed.');
        }

        return $this->mapper->mapExamRow($updatedRow);
    }

    /**
     * @param array<string, mixed> $authUser
     */
    public function deleteExam(array $authUser, string $examId): void
    {
        $rows = $this->gateway->call('sp_exams_get_by_id', [$examId]);
        $row = $rows[0] ?? null;
        if (!is_array($row)) {
            throw new ApiException(404, 'Exam not found.');
        }

        $exam = $this->mapper->mapExamRow($row);
        if ($authUser['role'] === 'teacher' && $exam['teacherId'] !== $authUser['id']) {
            throw new ApiException(403, 'Teachers can only delete their own exams.');
        }

        $this->gateway->call('sp_exams_delete', [$examId]);
    }

    /**
     * @param array<string, mixed> $payload
     */
    private function resolveExamId(array $payload): string
    {
        $examId = trim((string) ($payload['id'] ?? Helpers::uuidV4()));
        return $examId === '' ? Helpers::uuidV4() : $examId;
    }

    /**
     * @param array<string, mixed> $authUser
     * @param array<string, mixed> $payload
     * @param array<string, mixed>|null $existing
     */
    private function resolveTeacherId(array $authUser, array $payload, ?array $existing = null): string
    {
        if (($authUser['role'] ?? '') === 'teacher') {
            return (string) $authUser['id'];
        }

        $fallback = $existing['teacherId'] ?? ($authUser['id'] ?? '');
        $teacherId = trim((string) ($payload['teacherId'] ?? $fallback));
        if ($teacherId === '') {
            throw new ApiException(422, 'teacherId is required.');
        }

        return $teacherId;
    }

    /**
     * @param array<int, array<string, mixed>> $questions
     */
    private function encodeQuestions(array $questions): string
    {
        $encoded = json_encode($questions, JSON_UNESCAPED_UNICODE);
        if (!is_string($encoded)) {
            throw new ApiException(500, 'Unable to encode exam questions.');
        }

        return $encoded;
    }
}

