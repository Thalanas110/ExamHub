<?php

declare(strict_types=1);

/**
 * @return array<int, string>
 */
function architecturePhpFiles(string $root): array
{
    $iterator = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($root, FilesystemIterator::SKIP_DOTS),
    );
    $paths = [];
    foreach ($iterator as $file) {
        if ($file instanceof SplFileInfo && $file->isFile() && $file->getExtension() === 'php') {
            $paths[] = $file->getPathname();
        }
    }

    sort($paths, SORT_STRING);
    return $paths;
}

/**
 * @return array<int, string>
 */
function architectureImports(string $source): array
{
    preg_match_all('/^\s*use\s+([^;]+);/mi', $source, $matches);
    $imports = [];
    foreach ($matches[1] ?? [] as $import) {
        $imports[] = trim((string) $import);
    }
    return $imports;
}

/**
 * @return array<int, string>
 */
function architectureViolations(string $root): array
{
    $violations = [];
    foreach (architecturePhpFiles($root) as $path) {
        $source = file_get_contents($path);
        if ($source === false) {
            $violations[] = $path . ': unreadable PHP source';
            continue;
        }

        foreach (architectureImports($source) as $import) {
            if (preg_match('/^App\\\\(?:Controllers|Services|Routing\\\\Routes|Logging)(?:\\\\|$)/', $import) === 1) {
                $violations[] = $path . ': legacy import ' . $import;
            }

            if (preg_match('/namespace\s+App\\\\Modules\\\\([^\\\\]+)\\\\(?:Application|Presentation)\s*;/i', $source, $moduleMatch) === 1) {
                $currentModule = $moduleMatch[1];
                if (str_starts_with($import, 'App\\Modules\\') && str_contains($import, '\\Infrastructure\\')) {
                    $importParts = explode('\\', $import);
                    $importModule = $importParts[2] ?? '';
                    if ($importModule !== '' && strcasecmp($currentModule, $importModule) !== 0) {
                        $violations[] = $path . ': cross-module infrastructure import ' . $import;
                    }
                }
            }
        }
    }

    return $violations;
}
