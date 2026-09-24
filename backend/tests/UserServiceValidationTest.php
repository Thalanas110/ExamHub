<?php

declare(strict_types=1);

require_once __DIR__ . '/../bootstrap/autoload.php';

use App\Shared\Config\AppConfig;
use App\Shared\Config\Env;
use App\Shared\Database\DbConnection;
use App\Shared\Database\RoutineGateway;
use App\Shared\Security\AesGcmCrypto;
use App\Shared\Security\PasswordHasher;
use App\Modules\Data\Application\SeedService;
use App\Services\Support\ExamMapper;
use App\Shared\Support\ValueNormalizer;
use App\Modules\Users\Application\UserService;
use App\Shared\Support\ApiException;

$failures = [];
$config = AppConfig::fromEnv(new Env(__DIR__ . '/../.env'));
$pdo = (new DbConnection($config))->pdo();
$gateway = new RoutineGateway($pdo);
$crypto = new AesGcmCrypto($config->encryptionKey);
$passwordHasher = new PasswordHasher();
$normalizer = new ValueNormalizer();
$mapper = new ExamMapper($crypto, $normalizer);
$seedService = new SeedService($config, $gateway, $crypto, $passwordHasher);
$seedService->bootstrap();
$service = new UserService($gateway, $crypto, $passwordHasher, $mapper, $normalizer);

/**
 * @param callable(): void $callback
 */
function expectApiFailure(callable $callback, int $expectedStatus, string $expectedMessagePart, string $label, array &$failures): void
{
    try {
        $callback();
        $failures[] = sprintf('%s: expected ApiException %d.', $label, $expectedStatus);
    } catch (ApiException $exception) {
        if ($exception->status !== $expectedStatus) {
            $failures[] = sprintf(
                '%s: expected status %d but got %d.',
                $label,
                $expectedStatus,
                $exception->status,
            );
        }

        if (!str_contains($exception->getMessage(), $expectedMessagePart)) {
            $failures[] = sprintf(
                '%s: expected message containing "%s" but got "%s".',
                $label,
                $expectedMessagePart,
                $exception->getMessage(),
            );
        }
    } catch (Throwable $throwable) {
        $failures[] = sprintf(
            '%s: expected ApiException %d, got %s.',
            $label,
            $expectedStatus,
            $throwable::class,
        );
    }
}

$usersByEmail = [];
foreach ($service->getUsers() as $user) {
    $usersByEmail[(string) ($user['email'] ?? '')] = $user;
}

if (!isset($usersByEmail['admin@examhub.local'], $usersByEmail['student@examhub.local'])) {
    $failures[] = 'Seed users are required for duplicate-email validation tests.';
} else {
    $pdo->beginTransaction();

    try {
        expectApiFailure(
            static function () use ($service): void {
                $service->createUser([
                    'name' => 'Taken User',
                    'email' => 'admin@examhub.local',
                    'role' => 'student',
                    'password' => 'Secret123!',
                ]);
            },
            409,
            'Email already in use',
            'Duplicate email on create',
            $failures,
        );

        expectApiFailure(
            static function () use ($service, $usersByEmail): void {
                $service->updateUser((string) $usersByEmail['student@examhub.local']['id'], [
                    'name' => 'Seed Student',
                    'email' => 'admin@examhub.local',
                    'role' => 'student',
                ]);
            },
            409,
            'Email already in use',
            'Duplicate email on update',
            $failures,
        );
    } finally {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
    }
}

if ($failures !== []) {
    foreach ($failures as $failure) {
        fwrite(STDERR, "FAIL: {$failure}\n");
    }
    exit(1);
}

echo "User service validation tests passed.\n";
