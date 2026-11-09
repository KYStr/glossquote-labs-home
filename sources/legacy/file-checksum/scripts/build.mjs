import { createHash } from 'node:crypto';
import {
  approvedDirectories, assertSafePath, containedPath, inspectTree,
  makeSafeDirectory, readSafeFile, requireCondition, writeOwnedFile,
} from './validation.mjs';
import {
  APPROVED_ASSETS, PRODUCTION_ORIGIN, PROJECT_ROOT, createReleaseContent, inspectReleaseTree,
  isEntryPoint, validateProject, validateReleaseOptions, validateReleaseSource,
} from './check.mjs';

export async function buildPreview(root = PROJECT_ROOT) {
  // Complete source/content checks and the whole destination preflight before mutation.
  const source = await validateProject(root);
  const destination = containedPath(root, 'dist');
  await inspectTree(destination, APPROVED_ASSETS, { requireAll: false, allowMissing: true });
  await assertSafePath(root);
  // Detect changed input before creating even an empty dist directory.
  for (const [name, bytes] of source.sources) {
    requireCondition(bytes.equals(await readSafeFile(containedPath(source.publicRoot, name))), 'SOURCE_CHANGED');
  }
  await makeSafeDirectory(destination);
  const directories = [...approvedDirectories(APPROVED_ASSETS)].filter(Boolean).sort((left, right) => left.split('/').length - right.split('/').length || left.localeCompare(right));
  for (const directory of directories) await makeSafeDirectory(containedPath(destination, directory));
  for (const [name, bytes] of source.sources) await writeOwnedFile(destination, name, bytes);
  await inspectTree(destination, APPROVED_ASSETS);
  const manifest = [];
  for (const [name, bytes] of source.sources) {
    const copied = await readSafeFile(containedPath(destination, name));
    requireCondition(copied.equals(bytes), 'BUILD_COPY_MISMATCH');
    manifest.push({ path: name, bytes: copied.length, sha256: createHash('sha256').update(copied).digest('hex') });
  }
  return { destination, manifest };
}
export async function buildRelease(root = PROJECT_ROOT, { mode = 'production', origin = PRODUCTION_ORIGIN } = {}) {
  validateReleaseOptions(mode, origin);
  const source = await validateProject(root);
  const releaseInputs = await validateReleaseSource(root);
  const content = createReleaseContent(source, mode, origin);
  const destination = containedPath(root, mode === 'production' ? 'dist-production' : 'dist-preview');
  await inspectReleaseTree(destination, mode, { requireAll: false, allowMissing: true });
  for (const [name, bytes] of source.sources) requireCondition(bytes.equals(await readSafeFile(containedPath(source.publicRoot, name))), 'SOURCE_CHANGED');
  for (const [name, bytes] of releaseInputs) requireCondition(bytes.equals(await readSafeFile(containedPath(root, name))), 'SOURCE_CHANGED');
  await makeSafeDirectory(destination);
  const directories = [...approvedDirectories([...content.keys()].filter(name => name !== '_headers' && name !== '_redirects'))]
    .filter(Boolean).sort((left, right) => left.split('/').length - right.split('/').length || left.localeCompare(right));
  for (const directory of directories) await makeSafeDirectory(containedPath(destination, directory));
  for (const [name, bytes] of content) await writeOwnedFile(destination, name, bytes);
  await inspectReleaseTree(destination, mode);
  const manifest = [];
  for (const [name, expected] of content) {
    const bytes = await readSafeFile(containedPath(destination, name));
    requireCondition(bytes.equals(expected), 'BUILD_COPY_MISMATCH');
    manifest.push({ path: name, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
  }
  return { mode, origin: mode === 'production' ? origin : null, destination, manifest };
}
if (isEntryPoint(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    const production = args[0] === '--production';
    requireCondition(args.length === 0 || production && args.length === 1
      || production && args.length === 3 && args[1] === '--origin', 'BUILD_ARGUMENT_INVALID');
    const result = await buildRelease(PROJECT_ROOT, { mode: production ? 'production' : 'preview', origin: args[2] ?? PRODUCTION_ORIGIN });
    if (!production) await buildPreview();
    console.log('PASS build: ' + result.mode + ' ' + result.manifest.length + ' exact assets into ' + result.destination
      + (production ? '' : '; legacy dist retains ten byte-exact preview assets'));
  } catch (error) {
    console.error(`FAIL build: ${error.code ?? 'BUILD_FAILED'}`);
    process.exitCode = 1;
  }
}
