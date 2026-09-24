<?php

declare(strict_types=1);

namespace App\Services;

use App\Shared\Database\RoutineGateway;
use App\Shared\Security\AesGcmCrypto;
use App\Shared\Security\PasswordHasher;
use App\Services\Support\ExamMapper;
use App\Services\Support\ValueNormalizer;
use App\Shared\Support\ApiException;
use App\Shared\Support\Helpers;
use PDOException;

final class UserService
{
    public function __construct(
        private RoutineGateway $gateway,
        private AesGcmCrypto $crypto,
        private PasswordHasher $passwordHasher,
        private ExamMapper $mapper,
        private ValueNormalizer $normalizer,
    ) {
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function getUsers(): array
    {
        $rows = $this->gateway->call('sp_users_get_all');
        return array_map(fn (array $row): array => $this->mapper->mapUserRow($row), $rows);
    }

    /**
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    public function createUser(array $payload): array
    {
        $name = trim((string) ($payload['name'] ?? ''));
        $email = strtolower(trim((string) ($payload['email'] ?? '')));
        $role = (string) ($payload['role'] ?? 'student');
        $password = (string) ($payload['password'] ?? $this->generateDefaultPassword());
        $joinedAt = $this->normalizer->normalizeDate((string) ($payload['joinedAt'] ?? date('Y-m-d')), false);

        if ($name === '' || $email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new ApiException(422, 'Valid name and email are required.');
        }

        if (!in_array($role, ['student', 'teacher', 'admin'], true)) {
            throw new ApiException(422, 'Invalid role.');
        }
        [$departmentCiphertext, $departmentIv, $departmentTag] = $this->crypto->encryptParams(
            $this->normalizer->nullableString($payload['department'] ?? null),
        );
        [$phoneCiphertext, $phoneIv, $phoneTag] = $this->crypto->encryptParams(
            $this->normalizer->nullableString($payload['phone'] ?? null),
        );
        [$bioCiphertext, $bioIv, $bioTag] = $this->crypto->encryptParams(
            $this->normalizer->nullableString($payload['bio'] ?? null),
        );

        try {
            $rows = $this->gateway->call('sp_users_create', [
                Helpers::uuidV4(),
                $name,
                $email,
                $this->passwordHasher->hash($password),
                $role,
                $departmentCiphertext,
                $departmentIv,
                $departmentTag,
                null,
                $phoneCiphertext,
                $phoneIv,
                $phoneTag,
                null,
                $bioCiphertext,
                $bioIv,
                $bioTag,
                null,
                $joinedAt,
            ]);
        } catch (PDOException $exception) {
            throw $this->translateWriteException($exception, 'User creation failed.');
        }

        $row = $rows[0] ?? null;
        if (!is_array($row)) {
            throw new ApiException(500, 'User creation failed.');
        }

        return $this->mapper->mapUserRow($row);
    }

    /**
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    public function updateUser(string $userId, array $payload): array
    {
        $existingRow = $this->gateway->call('sp_auth_get_user_by_id', [$userId])[0] ?? null;
        if (!is_array($existingRow)) {
            throw new ApiException(404, 'User not found.');
        }

        $existing = $this->mapper->mapUserRow($existingRow);
        $name = trim((string) ($payload['name'] ?? $existing['name']));
        $email = strtolower(trim((string) ($payload['email'] ?? $existing['email'])));
        $role = (string) ($payload['role'] ?? $existing['role']);

        if ($name === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new ApiException(422, 'Valid name and email are required.');
        }

        if (!in_array($role, ['student', 'teacher', 'admin'], true)) {
            throw new ApiException(422, 'Invalid role.');
        }

        $passwordHash = (string) ($existingRow['passwordHash'] ?? '');
        if (array_key_exists('password', $payload) && trim((string) $payload['password']) !== '') {
            $passwordHash = $this->passwordHasher->hash((string) $payload['password']);
        }

        $department = array_key_exists('department', $payload)
            ? $this->normalizer->nullableString($payload['department'])
            : ($existing['department'] ?? null);

        $phone = array_key_exists('phone', $payload)
            ? $this->normalizer->nullableString($payload['phone'])
            : ($existing['phone'] ?? null);

        $bio = array_key_exists('bio', $payload)
            ? $this->normalizer->nullableString($payload['bio'])
            : ($existing['bio'] ?? null);

        $joinedAt = $this->normalizer->normalizeDate((string) ($payload['joinedAt'] ?? $existing['joinedAt']), false);
        [$departmentCiphertext, $departmentIv, $departmentTag] = $this->crypto->encryptParams($department);
        [$phoneCiphertext, $phoneIv, $phoneTag] = $this->crypto->encryptParams($phone);
        [$bioCiphertext, $bioIv, $bioTag] = $this->crypto->encryptParams($bio);

        try {
            $rows = $this->gateway->call('sp_users_update_admin', [
                $userId,
                $name,
                $email,
                $passwordHash,
                $role,
                $departmentCiphertext,
                $departmentIv,
                $departmentTag,
                null,
                $phoneCiphertext,
                $phoneIv,
                $phoneTag,
                null,
                $bioCiphertext,
                $bioIv,
                $bioTag,
                null,
                $joinedAt,
            ]);
        } catch (PDOException $exception) {
            throw $this->translateWriteException($exception, 'User update failed.');
        }

        $row = $rows[0] ?? null;
        if (!is_array($row)) {
            throw new ApiException(500, 'User update failed.');
        }

        return $this->mapper->mapUserRow($row);
    }

    public function deleteUser(string $userId): void
    {
        $this->gateway->call('sp_users_delete', [$userId]);
    }

    private function generateDefaultPassword(): string
    {
        return 'Temp' . substr(bin2hex(random_bytes(6)), 0, 8) . '!1a';
    }

    private function translateWriteException(PDOException $exception, string $fallbackMessage): ApiException
    {
        $message = strtolower($exception->getMessage());
        $code = (string) $exception->getCode();

        if (
            str_contains($message, 'email_exists') ||
            str_contains($message, 'uq_users_email') ||
            ($code === '23000' && str_contains($message, 'duplicate entry'))
        ) {
            return new ApiException(409, 'Email already in use.');
        }

        return new ApiException(500, $fallbackMessage);
    }
}
