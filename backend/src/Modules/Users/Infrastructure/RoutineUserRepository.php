<?php

declare(strict_types=1);

namespace App\Modules\Users\Infrastructure;

use App\Modules\Users\Domain\UserRepository;
use App\Shared\Database\RoutineGateway;

final class RoutineUserRepository implements UserRepository
{
    public function __construct(private RoutineGateway $gateway)
    {
    }

    public function findAll(): array
    {
        return $this->gateway->call('sp_users_get_all');
    }

    public function findById(string $userId): ?array
    {
        $row = $this->gateway->call('sp_auth_get_user_by_id', [$userId])[0] ?? null;
        return is_array($row) ? $row : null;
    }

    public function create(array $parameters): ?array
    {
        $row = $this->gateway->call('sp_users_create', $parameters)[0] ?? null;
        return is_array($row) ? $row : null;
    }

    public function update(array $parameters): ?array
    {
        $row = $this->gateway->call('sp_users_update_admin', $parameters)[0] ?? null;
        return is_array($row) ? $row : null;
    }

    public function delete(string $userId): void
    {
        $this->gateway->call('sp_users_delete', [$userId]);
    }
}
