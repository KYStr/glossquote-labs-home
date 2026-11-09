import { fileURLToPath } from 'node:url';
import { resolve, join } from 'node:path';
import { readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { validateSource, validateExistingBuild } from './validate.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
try {
  if (Number(process.versions.node.split('.')[0]) !== 24) throw new Error('NODE_24_REQUIRED');
  await validateSource(root);
  const built = await validateExistingBuild(root);
  async function syntax(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) await syntax(path);
      else if (entry.name.endsWith('.mjs')) {
        const checked = spawnSync(process.execPath, ['--check', path], { encoding: 'utf8', windowsHide: true });
        if (checked.error || checked.status !== 0) throw new Error('SYNTAX_CHECK_FAILED');
      }
    }
  }
  for (const directory of ['public', 'scripts', 'test']) await syntax(resolve(root, directory));
  process.stdout.write(JSON.stringify({ status: 'PASS', scope: 'static-source-and-syntax', assets: 13, existingBuild: built ? 'IDENTICAL' : 'NOT_YET_BUILT', browserEvidence: 'NOT_RUN_USER_FOCUS_INCIDENT' }) + '\n');
} catch { process.stderr.write('CHECK_FAILED\n'); process.exitCode = 1; }
