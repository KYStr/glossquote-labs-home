import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { ROOT, PUBLIC_FILES, listSafeFiles, requireNode24 } from './assets.mjs';
import { parseCsv } from '../public/js/core/csv.mjs';
import { compileTemplate } from '../public/js/core/template.mjs';
import { renderBatch } from '../public/js/core/render.mjs';
import { serializeBatch, FILENAMES } from '../public/js/core/export.mjs';

requireNode24();
const evidence = path.join(ROOT, 'evidence/m1');
await mkdir(evidence, { recursive: true });
const testFiles = (await readdir(path.join(ROOT, 'test'))).filter(file => file.endsWith('.test.mjs')).sort().map(file => `test/${file}`);
const steps = [
  { name: 'tests', args: ['--test', '--test-reporter=tap', ...testFiles] },
  { name: 'check', args: ['scripts/check.mjs'] },
  { name: 'build', args: ['scripts/build.mjs'] },
];
const commands = [];
for (const step of steps) {
  const run = spawnSync(process.execPath, step.args, { cwd: ROOT, shell: false, windowsHide: true, encoding: 'utf8', maxBuffer: 5 * 1024 * 1024 });
  await writeFile(path.join(evidence, `final-${step.name}.log`), `${run.stdout ?? ''}${run.stderr ?? ''}`);
  const entry = { command: `node ${step.args.join(' ')}`, exitCode: run.status, signal: run.signal ?? null };
  if (step.name === 'tests') for (const key of ['tests', 'pass', 'fail', 'skipped']) entry[key] = Number(run.stdout?.match(new RegExp(`^# ${key} (\\d+)$`, 'm'))?.[1] ?? -1);
  commands.push(entry);
  process.stdout.write(`${step.name}: exit ${run.status}${step.name === 'tests' ? `, ${entry.pass}/${entry.tests} passed` : ''}\n`);
  if (run.status !== 0 || run.error) {
    await writeFile(path.join(evidence, 'final-gates.json'), `${JSON.stringify({ status: 'FAIL', commands }, null, 2)}\n`);
    process.exitCode = 1;
    break;
  }
}
if (!process.exitCode) {
  const sample = parseCsv(new TextEncoder().encode('Name,ID,Time\r\nAlex,001,10:00\r\nSam,002,11:00'));
  const template = 'Hello {{Name}},\nYour event ID is {{ID}}. Please arrive at {{Time}}.';
  const sampleBatch = await renderBatch(sample.rows, compileTemplate(template, sample.headers));
  const sampleOutput = serializeBatch(sampleBatch, { template, headers: sample.headers, allowBlank: false, language: 'en' });
  await mkdir(path.join(evidence, 'synthetic-exports'), { recursive: true });
  for (const key of ['txt', 'json']) await writeFile(path.join(evidence, 'synthetic-exports', FILENAMES[key]), sampleOutput[key]);
  const sourceFiles = ['package.json', '.gitignore',
    ...PUBLIC_FILES.map(file => `public/${file}`),
    ...(await listSafeFiles(path.join(ROOT, 'scripts'))).map(file => `scripts/${file}`),
    ...(await listSafeFiles(path.join(ROOT, 'test'))).map(file => `test/${file}`),
  ].sort();
  const manifest = [];
  const hash = data => createHash('sha256').update(data).digest('hex');
  for (const file of sourceFiles) {
    const bytes = await readFile(path.join(ROOT, file));
    manifest.push({ path: file, bytes: bytes.byteLength, sha256: hash(bytes) });
  }
  const sourceTreeSha256 = hash(manifest.map(item => `${item.path}\0${item.bytes}\0${item.sha256}\n`).join(''));
  const dist = [];
  for (const file of PUBLIC_FILES) {
    const bytes = await readFile(path.join(ROOT, 'dist', file));
    const publicBytes = await readFile(path.join(ROOT, 'public', file));
    if (!bytes.equals(publicBytes)) throw new Error('Built asset differs from public source.');
    dist.push({ path: `dist/${file}`, bytes: bytes.byteLength, sha256: hash(bytes) });
  }
  const summary = { status: 'PASS', milestone: 'M1-local-candidate', node: process.versions.node, commands,
    sourceTreeSha256, sourceFiles: manifest.length, distFiles: dist.length, syntheticExportBytes: sampleOutput.combinedBytes,
    browser: 'NOT_RUN_USER_FOCUS_INCIDENT', realNetwork: 'NOT_RUN_USER_FOCUS_INCIDENT', realStorage: 'NOT_RUN_USER_FOCUS_INCIDENT',
    sourcePublication: 'NOT_PUBLISHED', hosting: 'NOT_DEPLOYED',
  };
  await writeFile(path.join(evidence, 'source-manifest.json'), `${JSON.stringify({ algorithm: 'sha256(sorted path + NUL + bytes + NUL + file-sha256 + LF)', sourceTreeSha256, files: manifest, dist }, null, 2)}\n`);
  await writeFile(path.join(evidence, 'final-gates.json'), `${JSON.stringify(summary, null, 2)}\n`);
  process.stdout.write(`source tree: ${sourceTreeSha256}\n`);
}
