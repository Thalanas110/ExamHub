<?php

declare(strict_types=1);

require_once __DIR__ . '/../bootstrap/autoload.php';

use App\Modules\Auth\Domain\AuthUser;
use App\Modules\Auth\Domain\AuthenticationContext;

$user = AuthUser::fromArray([
    'id' => 'user-1',
    'name' => 'Exam User',
    'email' => 'user@example.test',
    'role' => 'student',
]);

if ($user->toArray()['id'] !== 'user-1' || $user->toArray()['role'] !== 'student') {
    throw new RuntimeException('AuthUser should preserve public identity fields.');
}

$context = AuthenticationContext::fromToken('token-1', $user);
if ($context->token !== 'token-1' || $context->user->email !== 'user@example.test') {
    throw new RuntimeException('AuthenticationContext should preserve token and user.');
}

fwrite(STDOUT, "Auth domain tests passed.\n");
