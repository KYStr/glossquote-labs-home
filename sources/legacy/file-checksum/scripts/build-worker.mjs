import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { assertSafePath, containedPath, readSafeFile, requireCondition, writeOwnedFile } from './validation.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
export function renderWorkerSource(bytes) {
  let source;
  try { source = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes); }
  catch { requireCondition(false, 'WORKER_UTF8_INVALID'); }
  requireCondition(Buffer.from(source, 'utf8').equals(bytes), 'WORKER_UTF8_ROUNDTRIP');
  return Buffer.from(`export const WORKER_SOURCE = ${JSON.stringify(source)};\n`, 'utf8');
}
export async function verifyWorkerSource(root = ROOT) {
  const original = await readSafeFile(containedPath(root, 'public/js/hash.worker.mjs'));
  const generated = await readSafeFile(containedPath(root, 'public/js/worker-source.mjs'));
  requireCondition(generated.equals(renderWorkerSource(original)), 'WORKER_SOURCE_STALE');
  return { bytes: original.length, sha256: createHash('sha256').update(original).digest('hex') };
}
export async function generateWorkerSource(root = ROOT) {
  await assertSafePath(root);
  const source = containedPath(root, 'public/js/hash.worker.mjs');
  const bytes = await readSafeFile(source);
  const generated = renderWorkerSource(bytes);
  requireCondition(bytes.equals(await readSafeFile(source)), 'SOURCE_CHANGED');
  await writeOwnedFile(containedPath(root, 'public'), 'js/worker-source.mjs', generated);
  return verifyWorkerSource(root);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = await generateWorkerSource();
    console.log(`PASS build-worker: fixed first-party source (${result.bytes} UTF-8 bytes)`);
  } catch (error) {
    console.error(`FAIL build-worker: ${error.code ?? 'WORKER_GENERATION_FAILED'}`);
    process.exitCode = 1;
  }
}
