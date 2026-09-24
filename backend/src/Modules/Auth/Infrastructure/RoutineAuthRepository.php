<?php

declare(strict_types=1);

namespace App\Modules\Auth\Infrastructure;

use App\Modules\Auth\Domain\AuthRepository;
use App\Shared\Database\RoutineGateway;

final class RoutineAuthRepository implements AuthRepository
{
    public function __construct(private RoutineGateway $gateway)
    {
    }

    public function findUserBySessionHash(string $tokenHash): ?array
    {
        return $this->firstRow($this->gateway->call('sp_auth_get_user_by_session', [$tokenHash]));
    }

    public function findUserByEmail(string $email): ?array
    {
        return $this->firstRow($this->gateway->call('sp_auth_get_user_by_email', [$email]));
    }

    public function findUserById(string $userId): ?array
    {
        return $this->firstRow($this->gateway->call('sp_auth_get_user_by_id', [$userId]));
    }

    public function register(array $parameters): ?array
    {
        return $this->firstRow($this->gateway->call('sp_auth_register', $parameters));
    }

    public function updateProfile(array $parameters): ?array
    {
        return $this->firstRow($this->gateway->call('sp_users_update_profile', $parameters));
    }

    public function createSession(array $parameters): void
    {
        $this->gateway->call('sp_session_create', $parameters);
    }

    public function revokeSession(string $tokenHash): void
    {
        $this->gateway->call('sp_session_revoke', [$tokenHash]);
    }

    /**
     * @param array<int, array<string, mixed>> $rows
     * @return array<string, mixed>|null
     */
    private function firstRow(array $rows): ?array
    {
        $row = $rows[0] ?? null;
        return is_array($row) ? $row : null;
    }
}
