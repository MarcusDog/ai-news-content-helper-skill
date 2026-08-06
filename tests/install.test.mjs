import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { test } from 'node:test';

import { installSkill } from '../install.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const execFileAsync = promisify(execFile);

test('installer copies only runtime skill files and protects an existing installation', async () => {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'ainews-skill-install-'));
  try {
    const result = await installSkill({ sourceDir: projectRoot, targetRoot: temporaryRoot });
    const skillText = await readFile(path.join(result.installDir, 'SKILL.md'), 'utf8');
    const cliText = await readFile(path.join(result.installDir, 'scripts', 'ainews.mjs'), 'utf8');

    assert.match(skillText, /ai-news-content-helper/);
    assert.match(cliText, /AiNewsClient/);
    const { stdout } = await execFileAsync(process.execPath, [path.join(result.installDir, 'scripts', 'ainews.mjs'), '--help']);
    assert.match(stdout, /AI News Content Helper CLI/);
    await assert.rejects(
      installSkill({ sourceDir: projectRoot, targetRoot: temporaryRoot }),
      /已经存在/
    );

    const forced = await installSkill({ sourceDir: projectRoot, targetRoot: temporaryRoot, force: true });
    assert.equal(forced.installDir, result.installDir);
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});
