<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Modules\Reports\Application\ReportService;

final class ReportsController
{
    public function __construct(private ReportService $reportService)
    {
    }

    /**
     * @param array<string, mixed> $authUser
     * @return array{status: int, data: array<string, mixed>|array<int, mixed>}
     */
    public function getExamPerformance(array $authUser): array
    {
        return ['status' => 200, 'data' => $this->reportService->getExamPerformanceReport($authUser)];
    }

    /**
     * @param array<string, mixed> $authUser
     * @return array{status: int, data: array<string, mixed>|array<int, mixed>}
     */
    public function getPassFail(array $authUser): array
    {
        return ['status' => 200, 'data' => $this->reportService->getPassFailReport($authUser)];
    }

    /**
     * @param array<string, mixed> $authUser
     * @return array{status: int, data: array<string, mixed>|array<int, mixed>}
     */
    public function getQuestionAnalytics(array $authUser): array
    {
        return ['status' => 200, 'data' => $this->reportService->getQuestionAnalyticsReport($authUser)];
    }
}
