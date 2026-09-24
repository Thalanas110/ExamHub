<?php

declare(strict_types=1);

require_once __DIR__ . '/../bootstrap/autoload.php';

use App\Shared\Config\AppConfig;
use App\Shared\Config\Env;
use App\Shared\Database\DbConnection;
use App\Shared\Database\RoutineGateway;
use App\Shared\Security\AesGcmCrypto;
use App\Shared\Security\PasswordHasher;
use App\Modules\Exams\Application\ExamService;
use App\Modules\Results\Application\ResultService;
use App\Services\SeedService;
use App\Modules\Exams\Application\StudentExamAccommodationService;
use App\Modules\Exams\Infrastructure\RoutineExamRepository;
use App\Services\Support\ExamMapper;
use App\Modules\Exams\Application\ExamPayloadValidator;
use App\Services\Support\ValueNormalizer;
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
$accommodationService = new StudentExamAccommodationService($gateway, $crypto, $mapper, $normalizer);
$examService = new ExamService(new RoutineExamRepository($gateway), $mapper, $normalizer, new ExamPayloadValidator(), $accommodationService);
$resultService = new ResultService($gateway, $crypto, $mapper, $normalizer, $accommodationService);

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

/**
 * @param callable(): void $scenario
 */
function runTransactionalScenario(PDO $pdo, callable $scenario, string $label, array &$failures): void
{
    $pdo->beginTransaction();

    try {
        $scenario();
    } catch (Throwable $throwable) {
        $failures[] = sprintf('%s: unexpected %s: %s', $label, $throwable::class, $throwable->getMessage());
    } finally {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
    }
}

$teacherRow = $gateway->call('sp_auth_get_user_by_email', ['teacher@examhub.local'])[0] ?? null;
$studentRow = $gateway->call('sp_auth_get_user_by_email', ['student@examhub.local'])[0] ?? null;
$examRow = null;

if (is_array($teacherRow)) {
    $teacher = $mapper->mapUserRow($teacherRow);
    $examRow = $gateway->call('sp_exams_get_for_user', [$teacher['role'], $teacher['id']])[0] ?? null;
}

if (!is_array($teacherRow) || !is_array($studentRow) || !is_array($examRow)) {
    $failures[] = 'Seed teacher, student, and exam are required for attempt flow tests.';
} else {
    $teacher = $mapper->mapUserRow($teacherRow);
    $student = $mapper->mapUserRow($studentRow);
    $teacherAuth = ['id' => $teacher['id'], 'role' => $teacher['role']];
    $studentAuth = ['id' => $student['id'], 'role' => $student['role']];
    $examId = (string) ($examRow['id'] ?? '');
    $studentId = $student['id'];
    $answers = [
        [
            'questionId' => 'q-demo-1',
            'answer' => '4',
        ],
        [
            'questionId' => 'q-demo-2',
            'answer' => 'Unit tests reduce regressions.',
        ],
    ];

    runTransactionalScenario(
        $pdo,
        static function () use (
            $accommodationService,
            $teacherAuth,
            $studentAuth,
            $studentId,
            $examId,
            $examService,
            $resultService,
            $answers,
            &$failures
        ): void {
            $accommodationService->upsertExamAccommodation($teacherAuth, $examId, $studentId, [
                'extraTimeMinutes' => 15,
                'attemptLimit' => 2,
                'alternateStartAt' => gmdate('c', strtotime('-10 minutes')),
                'alternateEndAt' => gmdate('c', strtotime('+2 hours')),
                'accessibilityPreferences' => [
                    'screenReader' => true,
                ],
            ]);

            $examBefore = $examService->getExamById($studentAuth, $examId);
            if (($examBefore['attemptLimit'] ?? null) !== 2) {
                $failures[] = 'Student exam payload should expose the effective attempt limit.';
            }

            if (($examBefore['attemptsUsed'] ?? null) !== 0) {
                $failures[] = 'Student exam payload should start with zero attempts used.';
            }

            if (($examBefore['extraTimeMinutes'] ?? null) !== 15) {
                $failures[] = 'Student exam payload should expose the effective extra time.';
            }

            $attemptOne = $resultService->startAttempt($studentAuth, ['examId' => $examId]);
            if (($attemptOne['attemptNo'] ?? null) !== 1) {
                $failures[] = 'First started attempt should be attempt number 1.';
            }

            if (($attemptOne['status'] ?? null) !== 'in_progress') {
                $failures[] = 'Started attempts should be marked in_progress.';
            }

            if (($attemptOne['allowedDurationMinutes'] ?? null) !== 75) {
                $failures[] = 'Started attempts should include exam duration plus extra time.';
            }

            expectApiFailure(
                static function () use ($resultService, $studentAuth, $examId): void {
                    $resultService->startAttempt($studentAuth, ['examId' => $examId]);
                },
                409,
                'already in progress',
                'Second start while active',
                $failures,
            );

            $submittedOne = $resultService->submitResult($studentAuth, [
                'submissionId' => (string) ($attemptOne['id'] ?? ''),
                'answers' => $answers,
            ]);

            if (($submittedOne['attemptNo'] ?? null) !== 1) {
                $failures[] = 'Submitted attempt should preserve its attempt number.';
            }

            if (($submittedOne['status'] ?? null) !== 'submitted') {
                $failures[] = 'Essay submissions should remain in submitted status until grading.';
            }

            if (($submittedOne['submittedAt'] ?? null) === null) {
                $failures[] = 'Submitted attempts should include submittedAt.';
            }

            $examAfterFirstSubmit = $examService->getExamById($studentAuth, $examId);
            if (($examAfterFirstSubmit['attemptsUsed'] ?? null) !== 1) {
                $failures[] = 'Student exam payload should reflect attempts used after submission.';
            }

            $attemptTwo = $resultService->startAttempt($studentAuth, ['examId' => $examId]);
            if (($attemptTwo['attemptNo'] ?? null) !== 2) {
                $failures[] = 'Second started attempt should be attempt number 2.';
            }

            $resultService->submitResult($studentAuth, [
                'submissionId' => (string) ($attemptTwo['id'] ?? ''),
                'answers' => $answers,
            ]);

            expectApiFailure(
                static function () use ($resultService, $studentAuth, $examId): void {
                    $resultService->startAttempt($studentAuth, ['examId' => $examId]);
                },
                409,
                'Attempt limit reached',
                'Start after attempt limit',
                $failures,
            );
        },
        'Attempt lifecycle',
        $failures,
    );

    runTransactionalScenario(
        $pdo,
        static function () use (
            $accommodationService,
            $teacherAuth,
            $studentAuth,
            $studentId,
            $examId,
            $resultService,
            $answers,
            &$failures
        ): void {
            $accommodationService->upsertExamAccommodation($teacherAuth, $examId, $studentId, [
                'extraTimeMinutes' => 5,
                'attemptLimit' => 2,
                'alternateStartAt' => gmdate('c', strtotime('-10 minutes')),
                'alternateEndAt' => gmdate('c', strtotime('+2 hours')),
            ]);

            $submission = $resultService->submitResult($studentAuth, [
                'examId' => $examId,
                'answers' => $answers,
            ]);

            if (($submission['attemptNo'] ?? null) !== 1) {
                $failures[] = 'Legacy one-shot submit should auto-create attempt number 1.';
            }

            if (($submission['startedAt'] ?? null) === null) {
                $failures[] = 'Legacy one-shot submit should still record a trusted startedAt.';
            }
        },
        'Legacy submit compatibility',
        $failures,
    );

    runTransactionalScenario(
        $pdo,
        static function () use (
            $accommodationService,
            $teacherAuth,
            $studentAuth,
            $studentId,
            $examId,
            $resultService,
            &$failures
        ): void {
            $accommodationService->upsertExamAccommodation($teacherAuth, $examId, $studentId, [
                'extraTimeMinutes' => 0,
                'attemptLimit' => 2,
                'alternateStartAt' => gmdate('c', strtotime('+1 hour')),
                'alternateEndAt' => gmdate('c', strtotime('+2 hours')),
            ]);

            expectApiFailure(
                static function () use ($resultService, $studentAuth, $examId): void {
                    $resultService->startAttempt($studentAuth, ['examId' => $examId]);
                },
                409,
                'outside the allowed exam window',
                'Alternate schedule enforcement',
                $failures,
            );
        },
        'Alternate schedule enforcement',
        $failures,
    );
}

if ($failures !== []) {
    foreach ($failures as $failure) {
        fwrite(STDERR, "FAIL: {$failure}\n");
    }
    exit(1);
}

echo "Result attempt flow tests passed.\n";
