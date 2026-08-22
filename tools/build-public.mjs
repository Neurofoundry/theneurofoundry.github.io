import { cp, mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputRoot = path.join(repoRoot, 'public');

const publicFiles = [
  'CNAME',
  'ads.txt',
  'ai-plugin.json',
  'anvil.png',
  'auth-client.js',
  'chatbot-component.js',
  'chatbot.config.yaml',
  'embers-effect.js',
  'index.html',
  'openapi.yaml',
  'robots.txt',
  'reticon-showcase.png',
  'sieve-showcase.png',
  'site.webmanifest',
  'thskey.png'
];

const publicDirectories = [
  '.well-known',
  'about',
  'assets',
  'auth',
  'checkout',
  'common',
  'docs',
  'resume-builder',
  'services',
  'shared'
];

const publicDirectoryFiles = {
  downloads: ['index.html', 'SkeletonKeySetup.exe', 'SieveSetup.exe', 'API-Pulse-v1.0.0.zip'],
  members: [
    'login',
    'profile',
    'reset-password',
    'signup',
    'verify-email'
  ],
  workshop: ['index.html', 'assets']
};

const blockedNames = new Set([
  '.env',
  '.git',
  '.github',
  'data',
  'node_modules',
  'prompts',
  'server',
  'tools',
  'workers'
]);

async function copyRelative(relativePath) {
  const source = path.join(repoRoot, relativePath);
  const destination = path.join(outputRoot, relativePath);
  await mkdir(path.dirname(destination), { recursive: true });
  await cp(source, destination, { recursive: true, force: true });
}

async function assertBoundary() {
  const entries = await readdir(outputRoot, { withFileTypes: true });
  const blocked = entries
    .filter((entry) => blockedNames.has(entry.name))
    .map((entry) => entry.name);

  if (blocked.length > 0) {
    throw new Error(`Blocked paths entered public output: ${blocked.join(', ')}`);
  }

  for (const relativePath of [
    'data/auth-users.json',
    'server/index.js',
    'package.json',
    '.env'
  ]) {
    try {
      await stat(path.join(outputRoot, relativePath));
      throw new Error(`Sensitive path entered public output: ${relativePath}`);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
}

await rm(outputRoot, { recursive: true, force: true });
await mkdir(outputRoot, { recursive: true });

for (const relativePath of publicFiles) {
  await copyRelative(relativePath);
}

for (const relativePath of publicDirectories) {
  await copyRelative(relativePath);
}

for (const [directory, entries] of Object.entries(publicDirectoryFiles)) {
  for (const entry of entries) {
    await copyRelative(path.join(directory, entry));
  }
}

const forgeRedirectDirectory = path.join(outputRoot, 'Forge');
await mkdir(forgeRedirectDirectory, { recursive: true });
await writeFile(
  path.join(forgeRedirectDirectory, 'index.html'),
  '<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=https://forge.theneurofoundry.com/"><link rel="canonical" href="https://forge.theneurofoundry.com/"><title>Opening The Forge</title><a href="https://forge.theneurofoundry.com/">Open The Forge</a>\n',
  'utf8'
);

await assertBoundary();
console.log(`Built public artifact at ${outputRoot}`);
