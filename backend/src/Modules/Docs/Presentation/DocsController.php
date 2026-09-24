<?php

declare(strict_types=1);

namespace App\Modules\Docs\Presentation;

use App\Modules\Docs\Application\ApiDocsVerificationService;

final class DocsController
{
    public function __construct(private ApiDocsVerificationService $verificationService)
    {
    }

    /**
     * @return array{status: int, data: array<string, mixed>|array<int, mixed>}
     */
    public function verify(): array
    {
        return [
            'status' => 200,
            'data' => $this->verificationService->verifyRequiredEndpoints(),
        ];
    }

}
