import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { PROJECT_ROOT, PUBLIC_FILES, inside, inspectTree, ProjectError } from './files.mjs';
import { checkProject } from './check.mjs';

export async function buildProject(root = PROJECT_ROOT, { syntax = true } = {}) {
  await checkProject(root, { syntax });
  const source = await inspectTree(path.join(root, 'public'));
  const destination = path.join(root, 'dist');
  // Refuse unknown/stale output and links before writing anything; never clean it.
  await inspectTree(destination, { complete: false, optional: true });
  await mkdir(destination, { recursive: true });
  for (const file of PUBLIC_FILES) {
    const target = inside(destination, file);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, source.get(file));
  }
  const built = await inspectTree(destination);
  for (const file of PUBLIC_FILES) if (!built.get(file).equals(source.get(file))) throw new ProjectError('BUILD_BYTES');
  return { files: built.size, bytes: [...built.values()].reduce((total, buffer) => total + buffer.length, 0) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try { const result = await buildProject(); process.stdout.write(`PASS preview build: ${result.files} exact public assets, ${result.bytes} bytes, noindex; dist/ only.\n`); }
  catch (error) { process.stderr.write(`FAIL build: ${error instanceof ProjectError ? error.code : 'BUILD_FAILED'}\n`); process.exitCode = 1; }
}
