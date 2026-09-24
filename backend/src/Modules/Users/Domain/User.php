<?php

declare(strict_types=1);

namespace App\Modules\Users\Domain;

final readonly class User
{
    public function __construct(
        public string $id,
        public string $name,
        public string $email,
        public string $role,
    ) {
    }
}
