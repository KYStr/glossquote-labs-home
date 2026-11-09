import { lstat, mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { root, inventory } from './assets.mjs';
import { expectedProduction, manifestFor, verifyProduction, verifyPreviewIfPresent, auditProduction } from './production.mjs';

try {
  await verifyPreviewIfPresent();
  const files = await expectedProduction(); auditProduction(files);
  const dir = join(root,'dist-production');
  let exists = false;
  try { await lstat(dir); exists = true; } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (exists && (await inventory(dir)).some(path => !files.has(path) && path !== 'manifest.json')) throw Error('unknown-production-file');
  await mkdir(dir,{recursive:true});
  for (const [path,bytes] of files) { const output=join(dir,path); await mkdir(dirname(output),{recursive:true}); await writeFile(output,bytes); }
  await writeFile(join(dir,'manifest.json'), JSON.stringify(manifestFor(files),null,2)+'\n');
  await verifyProduction(); await verifyPreviewIfPresent();
  process.stdout.write(`PASS production build: ${files.size} files; preview unchanged\n`);
} catch { process.stderr.write('FAIL production build\n'); process.exitCode=1; }
