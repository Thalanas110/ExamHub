import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import {
  findViolations,
  findLegacyRootImportOwners,
  findProductionOwnerViolations,
} from './check-fsd-boundaries.mjs';
import { findSourceSizeViolations } from './check-source-size.mjs';

const rootDir = fileURLToPath(new URL('../src/', import.meta.url));

test('production source has no upward FSD imports', async () => {
  assert.deepEqual(await findViolations(rootDir), []);
});

test('production source has no legacy-root imports', async () => {
  assert.deepEqual(await findLegacyRootImportOwners(rootDir), []);
});

test('production source has no non-FSD owners', async () => {
  assert.deepEqual(await findProductionOwnerViolations(rootDir), []);
});

test('source-size report is available without enforcing a limit', async () => {
  const result = await findSourceSizeViolations(rootDir);
  assert.ok(Array.isArray(result));
});
