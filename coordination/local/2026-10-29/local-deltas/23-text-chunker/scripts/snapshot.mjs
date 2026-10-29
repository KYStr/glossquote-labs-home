import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PUBLIC_FILES, manifest, walkPlain, validateTree, assertPlainPath } from './validation.mjs';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const evidence = path.resolve(project, '../../.runs/text-chunker/m1-2026-10-13-01a133ac');
await assertPlainPath(evidence);
const implementationFiles = (await walkPlain(project)).filter(file =>
  file === 'package.json' || file === '.gitignore' ||
  file.startsWith('public/') || ((file.startsWith('scripts/') || file.startsWith('test/')) && file.endsWith('.mjs'))
);
await validateTree(path.join(project, 'dist'));
const code = await manifest(project, implementationFiles);
const runtime = await manifest(path.join(project, 'public'), PUBLIC_FILES);
const dist = await manifest(path.join(project, 'dist'), PUBLIC_FILES);
if (dist.digest !== runtime.digest) throw new Error('DIST_RUNTIME_MISMATCH');
const write = (name, value) => writeFile(path.join(evidence, name), JSON.stringify(value, null, 2) + '\n');
await write('code-manifest.json', code);
await write('runtime-manifest.json', runtime);
await write('dist-manifest.json', dist);
if (process.argv.includes('--full-source')) {
  const sourceFiles = (await walkPlain(project)).filter(file => !file.startsWith('dist/'));
  const source = await manifest(project, sourceFiles);
  await write('source-manifest.json', source);
  console.log(JSON.stringify({ sourceDigest: source.digest, sourceFiles: source.records.length, codeDigest: code.digest, runtimeDigest: runtime.digest, distDigest: dist.digest }, null, 2));
} else console.log(JSON.stringify({ codeDigest: code.digest, codeFiles: code.records.length, runtimeDigest: runtime.digest, runtimeFiles: runtime.records.length, distDigest: dist.digest }, null, 2));
