import { mkdir, copyFile, readdir, writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const modules = (await readdir('src')).filter(name => name.endsWith('.mjs')).sort();
const files = ['index.html', 'en/index.html', 'style.css', ...modules.map(name => 'src/' + name)];
await mkdir('dist/src', { recursive: true });
await mkdir('dist/en', { recursive: true });
const manifest = [];
for (const file of files) {
  const target = join('dist', file);
  await copyFile(file, target);
  const bytes = await readFile(target);
  manifest.push({ path: file, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
}
await writeFile('BUILD-MANIFEST.json', JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify({
  files: files.length,
  bytes: manifest.reduce((total, file) => total + file.bytes, 0),
  output: 'dist',
  dependencies: 0,
}));
