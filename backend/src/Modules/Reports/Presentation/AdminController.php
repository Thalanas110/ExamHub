<?php

declare(strict_types=1);

namespace App\Modules\Reports\Presentation;

use App\Logging\AdminLogReadService;
use App\Modules\Reports\Application\ReportService;

final class AdminController
{
    public function __construct(
        private ReportService $reportService,
        private AdminLogReadService $adminLogReadService,
    ) {
    }

    /**
     * @return array{status: int, data: array<string, mixed>|array<int, mixed>}
     */
    public function getAdminExams(): array
    {
        return ['status' => 200, 'data' => $this->reportService->getAdminExams()];
    }

    /**
     * @return array{status: int, data: array<string, mixed>|array<int, mixed>}
     */
    public function getAdminResults(): array
    {
        return ['status' => 200, 'data' => $this->reportService->getAdminResults()];
    }

    /**
     * @return array{status: int, data: array<string, mixed>}
     */
    public function getAdminLogs(): array
    {
        return ['status' => 200, 'data' => $this->adminLogReadService->getLogs()];
    }

    /**
     * @return array{status: int, data: array<string, mixed>}
     */
    public function getAdminViolations(): array
    {
        return ['status' => 200, 'data' => $this->adminLogReadService->getViolationDashboard()];
    }
}
