<?php

declare(strict_types=1);

require_once __DIR__ . '/../bootstrap/autoload.php';

use App\Shared\Config\AppConfig;
use App\Shared\Config\Env;
use App\Shared\Database\DbConnection;
use App\Shared\Database\RoutineGateway;
use App\Shared\Security\AesGcmCrypto;
use App\Services\ResultService;
use App\Services\SeedService;
use App\Modules\Exams\Application\StudentExamAccommodationService;
use App\Services\Support\ExamMapper;
use App\Services\Support\ValueNormalizer;
use App\Shared\Support\ApiException;

$failures = [];
$config = AppConfig::fromEnv(new Env(__DIR__ . '/../.env'));
$pdo = (new DbConnection($config))->pdo();
$gateway = new RoutineGateway($pdo);
$crypto = new AesGcmCrypto($config->encryptionKey);
$normalizer = new ValueNormalizer();
$mapper = new ExamMapper($crypto, $normalizer);
$passwordHasher = new App\Shared\Security\PasswordHasher();
$seedService = new SeedService($config, $gateway, $crypto, $passwordHasher);
$seedService->bootstrap();
$accommodationService = new StudentExamAccommodationService($gateway, $crypto, $mapper, $normalizer);
$service = new ResultService($gateway, $crypto, $mapper, $normalizer, $accommodationService);

$studentRow = $gateway->call('sp_auth_get_user_by_email', ['student@examhub.local'])[0] ?? null;
$examRow = null;
if (is_array($studentRow)) {
    $student = $mapper->mapUserRow($studentRow);
    $examRow = $gateway->call('sp_exams_get_for_user', [$student['role'], $student['id']])[0] ?? null;
}

/**
 * @param array<string, mixed> $payload
 */
function expectSubmissionValidationFailure(array $payload, string $messagePart, string $label, array &$failures, ?array $studentRow, ?array $examRow, PDO $pdo, ResultService $service, ExamMapper $mapper): void
{
    if (!is_array($studentRow) || !is_array($examRow)) {
        $failures[] = sprintf('%s: seeded student and exam are required.', $label);
        return;
    }

    $student = $mapper->mapUserRow($studentRow);

    $pdo->beginTransaction();

    try {
        $service->submitResult([
            'id' => $student['id'],
            'role' => $student['role'],
        ], $payload);
        $failures[] = sprintf('%s: expected a 422 validation failure.', $label);
    } catch (ApiException $exception) {
        if ($exception->status !== 422) {
            $failures[] = sprintf('%s: expected status 422 but got %d.', $label, $exception->status);
        }

        if (!str_contains($exception->getMessage(), $messagePart)) {
            $failures[] = sprintf(
                '%s: expected message containing "%s" but got "%s".',
                $label,
                $messagePart,
                $exception->getMessage(),
            );
        }
    } catch (Throwable $throwable) {
        $failures[] = sprintf('%s: expected ApiException 422, got %s.', $label, $throwable::class);
    } finally {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
    }
}

expectSubmissionValidationFailure(
    [
        'examId' => is_array($examRow) ? (string) ($examRow['id'] ?? '') : '',
        'submittedAt' => '2026-04-22T09:30:00',
        'answers' => ['invalid-row'],
    ],
    'Answer 1 is invalid',
    'Non-array answer row',
    $failures,
    is_array($studentRow) ? $studentRow : null,
    $examRow,
    $pdo,
    $service,
    $mapper,
);

expectSubmissionValidationFailure(
    [
        'examId' => is_array($examRow) ? (string) ($examRow['id'] ?? '') : '',
        'submittedAt' => '2026-04-22T09:30:00',
        'answers' => [[
            'questionId' => '',
            'answer' => '4',
        ]],
    ],
    'Answer 1 questionId is required',
    'Blank question id',
    $failures,
    is_array($studentRow) ? $studentRow : null,
    $examRow,
    $pdo,
    $service,
    $mapper,
);

if ($failures !== []) {
    foreach ($failures as $failure) {
        fwrite(STDERR, "FAIL: {$failure}\n");
    }
    exit(1);
}

echo "Result submission validation tests passed.\n";
