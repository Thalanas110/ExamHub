<?php

declare(strict_types=1);

require_once __DIR__ . '/ArchitectureScanner.php';

$violations = architectureViolations(dirname(__DIR__, 2) . '/src');
if ($violations !== []) {
    fwrite(STDERR, "Production architecture violations:\n" . implode("\n", $violations) . "\n");
    exit(1);
}

fwrite(STDOUT, "Production architecture boundaries passed.\n");
