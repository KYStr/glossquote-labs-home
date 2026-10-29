import { readFile, writeFile, mkdir, readdir, lstat } from 'node:fs/promises';
import { join, resolve, posix } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { ROOT, PUBLIC_FILES, inspectTree } from './files.mjs';
import { calculateBackplan } from '../public/js/core/backplan.mjs';
import { serializePlan } from '../public/js/core/output.mjs';

const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const makeTask = (id, durationWorkdays, predecessors = [], name = `Synthetic ${id}`) => ({ id, durationWorkdays, predecessors, name });
const base = { deadline: '2026-10-23', workweek: [1, 2, 3, 4, 5], holidays: [] };

export async function writeEvidence() {
  const destination = join(ROOT, 'evidence', 'm1');
  const fixtures = [
    { folder: 'A01-zh', locale: 'zh-Hant', input: { ...base, tasks: [makeTask('A', 2, [], '準備（合成）'), makeTask('B', 3, ['A'], '審稿（合成）')] }, anchor: '2026-10-19', critical: ['A', 'B'],
      expected: [['2026-10-19', '2026-10-20', '2026-10-19', '2026-10-20', 0], ['2026-10-21', '2026-10-23', '2026-10-21', '2026-10-23', 0]] },
    { folder: 'A19-en', locale: 'en', input: { ...base, tasks: [makeTask('A', 2), makeTask('B', 5), makeTask('C', 1, ['A', 'B'])] }, anchor: '2026-10-16', critical: ['B', 'C'],
      expected: [['2026-10-16', '2026-10-19', '2026-10-21', '2026-10-22', 3], ['2026-10-16', '2026-10-22', '2026-10-16', '2026-10-22', 0], ['2026-10-23', '2026-10-23', '2026-10-23', '2026-10-23', 0]] },
    { folder: 'A17-adjusted-en', locale: 'en', input: { ...base, deadline: '2000-01-01', workweek: [6], holidays: ['2000-01-01'], tasks: [makeTask('A', 1)] }, anchor: '1999-12-25', critical: ['A'],
      expected: [['1999-12-25', '1999-12-25', '1999-12-25', '1999-12-25', 0]] }
  ];
  const artifacts = [];
  for (const fixture of fixtures) {
    const folder = join(destination, 'outputs', fixture.folder);
    await mkdir(folder, { recursive: true });
    const plan = calculateBackplan(fixture.input);
    const pair = serializePlan(plan, { locale: fixture.locale });
    if (!pair.ok) throw new Error('EVIDENCE_SERIALIZATION');
    const actual = plan.tasks.map(t => [t.ES, t.EF, t.LS, t.LF, t.slackWorkdays]);
    if (plan.anchor !== fixture.anchor || JSON.stringify(plan.criticalTaskIds) !== JSON.stringify(fixture.critical) || JSON.stringify(actual) !== JSON.stringify(fixture.expected)) throw new Error('EVIDENCE_ORACLE');
    for (const file of [pair.json, pair.txt]) {
      const path = join(folder, file.filename);
      await writeFile(path, file.text, 'utf8');
      const bytes = await readFile(path);
      if (bytes.toString('utf8') !== file.text || bytes.length !== file.bytes) throw new Error('EVIDENCE_BYTES');
      if (file.filename.endsWith('.json') && JSON.stringify(JSON.parse(bytes.toString('utf8'))) !== JSON.stringify(plan)) throw new Error('EVIDENCE_JSON');
      if (file.filename.endsWith('.txt')) for (const t of plan.tasks) {
        const fields = [t.id, t.name, String(t.durationWorkdays), ...[t.ES, t.EF, t.LS, t.LF], String(t.slackWorkdays)];
        const row = file.text.split('\n').find(line => line.startsWith(`${t.id}\t`));
        if (!row || fields.some(field => !row.split('\t').includes(field))) throw new Error('EVIDENCE_TXT');
      }
      artifacts.push({ path: `outputs/${fixture.folder}/${file.filename}`, bytes: bytes.length, sha256: digest(bytes), oracle: 'PASS' });
    }
    await writeFile(join(folder, 'synthetic-input.json'), JSON.stringify(fixture.input, null, 2) + '\n');
  }
  await writeFile(join(destination, 'output-manifest.json'), JSON.stringify({ schema: 'gq.backplan.m1.outputs', version: 1, artifacts }, null, 2) + '\n');
  return { artifacts: artifacts.length, oracle: 'PASS', scope: 'Node-produced synthetic files, not browser downloads' };
}

export async function freezeCandidate() {
  const paths = ['package.json', '.gitignore', 'HANDOFF.md', 'TASK-ENTRY.md', 'AGENTS.md', 'START-HERE.md', 'README.md', 'PRODUCT.md', 'TECHNICAL.md', 'UX-SEO.md', 'ACCEPTANCE.md', 'TASKS.md'];
  for (const dir of ['docs', 'scripts', 'test']) for (const name of await readdir(join(ROOT, dir))) {
    const relative = `${dir}/${name}`;
    const stat = await lstat(join(ROOT, relative));
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('FREEZE_BOUNDARY');
    paths.push(relative);
  }
  for (const directory of ['public', 'dist']) {
    await inspectTree(join(ROOT, directory));
    paths.push(...PUBLIC_FILES.map(file => `${directory}/${file}`));
  }
  const files = [];
  for (const path of paths.sort()) {
    if (path.startsWith('/') || path.includes('\\') || posix.normalize(path) !== path || path.split('/').includes('..')) throw new Error('UNSAFE_MANIFEST_PATH');
    const bytes = await readFile(join(ROOT, path));
    files.push({ path, bytes: bytes.length, sha256: digest(bytes) });
  }
  for (const file of PUBLIC_FILES) {
    const source = files.find(f => f.path === `public/${file}`);
    const output = files.find(f => f.path === `dist/${file}`);
    if (source.sha256 !== output.sha256 || source.bytes !== output.bytes) throw new Error('DIST_SOURCE_MISMATCH');
  }
  const destination = join(ROOT, 'evidence', 'm1');
  const manifest = JSON.stringify({ schema: 'gq.backplan.m1.candidate', version: 1, date: '2026-10-23', publicFiles: PUBLIC_FILES.length, previewOnly: true, files }, null, 2) + '\n';
  await writeFile(join(destination, 'candidate-manifest.json'), manifest, 'utf8');
  await writeFile(join(destination, 'candidate-manifest.sha256'), `${digest(Buffer.from(manifest))}  candidate-manifest.json\n`);
  // Re-read the complete freeze set; no document or source path may change during capture.
  for (const file of files) {
    const bytes = await readFile(join(ROOT, file.path));
    if (bytes.length !== file.bytes || digest(bytes) !== file.sha256) throw new Error('FREEZE_DRIFT');
  }
  return { files: files.length, publicFiles: PUBLIC_FILES.length, manifestSha256: digest(Buffer.from(manifest)) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    if (process.argv[2] === 'outputs') process.stdout.write(`${JSON.stringify(await writeEvidence())}\n`);
    else if (process.argv[2] === 'freeze') process.stdout.write(`${JSON.stringify(await freezeCandidate())}\n`);
    else throw new Error('Use outputs or freeze');
  } catch (error) { process.stderr.write(`Evidence rejected: ${error.message}\n`); process.exitCode = 1; }
}
