import { mkdir, writeFile, lstat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, PUBLIC_FILES, sourceBytes, inspectTree } from './files.mjs';

export async function buildPreview(root = ROOT) {
  const input = await sourceBytes(join(root, 'public'));
  for (const file of ['index.html', 'en/index.html']) {
    const text = input.get(file).toString('utf8');
    if (!text.includes('<meta name="robots" content="noindex,nofollow">') || /rel=["']canonical/i.test(text)) throw new Error('PREVIEW_INDEX_POLICY');
  }
  const output = join(root, 'dist');
  try { await lstat(output); await inspectTree(output, { requireAll: false }); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  await mkdir(output, { recursive: true });
  // Preflight checks the entire existing tree before the first write; no stale/unknown file is deleted.
  for (const file of PUBLIC_FILES) {
    await mkdir(dirname(join(output, file)), { recursive: true });
    await writeFile(join(output, file), input.get(file));
  }
  await inspectTree(output);
  return { files: PUBLIC_FILES.length, bytes: [...input.values()].reduce((sum, bytes) => sum + bytes.length, 0) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { process.stdout.write(`${JSON.stringify({ preview: 'noindex,nofollow', ...await buildPreview() })}\n`); }
  catch (error) { process.stderr.write(`Build rejected: ${error.message}\n`); process.exitCode = 1; }
}
