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
        $rowsets = $this->gateway->callMulti('sp_data_all');

        $users = array_map(fn (array $row): array => $this->mapper->mapUserRow($row), $rowsets[0] ?? []);
        $exams = array_map(fn (array $row): array => $this->mapper->mapExamRow($row), $rowsets[1] ?? []);
        $classes = array_map(fn (array $row): array => $this->mapper->mapClassRow($row), $rowsets[2] ?? []);
        $submissions = array_map(fn (array $row): array => $this->mapper->mapSubmissionRow($row), $rowsets[3] ?? []);

        if ($authUser['role'] === 'admin') {
            return [
                'users' => $users,
                'exams' => $exams,
                'classes' => $classes,
                'submissions' => $submissions,
            ];
        }

        if ($authUser['role'] === 'teacher') {
            $teacherId = (string) $authUser['id'];
            $classes = array_values(array_filter($classes, static fn (array $class): bool => $class['teacherId'] === $teacherId));
            $classIds = array_flip(array_map(static fn (array $class): string => $class['id'], $classes));
            $exams = array_values(array_filter($exams, static fn (array $exam): bool =>
                $exam['teacherId'] === $teacherId || isset($classIds[$exam['classId']])
            ));

            $examIds = array_flip(array_map(static fn (array $exam): string => $exam['id'], $exams));
            $submissions = array_values(array_filter($submissions, static fn (array $submission): bool => isset($examIds[$submission['examId']])));

            // Include all students (so teachers can look up any student by email for enrollment)
            // plus the teacher themselves. Other teachers/admins are excluded.
            $users = array_values(array_filter($users, static fn (array $user): bool =>
                ($user['role'] ?? '') === 'student' || (string) $user['id'] === $teacherId
            ));

            return [
                'users' => $users,
                'exams' => $exams,
                'classes' => $classes,
                'submissions' => $submissions,
            ];
        }

        $studentId = (string) $authUser['id'];
        $classes = array_values(array_filter($classes, static fn (array $class): bool => in_array($studentId, $class['studentIds'], true)));
        $classIds = array_flip(array_map(static fn (array $class): string => $class['id'], $classes));
        $exams = array_values(array_filter($exams, static fn (array $exam): bool => isset($classIds[$exam['classId']])));
        $examIds = array_flip(array_map(static fn (array $exam): string => $exam['id'], $exams));

        $submissions = array_values(array_filter(
            $submissions,
            static fn (array $submission): bool =>
                $submission['studentId'] === $studentId || isset($examIds[$submission['examId']]),
        ));

        $allowedUserIds = [$studentId => true];
        foreach ($classes as $class) {
            $allowedUserIds[$class['teacherId']] = true;
        }

        foreach ($users as $user) {
            if (($user['role'] ?? '') === 'admin') {
                $allowedUserIds[$user['id']] = true;
            }
        }

        $users = array_values(array_filter($users, static fn (array $user): bool => isset($allowedUserIds[$user['id']])));

        return [
            'users' => $users,
            'exams' => $exams,
            'classes' => $classes,
            'submissions' => $submissions,
        ];
    }
}
