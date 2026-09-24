<?php

declare(strict_types=1);

$source = file_get_contents(__DIR__ . '/../../api/index.php');
if (!is_string($source) || !str_contains($source, 'BackendApplicationFactory::create')) {
    throw new RuntimeException('The API entrypoint should compose the backend through BackendApplicationFactory.');
}

if (str_contains($source, 'ApiRouteRegistry')) {
    throw new RuntimeException('The API entrypoint must not use the removed route registry facade.');
}

fwrite(STDOUT, "Entrypoint composition tests passed.\n");
