<?php

declare(strict_types=1);

namespace App\Shared\Http;

use App\Shared\Security\AesGcmCrypto;
use App\Shared\Support\ApiException;
use JsonException;

final class Request
{
    /**
     * @param array<string, string> $headers
     * @param array<string, mixed> $body
     */
    public function __construct(
        public string $method,
        public string $path,
        public array $headers,
        public array $body,
    ) {
    }

    public static function fromGlobals(string $basePath = '/api', ?AesGcmCrypto $transportCrypto = null): self
    {
        $method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
        $uri = (string) ($_SERVER['REQUEST_URI'] ?? '/');
        $path = parse_url($uri, PHP_URL_PATH) ?: '/';

        if ($basePath !== '' && str_starts_with($path, $basePath)) {
            $path = substr($path, strlen($basePath));
        }

        // Some local Apache/Laragon setups route through index.php without
        // rewrite support, e.g. /group8/api/index.php/auth/login.
        if (str_starts_with($path, '/index.php')) {
            $path = substr($path, strlen('/index.php'));
        }

        if ($path === '') {
            $path = '/';
        }

        $headers = self::readHeaders();
        $rawBody = self::readRawBody();
        $body = [];

        if (trim($rawBody) !== '') {
            if ($transportCrypto !== null) {
                AesGcmPayloadEnvelope::requireHeaderValue($headers[AesGcmPayloadEnvelope::HEADER_NAME_LOWER] ?? null);
                $envelope = self::decodeJsonBody(
                    $rawBody,
                    'Invalid JSON request body.',
                    'JSON request body must decode to an object.',
                );
                $body = AesGcmPayloadEnvelope::decryptRequestBody($envelope, $transportCrypto);
            } else {
                $body = self::decodeJsonBody(
                    $rawBody,
                    'Invalid JSON request body.',
                    'JSON request body must decode to an object.',
                );
            }
        }

        return new self(
            method: $method,
            path: $path,
            headers: $headers,
            body: $body,
        );
    }

    public function header(string $name): ?string
    {
        $value = $this->headers[strtolower($name)] ?? null;
        return is_string($value) ? $value : null;
    }

    public function bearerToken(): ?string
    {
        $auth = $this->header('authorization');
        if ($auth === null || !str_starts_with($auth, 'Bearer ')) {
            return null;
        }

        $token = trim(substr($auth, 7));
        return $token === '' ? null : $token;
    }

    private static function readRawBody(): string
    {
        $rawBody = file_get_contents('php://input');
        if (!is_string($rawBody)) {
            $rawBody = '';
        }

        // CLI tests do not populate php://input, so fall back to stdin there.
        if ($rawBody === '' && PHP_SAPI === 'cli') {
            $stdin = file_get_contents('php://stdin');
            if (is_string($stdin)) {
                return $stdin;
            }
        }

        return $rawBody;
    }

    /**
     * @return array<string, string>
     */
    private static function readHeaders(): array
    {
        $headers = [];
        $rawHeaders = [];

        if (function_exists('getallheaders')) {
            $serverHeaders = getallheaders();
            if (is_array($serverHeaders)) {
                $rawHeaders = $serverHeaders;
            }
        }

        foreach ($_SERVER as $key => $value) {
            if (!str_starts_with($key, 'HTTP_')) {
                continue;
            }

            $headerName = str_replace('_', '-', strtolower(substr($key, 5)));
            $rawHeaders[$headerName] ??= (string) $value;
        }

        // Apache may expose Authorization as REDIRECT_HTTP_AUTHORIZATION
        // when the request passed through a rewrite or CGI boundary. It can
        // also omit it from getallheaders() while returning other headers.
        foreach (['HTTP_AUTHORIZATION', 'REDIRECT_HTTP_AUTHORIZATION'] as $key) {
            $value = $_SERVER[$key] ?? null;
            if (is_string($value) && trim($value) !== '') {
                $rawHeaders['authorization'] = $value;
                break;
            }
        }

        foreach ($rawHeaders as $key => $value) {
            $headers[strtolower((string) $key)] = (string) $value;
        }

        return $headers;
    }

    /**
     * @return array<string, mixed>
     */
    private static function decodeJsonBody(string $rawBody, string $invalidJsonMessage, string $mustBeObjectMessage): array
    {
        try {
            $decoded = json_decode($rawBody, true, 512, JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            throw new ApiException(400, $invalidJsonMessage);
        }

        if (!is_array($decoded)) {
            throw new ApiException(400, $mustBeObjectMessage);
        }

        return $decoded;
    }
}
