import { cp, mkdir, lstat, realpath, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkProject, walk } from './check.mjs';
import { inside, projectRoot, publicRoot } from './serve.mjs';
import { verifyAssets } from './verify-assets.mjs';

export async function build() {
  await checkProject();
  const root = await realpath(projectRoot);
  const destination = path.resolve(root, 'dist');
  const files = await walk(publicRoot);
  for (const file of files) if (!['.html', '.css', '.mjs', '.js', '.json', '.txt', '.svg', '.ico', '.png', '.wasm', '.onnx', '.bin'].includes(path.extname(file))) throw new Error('UNAPPROVED_BUILD_FILE');
  if (!inside(root, destination) || path.relative(root, destination) !== 'dist') throw new Error('UNSAFE_BUILD_DESTINATION');
  try {
    const info = await lstat(destination);
    if (info.isSymbolicLink() || !(info.isDirectory()) || await realpath(destination) !== destination) throw new Error('UNSAFE_BUILD_DESTINATION');
    await rm(destination, { recursive: true });
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  await mkdir(destination);
  for (const file of files) {
    const relative = path.relative(publicRoot, file);
    const target = path.join(destination, relative);
    await mkdir(path.dirname(target), { recursive: true });
    await cp(file, target, { dereference: false, errorOnExist: true });
  }
  await verifyAssets(destination);
  return files.length;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { console.log(`BUILD PASS: ${await build()} public files copied to dist`); }
  catch (error) { console.error(`BUILD FAIL: ${error.message}`); process.exitCode = 1; }
}
