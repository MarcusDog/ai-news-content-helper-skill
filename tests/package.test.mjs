import assert from 'node:assert/strict';
import { test } from 'node:test';

import { archiveBaseName, runtimeEntries, skillName } from '../install.mjs';

test('runtime package includes every required Agent Skill component and excludes repository-only files', () => {
  assert.deepEqual(runtimeEntries, ['SKILL.md', 'agents', 'assets', 'references', 'scripts']);
  assert(!runtimeEntries.includes('README.md'));
  assert(!runtimeEntries.includes('tests'));
  assert(!runtimeEntries.includes('.env'));
});

test('canonical package names stay stable while the repository brand is AyaNewsSkill', () => {
  assert.equal(skillName, 'aya-news-skill');
  assert.equal(archiveBaseName, 'AyaNewsSkill');
});
