import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { mkdir, lstat, readFile, writeFile } from 'node:fs/promises';
import { validateSource } from './validate.mjs';
import { inspectTree, compareTrees, sha256 } from './files.mjs';
import { ASSETS } from './manifest.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
try {
  await validateSource(root);
  const destination = join(root, 'dist');
  try { await lstat(destination); await inspectTree(destination, true); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  await mkdir(join(destination, 'en'), { recursive: true });
  for (const file of ASSETS) await writeFile(join(destination, file), await readFile(join(root, 'public', file)));
  const files = await compareTrees(join(root, 'public'), destination);
  // Inventories are stdout evidence, never served from the assets directory.
  const inventorySha256 = sha256(JSON.stringify(files) + '\n');
  process.stdout.write(JSON.stringify({ status: 'PASS', target: 'dist', mode: 'preview-noindex', inventorySha256, files }, null, 2) + '\n');
} catch { process.stderr.write('BUILD_FAILED\n'); process.exitCode = 1; }
