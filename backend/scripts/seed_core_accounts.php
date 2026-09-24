<?php

declare(strict_types=1);

use App\Shared\Config\AppConfig;
use App\Shared\Config\Env;
use App\Shared\Database\DbConnection;
use App\Shared\Database\RoutineGateway;
use App\Shared\Security\AesGcmCrypto;
use App\Shared\Security\PasswordHasher;

require_once __DIR__ . '/../bootstrap/autoload.php';

const DEMO_ADMIN_ID = '11111111-1111-4111-8111-111111111111';
const DEMO_TEACHER_ID = '22222222-2222-4222-8222-222222222222';
const DEMO_STUDENT_ID = '33333333-3333-4333-8333-333333333333';

try {
    $config = AppConfig::fromEnv(new Env(__DIR__ . '/../.env'));
    $gateway = new RoutineGateway((new DbConnection($config))->pdo());
    $crypto = new AesGcmCrypto($config->encryptionKey);
    $passwordHasher = new PasswordHasher();

    [$adminDepartmentCiphertext, $adminDepartmentIv, $adminDepartmentTag] = $crypto->encryptParams($config->seedAdminDepartment);
    [$teacherDepartmentCiphertext, $teacherDepartmentIv, $teacherDepartmentTag] = $crypto->encryptParams($config->seedTeacherDepartment);
    [$studentDepartmentCiphertext, $studentDepartmentIv, $studentDepartmentTag] = $crypto->encryptParams($config->seedStudentDepartment);

    $gateway->call('sp_seed_core_accounts', [
        DEMO_ADMIN_ID,
        $config->seedAdminName,
        strtolower($config->seedAdminEmail),
        $passwordHasher->hash($config->seedAdminPassword),
        $adminDepartmentCiphertext,
        $adminDepartmentIv,
        $adminDepartmentTag,
        null,
        DEMO_TEACHER_ID,
        $config->seedTeacherName,
        strtolower($config->seedTeacherEmail),
        $passwordHasher->hash($config->seedTeacherPassword),
        $teacherDepartmentCiphertext,
        $teacherDepartmentIv,
        $teacherDepartmentTag,
        null,
        DEMO_STUDENT_ID,
        $config->seedStudentName,
        strtolower($config->seedStudentEmail),
        $passwordHasher->hash($config->seedStudentPassword),
        $studentDepartmentCiphertext,
        $studentDepartmentIv,
        $studentDepartmentTag,
        null,
        date('Y-m-d'),
    ]);

    fwrite(STDOUT, "Configured core accounts seeded.\n");
} catch (Throwable $throwable) {
    fwrite(STDERR, "FAIL: {$throwable->getMessage()}\n");
    exit(1);
}
