#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { archiveBaseName, runtimeEntries, skillName } from './install.mjs';

const repositoryRoot = path.dirname(fileURLToPath(import.meta.url));
const outputDirectory = path.join(repositoryRoot, 'dist');
const stageDirectory = path.join(outputDirectory, 'stage');
const stagedSkill = path.join(stageDirectory, skillName);

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit', ...options });
    child.once('error', reject);
    child.once('exit', (code) => code === 0 ? resolve() : reject(new Error(`${command} exited with ${code}`)));
  });
}

async function checksum(filePath) {
  const contents = await readFile(filePath);
  return createHash('sha256').update(contents).digest('hex');
}

async function main() {
  await rm(outputDirectory, { recursive: true, force: true });
  await mkdir(stagedSkill, { recursive: true });
  for (const entry of runtimeEntries) {
    await cp(path.join(repositoryRoot, entry), path.join(stagedSkill, entry), { recursive: true });
  }

  const zipPath = path.join(outputDirectory, `${archiveBaseName}.zip`);
  const tarPath = path.join(outputDirectory, `${archiveBaseName}.tar.gz`);
  await run('zip', ['-qr', zipPath, skillName], { cwd: stageDirectory });
  await run('tar', ['-czf', tarPath, skillName], { cwd: stageDirectory });
  const sums = [
    `${await checksum(zipPath)}  ${path.basename(zipPath)}`,
    `${await checksum(tarPath)}  ${path.basename(tarPath)}`
  ].join('\n');
  await writeFile(path.join(outputDirectory, 'SHA256SUMS'), `${sums}\n`, 'utf8');
  await rm(stageDirectory, { recursive: true, force: true });
  process.stdout.write(`Created:\n- ${zipPath}\n- ${tarPath}\n- ${path.join(outputDirectory, 'SHA256SUMS')}\n`);
}

await main();
