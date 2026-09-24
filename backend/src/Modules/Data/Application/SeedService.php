<?php

declare(strict_types=1);

namespace App\Modules\Data\Application;

use App\Shared\Config\AppConfig;
use App\Shared\Database\RoutineGateway;
use App\Shared\Security\AesGcmCrypto;
use App\Shared\Security\PasswordHasher;
use App\Shared\Support\ApiException;

final class SeedService
{
    private const ADMIN_ID = '11111111-1111-4111-8111-111111111111';
    private const TEACHER_ID = '22222222-2222-4222-8222-222222222222';
    private const STUDENT_ID = '33333333-3333-4333-8333-333333333333';

    public function __construct(
        private AppConfig $config,
        private RoutineGateway $gateway,
        private AesGcmCrypto $crypto,
        private PasswordHasher $passwordHasher,
    ) {
    }

    public function bootstrap(): void
    {
        $existingUsers = $this->gateway->call('sp_users_get_all');
        if ($existingUsers !== []) {
            return;
        }

        if (!$this->hasSeedCredentialsConfigured()) {
            throw new ApiException(
                500,
                'Seed credentials are missing. Configure SEED_ADMIN_*, SEED_TEACHER_*, and SEED_STUDENT_* in backend/.env.',
            );
        }

        $this->seedCoreAccounts();
    }

    public function reseedData(): void
    {
        if (!$this->hasSeedCredentialsConfigured()) {
            throw new ApiException(
                500,
                'Reseed is blocked because seed credentials are missing in backend/.env.',
            );
        }

        $this->gateway->call('sp_data_reset');
        $this->bootstrap();
    }

    private function seedCoreAccounts(): void
    {
        [$adminDepartmentCiphertext, $adminDepartmentIv, $adminDepartmentTag] = $this->crypto->encryptParams($this->config->seedAdminDepartment);
        [$teacherDepartmentCiphertext, $teacherDepartmentIv, $teacherDepartmentTag] = $this->crypto->encryptParams($this->config->seedTeacherDepartment);
        [$studentDepartmentCiphertext, $studentDepartmentIv, $studentDepartmentTag] = $this->crypto->encryptParams($this->config->seedStudentDepartment);

        $this->gateway->call('sp_seed_core_accounts', [
            self::ADMIN_ID,
            $this->config->seedAdminName,
            strtolower($this->config->seedAdminEmail),
            $this->passwordHasher->hash($this->config->seedAdminPassword),
            $adminDepartmentCiphertext,
            $adminDepartmentIv,
            $adminDepartmentTag,
            null,
            self::TEACHER_ID,
            $this->config->seedTeacherName,
            strtolower($this->config->seedTeacherEmail),
            $this->passwordHasher->hash($this->config->seedTeacherPassword),
            $teacherDepartmentCiphertext,
            $teacherDepartmentIv,
            $teacherDepartmentTag,
            null,
            self::STUDENT_ID,
            $this->config->seedStudentName,
            strtolower($this->config->seedStudentEmail),
            $this->passwordHasher->hash($this->config->seedStudentPassword),
            $studentDepartmentCiphertext,
            $studentDepartmentIv,
            $studentDepartmentTag,
            null,
            date('Y-m-d'),
        ]);
    }

    private function hasSeedCredentialsConfigured(): bool
    {
        return
            trim($this->config->seedAdminEmail) !== '' &&
            trim($this->config->seedAdminPassword) !== '' &&
            trim($this->config->seedTeacherEmail) !== '' &&
            trim($this->config->seedTeacherPassword) !== '' &&
            trim($this->config->seedStudentEmail) !== '' &&
            trim($this->config->seedStudentPassword) !== '';
    }
}
