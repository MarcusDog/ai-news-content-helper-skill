import assert from 'node:assert/strict';
import { test } from 'node:test';

import { runtimeEntries } from '../install.mjs';

test('runtime package includes every required Agent Skill component and excludes repository-only files', () => {
  assert.deepEqual(runtimeEntries, ['SKILL.md', 'agents', 'assets', 'references', 'scripts']);
  assert(!runtimeEntries.includes('README.md'));
  assert(!runtimeEntries.includes('tests'));
  assert(!runtimeEntries.includes('.env'));
});
