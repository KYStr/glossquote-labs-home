import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { mkdir, lstat, writeFile } from 'node:fs/promises';
import { assertNode } from './files.mjs';
import { inspectProduction, readExpectedProduction, checkProduction } from './production-lib.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
try {
  if (Number(process.versions.node.split('.')[0]) !== 24) throw new Error('NODE_24_REQUIRED');
  if (process.argv.slice(2).some(arg => arg !== '--check')) throw new Error('INVALID_ARGUMENT');
  if (!process.argv.includes('--check')) {
    const expected = await readExpectedProduction(root); const destination = join(root, 'dist-production');
    try { await lstat(destination); await inspectProduction(destination, true); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    await mkdir(join(destination, 'en'), { recursive: true });
    for (const [file, bytes] of expected.output) await writeFile(join(destination, file), bytes);
    const manifest = join(root, 'release-manifest.json');
    try { assertNode(await lstat(manifest), false); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    await writeFile(manifest, JSON.stringify(expected.manifest, null, 2) + '\n');
  }
  const checked = await checkProduction(root);
  process.stdout.write(JSON.stringify({ status: 'PASS', mode: process.argv.includes('--check') ? 'check-production' : 'build-production', deployed: false,
    assets: checked.files.length, assetInventorySha256: checked.manifest.assetInventorySha256, m1PublicInventorySha256: checked.manifest.m1PublicInventorySha256,
    bodyChanges: checked.manifest.bodyChanges, jsonLd: checked.manifest.jsonLd }, null, 2) + '\n');
} catch (error) { process.stderr.write(`PRODUCTION_FAILED: ${String(error.message).slice(0, 400)}\n`); process.exitCode = 1; }
