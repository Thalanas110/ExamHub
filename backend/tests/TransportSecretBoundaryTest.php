<?php

declare(strict_types=1);

$projectRoot = dirname(__DIR__, 2);
$frontendRoot = $projectRoot . '/frontend';

$forbiddenFrontendReferences = [
    'VITE_TRANSPORT_ENCRYPTION_KEY',
    'APP_ENCRYPTION_KEY',
    'encryptTransportPayload',
    'decryptTransportPayload',
    'X-Payload-Encryption',
];

$frontendFiles = [
    $frontendRoot . '/.env.example',
    $frontendRoot . '/src/app/services/http/request.ts',
    $frontendRoot . '/src/app/features/admin/api-reference/components/TryItPanel.tsx',
];

foreach ($frontendFiles as $path) {
    $contents = file_get_contents($path);
    if (!is_string($contents)) {
        throw new RuntimeException(sprintf('Unable to read frontend file: %s', $path));
    }

    foreach ($forbiddenFrontendReferences as $forbiddenReference) {
        if (str_contains($contents, $forbiddenReference)) {
            throw new RuntimeException(sprintf(
                'Frontend file %s must not reference %s.',
                str_replace($projectRoot . '/', '', $path),
                $forbiddenReference,
            ));
        }
    }
}

$transportCryptoPath = $frontendRoot . '/src/app/services/http/transport-crypto.ts';
if (is_file($transportCryptoPath)) {
    throw new RuntimeException('Frontend transport crypto must not exist. Browser transport security relies on HTTPS.');
}

$apiIndex = file_get_contents($projectRoot . '/api/index.php');
if (!is_string($apiIndex) || str_contains($apiIndex, 'new AesGcmCrypto($config->encryptionKey)')) {
    throw new RuntimeException('The public API entrypoint must not use the backend storage key for browser transport.');
}

fwrite(STDOUT, "Transport secret boundary tests passed.\n");
