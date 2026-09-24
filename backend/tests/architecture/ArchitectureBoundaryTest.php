<?php

declare(strict_types=1);

require_once __DIR__ . '/ArchitectureScanner.php';

$fixtureRoot = __DIR__ . '/fixtures';
$violations = architectureViolations($fixtureRoot);

if (count($violations) !== 1 || !str_contains($violations[0], 'cross-module infrastructure import')) {
    fwrite(STDERR, "Architecture fixture scanner did not detect the expected forbidden import.\n");
    fwrite(STDERR, implode("\n", $violations) . "\n");
    exit(1);
}

fwrite(STDOUT, "Architecture boundary fixture tests passed.\n");
