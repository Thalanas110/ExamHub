<?php

declare(strict_types=1);

namespace App\Modules\Health\Presentation;

final class HealthController
{
    /**
     * @return array{status: int, data: array<string, mixed>|array<int, mixed>}
     */
    public function health(): array
    {
        return [
            'status' => 200,
            'data' => [
                'status' => 'ok',
                'service' => 'Exam System Backend',
            ],
        ];
    }
}
