// 可重現 preview 建置：把 public/ 原樣複製到 dist-preview/ 並寫入無時間戳的 SHA-256 清單。
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const sourceDir = path.join(root, 'public');

export async function listFiles(dir, base = dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(full, base));
    else if (entry.isFile()) files.push(path.relative(base, full).split(path.sep).join('/'));
  }
  return files;
}

export async function build(outDir = path.join(root, 'dist-preview')) {
  const names = await listFiles(sourceDir);
  await fs.rm(outDir, { recursive: true, force: true });
  await fs.mkdir(outDir, { recursive: true });
  const files = [];
  for (const name of names) {
    const bytes = await fs.readFile(path.join(sourceDir, name));
    const target = path.join(outDir, name);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, bytes);
    files.push({ path: name, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
  }
  const manifest = { format: 1, tool: 'svg-to-png-converter', files };
  await fs.writeFile(path.join(outDir, 'build-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  return manifest;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const manifest = await build();
  console.log(`built ${manifest.files.length} files into dist-preview/`);
}
