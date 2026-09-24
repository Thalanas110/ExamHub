<?php

declare(strict_types=1);

namespace App\Shared\Support;

use RuntimeException;

final class ApiException extends RuntimeException
{
    public function __construct(
        public int $status,
        string $message,
    ) {
        parent::__construct($message);
    }
}
