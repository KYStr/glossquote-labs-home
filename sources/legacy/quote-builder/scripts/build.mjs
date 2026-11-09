import { copyFile, lstat, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { root, inspectTree, publicFiles } from './files.mjs';

export async function buildPreview({ source = path.join(root, 'public'), destination = path.join(root, 'dist') } = {}) {
  await inspectTree(source);
  for (const page of ['index.html', 'en/index.html']) {
    const html = await readFile(path.join(source, page), 'utf8');
    if (!html.includes('<meta name="robots" content="noindex,nofollow">') || /\b(?:canonical|hreflang)\b/.test(html)) throw new Error('PREVIEW_METADATA');
  }
  try {
    await lstat(destination);
    await inspectTree(destination, { complete: false });
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  await mkdir(destination, { recursive: true });
  for (const file of publicFiles) {
    await mkdir(path.dirname(path.join(destination, file)), { recursive: true });
    await copyFile(path.join(source, file), path.join(destination, file));
  }
  await inspectTree(destination);
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await buildPreview();
  console.log(`PASS: copied ${publicFiles.length} allowlisted preview files; no unknown output removed.`);
}
