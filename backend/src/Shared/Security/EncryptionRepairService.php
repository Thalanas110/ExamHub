<?php

declare(strict_types=1);

namespace App\Shared\Security;

use App\Shared\Database\RoutineGateway;
use App\Shared\Security\LegacyEncryptedDataRepair;

final class EncryptionRepairService
{
    public function __construct(
        private RoutineGateway $gateway,
        private LegacyEncryptedDataRepair $repair,
    ) {
    }

    /**
     * @return array<string, int>
     */
    public function repairLegacyRecords(): array
    {
        $usersRepaired = 0;
        $submissionsRepaired = 0;

        foreach ($this->gateway->call('sp_encryption_get_legacy_users') as $row) {
            $migrated = $this->repair->migrateUserRow($row);
            $this->gateway->call('sp_encryption_repair_user', [
                (string) ($row['id'] ?? ''),
                $migrated['departmentCiphertext'] ?? null,
                $migrated['departmentIv'] ?? null,
                $migrated['departmentTag'] ?? null,
                $migrated['departmentEnc'] ?? null,
                $migrated['phoneCiphertext'] ?? null,
                $migrated['phoneIv'] ?? null,
                $migrated['phoneTag'] ?? null,
                $migrated['phoneEnc'] ?? null,
                $migrated['bioCiphertext'] ?? null,
                $migrated['bioIv'] ?? null,
                $migrated['bioTag'] ?? null,
                $migrated['bioEnc'] ?? null,
            ]);
            $usersRepaired++;
        }

        foreach ($this->gateway->call('sp_encryption_get_legacy_submissions') as $row) {
            $migrated = $this->repair->migrateSubmissionRow($row);
            $this->gateway->call('sp_encryption_repair_submission', [
                (string) ($row['id'] ?? ''),
                $migrated['answers'] ?? '[]',
                $migrated['feedbackCiphertext'] ?? null,
                $migrated['feedbackIv'] ?? null,
                $migrated['feedbackTag'] ?? null,
                $migrated['feedbackEnc'] ?? null,
            ]);
            $submissionsRepaired++;
        }

        return [
            'usersRepaired' => $usersRepaired,
            'submissionsRepaired' => $submissionsRepaired,
        ];
    }
}
