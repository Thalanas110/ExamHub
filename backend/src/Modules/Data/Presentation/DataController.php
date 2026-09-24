<?php

declare(strict_types=1);

namespace App\Modules\Data\Presentation;

use App\Shared\Http\Request;
use App\Modules\Data\Application\DataService;
use App\Modules\Data\Application\SeedService;
use App\Shared\Support\ApiException;

final class DataController
{
    private const RESEED_CONFIRMATION_PHRASE = 'RESET TO SEED DATA';

    // constructor property promotion.
    // i found this hilarious, but this is also a good refactor for some
    // reason.
    // 2009 codings
    public function __construct(
        private DataService $dataService,
        private SeedService $seedService,
    ) {
    }

    /**
     * @param array<string, mixed> $authUser
     * @return array{status: int, data: array<string, mixed>|array<int, mixed>}
     */
    public function getAllData(array $authUser): array
    {
        return ['status' => 200, 'data' => $this->dataService->getAllData($authUser)];
    }

    /**
     * @param array<string, mixed> $authUser
     * @return array{status: int, data: array<string, mixed>}
     */
    public function getSummary(array $authUser): array
    {
        return ['status' => 200, 'data' => $this->dataService->getSummary($authUser)];
    }

    /**
     * @return array{status: int, data: array<string, mixed>|array<int, mixed>}
     */
    public function reseedData(Request $request): array
    {
        $this->assertReseedConfirmationPhrase($request->body['confirmationText'] ?? null);
        $this->seedService->reseedData();

        return [
            'status' => 200,
            'data' => [
                'success' => true,
                'message' => 'Database reseeded successfully.',
            ],
        ];
    }

    private function assertReseedConfirmationPhrase(mixed $confirmationText): void
    {
        if (!is_string($confirmationText) || trim($confirmationText) === '') {
            throw new ApiException(
                422,
                sprintf('Type "%s" to confirm reseeding.', self::RESEED_CONFIRMATION_PHRASE),
            );
        }

        if (trim($confirmationText) !== self::RESEED_CONFIRMATION_PHRASE) {
            throw new ApiException(
                422,
                sprintf(
                    'Confirmation text mismatch. Type "%s" exactly to continue.',
                    self::RESEED_CONFIRMATION_PHRASE,
                ),
            );
        }
    }
}
