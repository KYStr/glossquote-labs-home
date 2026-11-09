import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readdir, readFile, mkdir, writeFile, lstat } from 'node:fs/promises';
import { join, dirname, relative, sep } from 'node:path';
import { ROOT } from './files.mjs';

const stage = process.argv[2];
if (!/^t0[0-4]$/.test(stage ?? '')) throw new Error('EXPECTED_STAGE_T00_T04');
const evidence = join(ROOT, 'evidence/m1');
await mkdir(evidence, { recursive: true });
let runId = stage;
for (let attempt = 2; ; attempt++) {
  try { await lstat(join(evidence, `${runId}-commands.json`)); runId = `${stage}-${String(attempt).padStart(2, '0')}`; }
  catch (error) { if (error.code === 'ENOENT') break; throw error; }
}
async function manifest() {
  const paths = [];
  async function visit(path) {
    for (const entry of await readdir(path, { withFileTypes: true })) {
      if (entry.isSymbolicLink()) throw new Error('UNSAFE_SOURCE');
      const full = join(path, entry.name);
      if (entry.isDirectory()) await visit(full);
      else if (entry.isFile()) paths.push(full);
      else throw new Error('UNSAFE_SOURCE');
    }
  }
  for (const dir of ['public', 'scripts', 'test', 'docs']) await visit(join(ROOT, dir));
  for (const file of ['.gitignore', 'package.json', 'AGENTS.md', 'PRODUCT.md', 'TECHNICAL.md', 'ACCEPTANCE.md', 'TASKS.md', 'UX-SEO.md', 'README.md', 'START-HERE.md', 'TASK-ENTRY.md']) paths.push(join(ROOT, file));
  const records = [];
  for (const path of paths.sort()) {
    const bytes = await readFile(path);
    records.push({ path: relative(ROOT, path).split(sep).join('/'), bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
  }
  return records;
}
const before = await manifest();
const npm = join(dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js');
await readFile(npm); // Use the installed Node distribution, without shell or package installation.
const commands = [];
const npmOptions = ['--offline', '--no-update-notifier', '--no-audit', '--no-fund'];
for (const args of [['test'], ['run', 'check'], ['run', 'build']]) {
  const result = spawnSync(process.execPath, [npm, ...npmOptions, ...args], { cwd: ROOT, shell: false, windowsHide: true, encoding: 'utf8', timeout: 120000 });
  const label = args.join('-');
  await writeFile(join(evidence, `${runId}-${label}.log`), `${result.stdout ?? ''}${result.stderr ?? ''}`, { encoding: 'utf8', flag: 'wx' });
  commands.push({ command: `npm ${args.join(' ')}`, npmOptions, invocation: [process.execPath, npm, ...npmOptions, ...args], exit: result.status, signal: result.signal, error: result.error?.code ?? null });
  console.log(JSON.stringify({ command: commands.at(-1).command, exit: result.status }));
  if (result.status !== 0) break;
}
const after = await manifest();
const unchanged = JSON.stringify(before) === JSON.stringify(after);
const digest = createHash('sha256').update(JSON.stringify(after)).digest('hex');
const result = { stage, runId, node: process.version, commands, sourceUnchanged: unchanged, files: after.length, bytes: after.reduce((n, f) => n + f.bytes, 0), manifestRecordsSha256: digest, status: commands.length === 3 && commands.every(c => c.exit === 0) && unchanged ? 'PASS' : 'FAIL' };
await writeFile(join(evidence, `${runId}-source-before.json`), JSON.stringify(before, null, 2) + '\n', { flag: 'wx' });
await writeFile(join(evidence, `${runId}-source-after.json`), JSON.stringify(after, null, 2) + '\n', { flag: 'wx' });
await writeFile(join(evidence, `${runId}-commands.json`), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(result));
if (result.status !== 'PASS') process.exitCode = 1;
