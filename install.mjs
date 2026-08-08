#!/usr/bin/env node

import { realpathSync } from 'node:fs';
import { access, cp, mkdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const runtimeEntries = ['SKILL.md', 'agents', 'assets', 'references', 'scripts'];
export const skillName = 'aya-news-skill';
export const archiveBaseName = 'AyaNewsSkill';
const repositoryRoot = path.dirname(fileURLToPath(import.meta.url));

async function exists(target) {
  try { await access(target); return true; } catch { return false; }
}

function defaultTargetRoot(target = 'codex') {
  const homeDirectory = os.homedir();
  if (target === 'codex') return path.join(process.env.CODEX_HOME || path.join(homeDirectory, '.codex'), 'skills');
  if (target === 'agents') return path.join(homeDirectory, '.agents', 'skills');
  if (target === 'claude') return path.join(homeDirectory, '.claude', 'skills');
  throw new Error(`未知安装目标：${target}。可选 codex、agents、claude，或使用 --target-dir。`);
}

export async function installSkill(options = {}) {
  const sourceDir = path.resolve(options.sourceDir || repositoryRoot);
  const targetRoot = path.resolve(options.targetRoot || defaultTargetRoot(options.target));
  const installDir = path.join(targetRoot, skillName);
  if (await exists(installDir)) {
    if (!options.force) throw new Error(`目标已经存在：${installDir}。确认替换时使用 --force。`);
    await rm(installDir, { recursive: true, force: true });
  }
  await mkdir(installDir, { recursive: true });
  for (const entry of runtimeEntries) {
    const source = path.join(sourceDir, entry);
    if (!(await exists(source))) throw new Error(`发布包缺少必需文件：${entry}`);
    await cp(source, path.join(installDir, entry), { recursive: true });
  }
  return { installDir, targetRoot, skillName };
}

function parseArguments(argumentsList) {
  const parsed = {};
  for (let index = 0; index < argumentsList.length; index += 1) {
    const token = argumentsList[index];
    if (token === '--force') parsed.force = true;
    else if (token === '--target' || token === '--target-dir') {
      parsed[token.slice(2)] = argumentsList[index + 1];
      index += 1;
    } else if (token === '--help') parsed.help = true;
    else throw new Error(`未知参数：${token}`);
  }
  return parsed;
}

async function main() {
  try {
    const args = parseArguments(process.argv.slice(2));
    if (args.help) {
      process.stdout.write('Usage: node install.mjs [--target codex|agents|claude] [--target-dir PATH] [--force]\n');
      return;
    }
    const result = await installSkill({
      target: args.target || 'codex',
      targetRoot: args['target-dir'],
      force: Boolean(args.force)
    });
    process.stdout.write(`Installed ${result.skillName} to ${result.installDir}\n`);
    process.stdout.write(`Verify: node "${path.join(result.installDir, 'scripts', 'ainews.mjs')}" doctor\n`);
  } catch (error) {
    process.stderr.write(`Install failed: ${error.message}\n`);
    process.exitCode = 1;
  }
}

if (process.argv[1]
  && realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1])) {
  await main();
}
