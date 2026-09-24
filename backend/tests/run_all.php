<?php

declare(strict_types=1);

$testPaths = glob(__DIR__ . '/*.php');
if (!is_array($testPaths)) {
    fwrite(STDERR, "Unable to discover backend tests.\n");
    exit(1);
}

$testPaths = array_values(array_filter(
    $testPaths,
    static fn (string $path): bool => basename($path) !== 'run_all.php',
));
sort($testPaths, SORT_STRING);

$failures = [];
foreach ($testPaths as $testPath) {
    fwrite(STDOUT, sprintf("--- %s ---\n", basename($testPath)));
    $command = escapeshellarg(PHP_BINARY) . ' ' . escapeshellarg($testPath);
    passthru($command, $exitCode);
    if ($exitCode !== 0) {
        $failures[basename($testPath)] = $exitCode;
        fwrite(STDOUT, sprintf("EXIT %d\n", $exitCode));
    }
}

if ($failures !== []) {
    fwrite(STDERR, "Failed backend tests:\n");
    foreach ($failures as $name => $exitCode) {
        fwrite(STDERR, sprintf("- %s (exit %d)\n", $name, $exitCode));
    }
    exit(1);
}

fwrite(STDOUT, sprintf("Backend tests passed: %d files.\n", count($testPaths)));
