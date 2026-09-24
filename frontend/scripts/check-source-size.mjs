import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const sourceExtensions = new Set(['.js', '.jsx', '.mjs', '.ts', '.tsx']);

async function collectSourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await collectSourceFiles(entryPath)));
      continue;
    }

    if (sourceExtensions.has(path.extname(entry.name))) {
      files.push(entryPath);
    }
  }

  return files;
}

function countNonBlankLines(source) {
  return source.split(/\r?\n/).filter((line) => line.trim().length > 0).length;
}

export async function findSourceSizeViolations(
  rootDir,
  { splitTrigger = 450, hardLimit = 600 } = {},
) {
  const sourceFiles = await collectSourceFiles(rootDir);
  const violations = [];

  for (const sourceFile of sourceFiles) {
    const nonBlankLines = countNonBlankLines(await readFile(sourceFile, 'utf8'));
    const rule =
      nonBlankLines > hardLimit
        ? 'hard-limit'
        : nonBlankLines >= splitTrigger
          ? 'split-trigger'
          : null;

    if (!rule) {
      continue;
    }

    violations.push({
      file: path.relative(rootDir, sourceFile).split(path.sep).join('/'),
      nonBlankLines,
      rule,
    });
  }

  return violations.sort((left, right) => left.file.localeCompare(right.file));
}

export async function findHardLimitViolations(rootDir, options = {}) {
  const violations = await findSourceSizeViolations(rootDir, options);
  return violations.filter((violation) => violation.rule === 'hard-limit');
}

const isDirectExecution =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isDirectExecution) {
  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src');
  const violations = await findSourceSizeViolations(rootDir);
  console.log(JSON.stringify(violations, null, 2));

  if (process.argv.includes('--enforce') && (await findHardLimitViolations(rootDir)).length > 0) {
    process.exitCode = 1;
  }
}
