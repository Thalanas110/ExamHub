<?php

declare(strict_types=1);

namespace App\Modules\Data\Application;

use App\Shared\Database\RoutineGateway;
use App\Shared\Mapping\ExamMapper;

final class DataService
{
    public function __construct(
        private RoutineGateway $gateway,
        private ExamMapper $mapper,
    ) {
    }

    /**
     * @param array<string, mixed> $authUser
     * @return array<string, mixed>
     */
    public function getAllData(array $authUser): array
    {
        $rowsets = $this->gateway->callMultiMapped(
            'sp_data_for_user',
            [
                (string) ($authUser['role'] ?? ''),
                (string) ($authUser['id'] ?? ''),
            ],
            [
                fn (array $row): array => $this->mapper->mapUserRow($row),
                fn (array $row): array => $this->mapper->mapExamRow($row),
                fn (array $row): array => $this->mapper->mapClassRow($row),
                fn (array $row): array => $this->mapper->mapSubmissionRow($row),
            ],
        );

        return [
            'users' => $rowsets[0] ?? [],
            'exams' => $rowsets[1] ?? [],
            'classes' => $rowsets[2] ?? [],
            'submissions' => $rowsets[3] ?? [],
        ];
    }

    /**
     * @param array<string, mixed> $authUser
     * @return array<string, mixed>
     */
    public function getSummary(array $authUser): array
    {
        $row = $this->gateway->call('sp_data_summary_for_user', [
            (string) ($authUser['role'] ?? ''),
            (string) ($authUser['id'] ?? ''),
        ])[0] ?? [];

        return [
            'role' => (string) ($row['role'] ?? ($authUser['role'] ?? '')),
            'users' => [
                'total' => (int) ($row['totalUsers'] ?? 0),
                'students' => (int) ($row['studentUsers'] ?? 0),
                'teachers' => (int) ($row['teacherUsers'] ?? 0),
                'admins' => (int) ($row['adminUsers'] ?? 0),
            ],
            'exams' => [
                'total' => (int) ($row['totalExams'] ?? 0),
                'draft' => (int) ($row['draftExams'] ?? 0),
                'published' => (int) ($row['publishedExams'] ?? 0),
                'completed' => (int) ($row['completedExams'] ?? 0),
            ],
            'classes' => [
                'total' => (int) ($row['totalClasses'] ?? 0),
                'populated' => (int) ($row['populatedClasses'] ?? 0),
                'empty' => (int) ($row['emptyClasses'] ?? 0),
            ],
            'submissions' => [
                'total' => (int) ($row['totalSubmissions'] ?? 0),
                'pending' => (int) ($row['pendingSubmissions'] ?? 0),
                'graded' => (int) ($row['gradedSubmissions'] ?? 0),
                'averageScore' => (float) ($row['averageScore'] ?? 0),
                'passRate' => (float) ($row['passRate'] ?? 0),
            ],
        ];
    }
}
