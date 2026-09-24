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
        $rowsets = $this->gateway->callMulti('sp_data_for_user', [
            (string) ($authUser['role'] ?? ''),
            (string) ($authUser['id'] ?? ''),
        ]);

        return [
            'users' => array_map(fn (array $row): array => $this->mapper->mapUserRow($row), $rowsets[0] ?? []),
            'exams' => array_map(fn (array $row): array => $this->mapper->mapExamRow($row), $rowsets[1] ?? []),
            'classes' => array_map(fn (array $row): array => $this->mapper->mapClassRow($row), $rowsets[2] ?? []),
            'submissions' => array_map(fn (array $row): array => $this->mapper->mapSubmissionRow($row), $rowsets[3] ?? []),
        ];
    }
}
