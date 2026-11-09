import { validateSelection, errorResult } from './limits.js';
import { compareFilesBytewise } from './compare.js';

export const ALGORITHM = 'size-sha256-byte-verify-v1';
export const webCryptoDigest = bytes => globalThis.crypto.subtle.digest('SHA-256', bytes);

export async function sha256Hex(bytes, digestProvider = webCryptoDigest) {
  if (!(bytes instanceof ArrayBuffer)) throw new Error('DIGEST_FAILED');
  const digest = await digestProvider(bytes);
  let view;
  if (digest instanceof ArrayBuffer) view = new Uint8Array(digest);
  else if (ArrayBuffer.isView(digest)) view = new Uint8Array(digest.buffer, digest.byteOffset, digest.byteLength);
  else throw new Error('DIGEST_FAILED');
  if (view.byteLength !== 32) throw new Error('DIGEST_FAILED');
  return Array.from(view, value => value.toString(16).padStart(2, '0')).join('');
}

export async function analyze(input, { jobId = 'job-1', digestProvider = webCryptoDigest, onProgress = () => {} } = {}) {
  const validation = validateSelection(input);
  if (!validation.ok) return errorResult(jobId, validation.errors[0].code, validation.errors[0].fileIndexes);
  const files = validation.files;
  const hashes = new Map(), sizeBuckets = new Map(), contentGroups = [];
  const progress = (stage, completedFiles) => onProgress({ stage, completedFiles, totalFiles: files.length });
  try {
    progress('hashing', 0);
    for (const item of files) {
      let bytes = null;
      try {
        try {
          bytes = await item.file.arrayBuffer();
          if (!(bytes instanceof ArrayBuffer) || bytes.byteLength !== item.sizeBytes) throw new Error('READ_FAILED');
        } catch { return errorResult(jobId, 'READ_FAILED', [item.sourceIndex]); }
        try { hashes.set(item.sourceIndex, await sha256Hex(bytes, digestProvider)); }
        catch { return errorResult(jobId, 'DIGEST_FAILED', [item.sourceIndex]); }
      } finally { bytes = null; }
      progress('hashing', item.sourceIndex + 1);
    }
    // Counts remain monotonic across phases. Verification keeps the completed
    // hash count at N; no results are available until every comparison finishes.
    progress('verifying', files.length);
    for (const item of files) {
      let hashBuckets = sizeBuckets.get(item.sizeBytes);
      if (!hashBuckets) { hashBuckets = new Map(); sizeBuckets.set(item.sizeBytes, hashBuckets); }
      const hash = hashes.get(item.sourceIndex);
      let candidates = hashBuckets.get(hash);
      if (!candidates) { candidates = []; hashBuckets.set(hash, candidates); }
      let matching;
      for (const candidate of candidates) {
        const representative = files[candidate.members[0]];
        try {
          if (await compareFilesBytewise(representative.file, item.file)) { matching = candidate; break; }
        } catch { return errorResult(jobId, 'VERIFY_FAILED', [representative.sourceIndex, item.sourceIndex]); }
      }
      if (matching) matching.members.push(item.sourceIndex);
      else {
        const group = { sizeBytes: item.sizeBytes, sha256: hash, members: [item.sourceIndex] };
        candidates.push(group); contentGroups.push(group);
      }
    }
    const groups = contentGroups.sort((a, b) => a.members[0] - b.members[0]).map((group, index) => ({
      groupId: `group-${String(index + 1).padStart(3, '0')}`, sizeBytes: group.sizeBytes, sha256: group.sha256,
      keeperSourceIndex: group.members[0], memberSourceIndexes: [...group.members],
      duplicateSourceIndexes: group.members.slice(1), savedBytes: group.sizeBytes * (group.members.length - 1)
    }));
    const membership = new Map();
    for (const group of groups) for (const index of group.memberSourceIndexes) membership.set(index, group);
    return {
      schemaVersion: 1, jobId, status: 'ready', algorithm: ALGORITHM,
      files: files.map(item => ({ sourceIndex: item.sourceIndex, name: item.name, sizeBytes: item.sizeBytes,
        sha256: hashes.get(item.sourceIndex), status: membership.get(item.sourceIndex).keeperSourceIndex === item.sourceIndex ? 'keep' : 'duplicate',
        keeperSourceIndex: membership.get(item.sourceIndex).keeperSourceIndex })),
      groups,
      summary: { selectedFileCount: files.length, uniqueContentCount: groups.length,
        duplicateFileCount: files.length - groups.length, savedBytes: groups.reduce((total, group) => total + group.savedBytes, 0) }
    };
  } finally {
    hashes.clear(); sizeBuckets.clear(); contentGroups.length = 0; files.length = 0;
  }
}
