<?php

declare(strict_types=1);

namespace App\Services;

use App\Shared\Config\AppConfig;
use App\Shared\Database\RoutineGateway;
use App\Security\AesGcmCrypto;
use App\Security\JwtService;
use App\Security\PasswordHasher;
use App\Services\Support\ExamMapper;
use App\Services\Support\ValueNormalizer;
use App\Shared\Support\ApiException;
use App\Shared\Support\Helpers;
use PDOException;

final class AuthService
{
    public function __construct(
        private AppConfig $config,
        private RoutineGateway $gateway,
        private AesGcmCrypto $crypto,
        private PasswordHasher $passwordHasher,
        private JwtService $jwtService,
        private ExamMapper $mapper,
        private ValueNormalizer $normalizer,
    ) {
    }

    /**
     * @return array<string, mixed>|null
     */
    public function authenticateFromToken(?string $token): ?array
    {
        if ($token === null || $token === '') {
            return null;
        }

        $jwtPayload = $this->jwtService->verify($token);
        if (!is_array($jwtPayload)) {
            return null;
        }

        $tokenHash = hash('sha256', $token);
        $rows = $this->gateway->call('sp_auth_get_user_by_session', [$tokenHash]);
        $row = $rows[0] ?? null;
        if (!is_array($row)) {
            return null;
        }

        $user = $this->mapper->mapUserRow($row);
        if (($jwtPayload['sub'] ?? null) !== $user['id']) {
            return null;
        }

        $this->refreshSessionActivity($tokenHash, (string) $user['id']);

        return $user;
    }

    /**
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    public function register(array $payload): array
    {
        $name = trim((string) ($payload['name'] ?? ''));
        $email = strtolower(trim((string) ($payload['email'] ?? '')));
        $password = (string) ($payload['password'] ?? '');
        $role = (string) ($payload['role'] ?? 'student');

        if ($name === '' || $email === '' || $password === '') {
            throw new ApiException(422, 'name, email, and password are required.');
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new ApiException(422, 'Invalid email format.');
        }

        if (!in_array($role, ['student', 'teacher', 'admin'], true)) {
            throw new ApiException(422, 'Invalid role.');
        }

        if ($role === 'admin') {
            throw new ApiException(403, 'Public registration for admin role is not allowed.');
        }

        $id = Helpers::uuidV4();
        $department = $this->normalizer->nullableString($payload['department'] ?? null);
        [$departmentCiphertext, $departmentIv, $departmentTag] = $this->crypto->encryptParams($department);

        try {
            $rows = $this->gateway->call('sp_auth_register', [
                $id,
                $name,
                $email,
                $this->passwordHasher->hash($password),
                $role,
                $departmentCiphertext,
                $departmentIv,
                $departmentTag,
                null,
                date('Y-m-d'),
            ]);
        } catch (PDOException $exception) {
            $message = $exception->getMessage();
            if (str_contains($message, 'EMAIL_EXISTS')) {
                throw new ApiException(409, 'Email already in use.');
            }

            throw new ApiException(500, 'Registration failed.');
        }

        $row = $rows[0] ?? null;
        if (!is_array($row)) {
            throw new ApiException(500, 'Registration failed.');
        }

        $user = $this->mapper->mapUserRow($row);
        $token = $this->issueSessionToken($user);

        return [
            'token' => $token,
            'user' => $user,
        ];
    }

    /**
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    public function login(array $payload): array
    {
        $email = strtolower(trim((string) ($payload['email'] ?? '')));
        $password = (string) ($payload['password'] ?? '');

        if ($email === '' || $password === '') {
            throw new ApiException(422, 'email and password are required.');
        }

        $rows = $this->gateway->call('sp_auth_get_user_by_email', [$email]);
        $row = $rows[0] ?? null;

        if (!is_array($row)) {
            throw new ApiException(401, 'Invalid credentials.');
        }

        $passwordHash = (string) ($row['passwordHash'] ?? '');
        if ($passwordHash === '' || !$this->passwordHasher->verify($password, $passwordHash)) {
            throw new ApiException(401, 'Invalid credentials.');
        }

        $user = $this->mapper->mapUserRow($row);
        $token = $this->issueSessionToken($user);

        return [
            'token' => $token,
            'user' => $user,
        ];
    }

    public function logout(?string $token): void
    {
        if ($token === null || $token === '') {
            return;
        }

        $this->gateway->call('sp_session_revoke', [hash('sha256', $token)]);
    }

    /**
     * @return array<string, mixed>
     */
    public function getProfile(string $userId): array
    {
        $rows = $this->gateway->call('sp_auth_get_user_by_id', [$userId]);
        $row = $rows[0] ?? null;

        if (!is_array($row)) {
            throw new ApiException(404, 'User not found.');
        }

        return $this->mapper->mapUserRow($row);
    }

    /**
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    public function updateProfile(string $userId, array $payload): array
    {
        $existingRow = $this->gateway->call('sp_auth_get_user_by_id', [$userId])[0] ?? null;
        if (!is_array($existingRow)) {
            throw new ApiException(404, 'User not found.');
        }

        $existing = $this->mapper->mapUserRow($existingRow);
        $name = trim((string) ($payload['name'] ?? $existing['name']));
        if ($name === '') {
            throw new ApiException(422, 'name cannot be empty.');
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
        [$departmentCiphertext, $departmentIv, $departmentTag] = $this->crypto->encryptParams($department);
        [$phoneCiphertext, $phoneIv, $phoneTag] = $this->crypto->encryptParams($phone);
        [$bioCiphertext, $bioIv, $bioTag] = $this->crypto->encryptParams($bio);

        $rows = $this->gateway->call('sp_users_update_profile', [
            $userId,
            $name,
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
        ]);

        $row = $rows[0] ?? null;
        if (!is_array($row)) {
            throw new ApiException(500, 'Profile update failed.');
        }

        return $this->mapper->mapUserRow($row);
    }

    /**
     * @param array<string, mixed> $user
     */
    private function issueSessionToken(array $user): string
    {
        $token = $this->jwtService->issue([
            'sub' => $user['id'],
            'role' => $user['role'],
            'email' => $user['email'],
            'jti' => Helpers::uuidV4(),
        ], $this->config->tokenTtlSeconds);

        if ($token === '') {
            throw new ApiException(500, 'Token generation failed.');
        }

        $issuedAt = gmdate('Y-m-d H:i:s');
        $expiresAt = $this->sessionExpiryTimestamp();

        $this->gateway->call('sp_session_create', [
            Helpers::uuidV4(),
            $user['id'],
            hash('sha256', $token),
            $issuedAt,
            $expiresAt,
        ]);

        return $token;
    }

    private function refreshSessionActivity(string $tokenHash, string $userId): void
    {
        $this->gateway->call('sp_session_create', [
            Helpers::uuidV4(),
            $userId,
            $tokenHash,
            gmdate('Y-m-d H:i:s'),
            $this->sessionExpiryTimestamp(),
        ]);
    }

    private function sessionExpiryTimestamp(): string
    {
        return gmdate('Y-m-d H:i:s', time() + $this->config->sessionIdleTtlSeconds);
    }
}
