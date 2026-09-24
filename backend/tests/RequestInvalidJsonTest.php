<?php

declare(strict_types=1);

require_once __DIR__ . '/../bootstrap/autoload.php';

use App\Shared\Http\Request;
use App\Shared\Support\ApiException;

$failures = [];

$_SERVER['REQUEST_METHOD'] = 'POST';
$_SERVER['REQUEST_URI'] = '/api/auth/login';

try {
    Request::fromGlobals();
    $failures[] = 'Malformed JSON request bodies should fail with a 400 ApiException.';
} catch (ApiException $exception) {
    if ($exception->status !== 400) {
        $failures[] = sprintf(
            'Malformed JSON should return status 400, got %d.',
            $exception->status,
        );
    }

    if (!str_contains($exception->getMessage(), 'Invalid JSON')) {
        $failures[] = sprintf(
            'Malformed JSON should mention an invalid JSON body, got "%s".',
            $exception->getMessage(),
        );
    }
} catch (Throwable $throwable) {
    $failures[] = 'Malformed JSON should raise ApiException, got ' . $throwable::class . '.';
}

if ($failures !== []) {
    foreach ($failures as $failure) {
        fwrite(STDERR, "FAIL: {$failure}\n");
    }
    exit(1);
}

echo "Request invalid JSON test passed.\n";
