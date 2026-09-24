<?php

declare(strict_types=1);

require_once __DIR__ . '/../bootstrap/autoload.php';

use App\Shared\Http\Request;

$originalServer = $_SERVER;

try {
    $_SERVER = [
        'REQUEST_METHOD' => 'GET',
        'REQUEST_URI' => '/api/data/all',
        'HTTP_CONTENT_TYPE' => 'application/json',
        'REDIRECT_HTTP_AUTHORIZATION' => 'Bearer apache-forwarded-token',
    ];

    $request = Request::fromGlobals();
    if ($request->bearerToken() !== 'apache-forwarded-token') {
        fwrite(STDERR, "FAIL: Apache-forwarded Authorization header was not detected.\n");
        exit(1);
    }
} finally {
    $_SERVER = $originalServer;
}

echo "Request Authorization header test passed.\n";
