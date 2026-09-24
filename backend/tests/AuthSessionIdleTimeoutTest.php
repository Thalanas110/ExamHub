<?php

declare(strict_types=1);

require_once __DIR__ . '/../bootstrap/autoload.php';

use App\Shared\Config\AppConfig;
use App\Shared\Config\Env;
use App\Shared\Database\DbConnection;
use App\Shared\Database\RoutineGateway;
use App\Shared\Security\AesGcmCrypto;
use App\Shared\Security\JwtService;
use App\Shared\Security\PasswordHasher;
use App\Modules\Auth\Application\AuthService;
use App\Modules\Data\Application\SeedService;
use App\Services\Support\ExamMapper;
use App\Services\Support\ValueNormalizer;

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
$authService = new AuthService(
    $config,
    $gateway,
    $crypto,
    $passwordHasher,
    new JwtService($config->jwtSecret),
    $mapper,
    $normalizer,
);

$token = null;
try {
    $loginPayload = $authService->login([
        'email' => strtolower($config->seedStudentEmail),
        'password' => $config->seedStudentPassword,
    ]);

    $token = is_string($loginPayload['token'] ?? null) ? (string) $loginPayload['token'] : null;
    if ($token === null || $token === '') {
        $failures[] = 'Login should return a session token.';
    } else {
        $tokenHash = hash('sha256', $token);
        $update = $pdo->prepare(
            "UPDATE sessions
             SET expires_at = DATE_ADD(UTC_TIMESTAMP(), INTERVAL 2 SECOND), revoked_at = NULL
             WHERE token_hash = :tokenHash",
        );
        $update->execute(['tokenHash' => $tokenHash]);

        $firstAuth = $authService->authenticateFromToken($token);
        if (!is_array($firstAuth) || (string) ($firstAuth['id'] ?? '') === '') {
            $failures[] = 'Session should authenticate while still within timeout.';
        } else {
            sleep(3);
            $secondAuth = $authService->authenticateFromToken($token);
            if (!is_array($secondAuth) || (string) ($secondAuth['id'] ?? '') === '') {
                $failures[] = 'Session should stay active after in-time activity refresh.';
            }
        }
    }
} catch (Throwable $throwable) {
    $failures[] = 'Unexpected error during auth idle-timeout test: ' . $throwable->getMessage();
} finally {
    if (is_string($token) && $token !== '') {
        $authService->logout($token);
    }
}

if ($failures !== []) {
    foreach ($failures as $failure) {
        fwrite(STDERR, "FAIL: {$failure}\n");
    }
    exit(1);
}

echo "Auth session idle-timeout tests passed.\n";
