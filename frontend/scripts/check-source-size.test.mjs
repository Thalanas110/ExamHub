import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { findSourceSizeViolations } from './check-source-size.mjs';

const rootDir = fileURLToPath(new URL('../src/', import.meta.url));

test('source-size checker returns deterministic file records', async () => {
  const result = await findSourceSizeViolations(rootDir);

  assert.ok(Array.isArray(result));
  assert.deepEqual(
    [...result].sort((left, right) => left.file.localeCompare(right.file)),
    result,
  );
});
