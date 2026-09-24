<?php

declare(strict_types=1);

namespace App\Modules\Auth\Domain;

final readonly class AuthenticationContext
{
    private function __construct(
        public string $token,
        public AuthUser $user,
    ) {
    }

    public static function fromToken(string $token, AuthUser $user): self
    {
        return new self($token, $user);
    }
}
