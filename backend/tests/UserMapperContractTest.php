<?php

declare(strict_types=1);

require_once __DIR__ . '/../bootstrap/autoload.php';

use App\Modules\Users\Application\UserMapper;
use App\Shared\Security\AesGcmCrypto;
use App\Services\Support\ValueNormalizer;

$mapper = new UserMapper(
    new AesGcmCrypto('0123456789abcdef0123456789abcdef'),
    new ValueNormalizer(),
);
$user = $mapper->mapRow([
    'id' => 'user-1',
    'name' => 'User',
    'email' => 'user@example.test',
    'role' => 'teacher',
    'joinedAt' => '2026-09-24',
]);

if ($user['id'] !== 'user-1' || $user['role'] !== 'teacher' || $user['department'] !== null) {
    throw new RuntimeException('UserMapper should preserve public user fields.');
}

fwrite(STDOUT, "User mapper contract tests passed.\n");
