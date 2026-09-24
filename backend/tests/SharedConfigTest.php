<?php

declare(strict_types=1);

require_once __DIR__ . '/../bootstrap/autoload.php';

use App\Shared\Config\Env;

$path = tempnam(sys_get_temp_dir(), 'examhub-env-');
if ($path === false) {
    throw new RuntimeException('Unable to create temporary environment file.');
}

file_put_contents($path, implode("\n", [
    'EXAMHUB_TEST_INT=85',
    'EXAMHUB_TEST_BOOL=yes',
    'EXAMHUB_TEST_CSV= one, two ,, three ',
    'EXAMHUB_TEST_EMPTY=',
    "EXAMHUB_TEST_REQUIRED='required-value'",
]));

try {
    $env = new Env($path);
    if ($env->getInt('EXAMHUB_TEST_INT', 0) !== 85) {
        throw new RuntimeException('Integer environment values should parse.');
    }
    if ($env->getBool('EXAMHUB_TEST_BOOL', false) !== true) {
        throw new RuntimeException('Boolean environment values should parse.');
    }
    if ($env->get('EXAMHUB_TEST_REQUIRED') !== 'required-value') {
        throw new RuntimeException('Quoted environment values should be unwrapped.');
    }
    if ($env->get('EXAMHUB_TEST_MISSING', 'default') !== 'default') {
        throw new RuntimeException('Missing environment values should use defaults.');
    }
    if ($env->require('EXAMHUB_TEST_REQUIRED') !== 'required-value') {
        throw new RuntimeException('Required environment values should be returned.');
    }
} finally {
    unlink($path);
}

fwrite(STDOUT, "Shared config tests passed.\n");
