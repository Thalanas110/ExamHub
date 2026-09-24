<?php

declare(strict_types=1);

namespace App\Modules\Reports\Application;

use App\Shared\Database\RoutineGateway;
use App\Services\Support\QuestionAnalyticsBuilder;
use App\Services\Support\ExamMapper;
use App\Services\DataService;

final class ReportService
{
    public function __construct(
        private RoutineGateway $gateway,
        private ExamMapper $mapper,
        private DataService $dataService,
        private QuestionAnalyticsBuilder $questionAnalyticsBuilder,
    ) {
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function getAdminExams(): array
    {
        $rows = $this->gateway->call('sp_admin_get_exams_overview');
        $result = [];

        foreach ($rows as $row) {
            $mapped = $this->mapper->mapExamRow($row);
            $mapped['submissionCount'] = (int) ($row['submissionCount'] ?? 0);
            $mapped['averageScore'] = (float) ($row['averageScore'] ?? 0);
            $result[] = $mapped;
        }

        return $result;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function getAdminResults(): array
    {
        $rows = $this->gateway->call('sp_admin_get_results_overview');
        $result = [];

        foreach ($rows as $row) {
            $mapped = $this->mapper->mapSubmissionRow($row);
            $mapped['studentName'] = (string) ($row['studentName'] ?? 'Unknown');
            $mapped['examTitle'] = (string) ($row['examTitle'] ?? 'Unknown');
            $result[] = $mapped;
        }

        return $result;
    }

    /**
     * @param array<string, mixed> $authUser
     * @return array<int, array<string, mixed>>
     */
    public function getExamPerformanceReport(array $authUser): array
    {
        $rows = $this->gateway->call('sp_reports_exam_performance', [
            $authUser['role'],
            $authUser['id'],
        ]);

        return array_map(static fn (array $row): array => [
            'examId' => (string) ($row['examId'] ?? ''),
            'examTitle' => (string) ($row['examTitle'] ?? ''),
            'classId' => (string) ($row['classId'] ?? ''),
            'className' => (string) ($row['className'] ?? ''),
            'totalSubmissions' => (int) ($row['totalSubmissions'] ?? 0),
            'averageScore' => (float) ($row['averageScore'] ?? 0),
            'highestScore' => (float) ($row['highestScore'] ?? 0),
            'lowestScore' => (float) ($row['lowestScore'] ?? 0),
            'passCount' => (int) ($row['passCount'] ?? 0),
            'failCount' => (int) ($row['failCount'] ?? 0),
        ], $rows);
    }

    /**
     * @param array<string, mixed> $authUser
     * @return array<string, mixed>
     */
    public function getPassFailReport(array $authUser): array
    {
        $rowsets = $this->gateway->callMulti('sp_reports_pass_fail', [
            $authUser['role'],
            $authUser['id'],
        ]);

        $overallRow = $rowsets[0][0] ?? [
            'total' => 0,
            'passed' => 0,
            'failed' => 0,
            'passRate' => 0,
        ];

        $byExam = $rowsets[1] ?? [];
        $byClass = $rowsets[2] ?? [];

        return [
            'overall' => [
                'total' => (int) ($overallRow['total'] ?? 0),
                'passed' => (int) ($overallRow['passed'] ?? 0),
                'failed' => (int) ($overallRow['failed'] ?? 0),
                'passRate' => (float) ($overallRow['passRate'] ?? 0),
            ],
            'byExam' => array_map(static fn (array $row): array => [
                'examId' => (string) ($row['examId'] ?? ''),
                'examTitle' => (string) ($row['examTitle'] ?? ''),
                'passed' => (int) ($row['passed'] ?? 0),
                'failed' => (int) ($row['failed'] ?? 0),
                'passRate' => (float) ($row['passRate'] ?? 0),
            ], $byExam),
            'byClass' => array_map(static fn (array $row): array => [
                'classId' => (string) ($row['classId'] ?? ''),
                'className' => (string) ($row['className'] ?? ''),
                'passed' => (int) ($row['passed'] ?? 0),
                'failed' => (int) ($row['failed'] ?? 0),
                'passRate' => (float) ($row['passRate'] ?? 0),
            ], $byClass),
        ];
    }

    /**
     * @param array<string, mixed> $authUser
     * @return array<string, mixed>
     */
    public function getQuestionAnalyticsReport(array $authUser): array
    {
        $scopedData = $this->dataService->getAllData($authUser);
        $metricRows = $this->gateway->call('sp_submission_question_metrics_get_all');

        return $this->questionAnalyticsBuilder->build(
            authUser: $authUser,
            exams: is_array($scopedData['exams'] ?? null) ? $scopedData['exams'] : [],
            classes: is_array($scopedData['classes'] ?? null) ? $scopedData['classes'] : [],
            submissions: is_array($scopedData['submissions'] ?? null) ? $scopedData['submissions'] : [],
            questionMetrics: $metricRows,
        );
    }
}
