<?php

declare(strict_types=1);

namespace App\Modules\Auth\Domain;

interface AuthRepository
{
    /**
     * @return array<string, mixed>|null
     */
    public function findUserBySessionHash(string $tokenHash): ?array;

    /**
     * @return array<string, mixed>|null
     */
    public function findUserByEmail(string $email): ?array;

    /**
     * @return array<string, mixed>|null
     */
    public function findUserById(string $userId): ?array;

    /**
     * @param array<int, mixed> $parameters
     * @return array<string, mixed>|null
     */
    public function register(array $parameters): ?array;

    /**
     * @param array<int, mixed> $parameters
     * @return array<string, mixed>|null
     */
    public function updateProfile(array $parameters): ?array;

    /**
     * @param array<int, mixed> $parameters
     */
    public function createSession(array $parameters): void;

    public function revokeSession(string $tokenHash): void;
}
