// 驗證 dist-preview/ 與全新重建逐位元相同（含 manifest）。
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { build, listFiles, root } from './build.mjs';

const generatedDir = path.join(root, 'dist-preview');
const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'svg-to-png-preview-'));
try {
  await build(tempDir);
  const expected = await listFiles(tempDir);
  const actual = await listFiles(generatedDir);
  assert.deepEqual(actual, expected, 'dist-preview file list differs from a fresh build');
  for (const name of expected) {
    const a = await fs.readFile(path.join(generatedDir, name));
    const b = await fs.readFile(path.join(tempDir, name));
    assert.ok(a.equals(b), `dist-preview/${name} differs from a fresh build`);
  }
  console.log(`generated preview verified: ${expected.length} files byte-identical to a fresh build`);
} finally {
  await fs.rm(tempDir, { recursive: true, force: true });
}
