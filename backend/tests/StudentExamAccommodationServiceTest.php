<?php

declare(strict_types=1);

require_once __DIR__ . '/../bootstrap/autoload.php';

use App\Config\AppConfig;
use App\Config\Env;
use App\Database\DbConnection;
use App\Database\RoutineGateway;
use App\Security\AesGcmCrypto;
use App\Security\PasswordHasher;
use App\Services\SeedService;
use App\Services\StudentExamAccommodationService;
use App\Services\Support\ExamMapper;
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
$service = new StudentExamAccommodationService($gateway, $crypto, $mapper, $normalizer);

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

$teacherRow = $gateway->call('sp_auth_get_user_by_email', ['teacher@examhub.local'])[0] ?? null;
$studentRow = $gateway->call('sp_auth_get_user_by_email', ['student@examhub.local'])[0] ?? null;
$examRow = null;

if (is_array($teacherRow)) {
    $teacher = $mapper->mapUserRow($teacherRow);
    $examRow = $gateway->call('sp_exams_get_for_user', [$teacher['role'], $teacher['id']])[0] ?? null;
}

if (!is_array($teacherRow) || !is_array($studentRow) || !is_array($examRow)) {
    $failures[] = 'Seed teacher, student, and exam are required for accommodation tests.';
} else {
    $teacher = $mapper->mapUserRow($teacherRow);
    $student = $mapper->mapUserRow($studentRow);
    $teacherAuth = ['id' => $teacher['id'], 'role' => $teacher['role']];
    $examId = (string) ($examRow['id'] ?? '');
    $studentId = $student['id'];

    $alternateStartAt = gmdate('c', strtotime('-15 minutes'));
    $alternateEndAt = gmdate('c', strtotime('+2 hours'));

    $pdo->beginTransaction();

    try {
        $saved = $service->upsertExamAccommodation($teacherAuth, $examId, $studentId, [
            'extraTimeMinutes' => 15,
            'attemptLimit' => 2,
            'alternateStartAt' => $alternateStartAt,
            'alternateEndAt' => $alternateEndAt,
            'accessibilityPreferences' => [
                'screenReader' => true,
                'fontScale' => 'large',
            ],
        ]);

        if (($saved['examId'] ?? '') !== $examId) {
            $failures[] = 'Accommodation upsert should return the target exam id.';
        }

        if (($saved['studentId'] ?? '') !== $studentId) {
            $failures[] = 'Accommodation upsert should return the target student id.';
        }

        if (($saved['extraTimeMinutes'] ?? null) !== 15) {
            $failures[] = 'Accommodation upsert should persist extraTimeMinutes.';
        }

        if (($saved['attemptLimit'] ?? null) !== 2) {
            $failures[] = 'Accommodation upsert should persist attemptLimit.';
        }

        if (($saved['alternateStartAt'] ?? '') !== gmdate('Y-m-d\TH:i:s', strtotime($alternateStartAt))) {
            $failures[] = 'Accommodation upsert should normalize alternateStartAt.';
        }

        if (($saved['alternateEndAt'] ?? '') !== gmdate('Y-m-d\TH:i:s', strtotime($alternateEndAt))) {
            $failures[] = 'Accommodation upsert should normalize alternateEndAt.';
        }

        $preferences = is_array($saved['accessibilityPreferences'] ?? null)
            ? $saved['accessibilityPreferences']
            : null;

        if (!is_array($preferences) || ($preferences['fontScale'] ?? null) !== 'large') {
            $failures[] = 'Accommodation upsert should decrypt accessibilityPreferences for API output.';
        }

        $statement = $pdo->prepare(
            'SELECT accessibility_preferences_ciphertext AS ciphertext, accessibility_preferences_iv AS iv, accessibility_preferences_tag AS tag
             FROM student_exam_accommodations
             WHERE exam_id = ? AND student_id = ?'
        );
        $statement->execute([$examId, $studentId]);
        $storedRow = $statement->fetch(PDO::FETCH_ASSOC);

        if (!is_array($storedRow)) {
            $failures[] = 'Accommodation row should exist in the database after upsert.';
        } else {
            $ciphertext = (string) ($storedRow['ciphertext'] ?? '');
            $iv = (string) ($storedRow['iv'] ?? '');
            $tag = (string) ($storedRow['tag'] ?? '');

            if ($ciphertext === '' || $iv === '' || $tag === '') {
                $failures[] = 'Accessibility preferences should be stored as ciphertext, IV, and tag.';
            }

            if (str_contains($ciphertext, 'fontScale') || str_contains($ciphertext, 'screenReader')) {
                $failures[] = 'Accessibility preferences should not be stored in plaintext.';
            }
        }

        $fetched = $service->getExamAccommodation($teacherAuth, $examId, $studentId);
        if (($fetched['attemptLimit'] ?? null) !== 2) {
            $failures[] = 'Single accommodation fetch should return the saved attempt limit.';
        }

        $collection = $service->getExamAccommodations($teacherAuth, $examId);
        if (count($collection) < 1) {
            $failures[] = 'Exam accommodation listing should include the saved row.';
        }

        $service->deleteExamAccommodation($teacherAuth, $examId, $studentId);

        expectApiFailure(
            static function () use ($service, $teacherAuth, $examId, $studentId): void {
                $service->getExamAccommodation($teacherAuth, $examId, $studentId);
            },
            404,
            'Accommodation not found',
            'Fetch after delete',
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

echo "Student exam accommodation service tests passed.\n";
