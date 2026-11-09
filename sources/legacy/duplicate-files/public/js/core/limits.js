export const LIMITS = Object.freeze({ files: 200, fileBytes: 33_554_432, totalBytes: 134_217_728, chunkBytes: 65_536 });
export const ERROR_CODES = Object.freeze(['NO_FILES', 'TOO_MANY_FILES', 'FILE_TOO_LARGE', 'TOTAL_SIZE_LIMIT', 'READ_FAILED', 'DIGEST_FAILED', 'VERIFY_FAILED', 'CANCELED']);

export function errorResult(jobId, code, fileIndexes = []) {
  const safeCode = ERROR_CODES.includes(code) ? code : 'READ_FAILED';
  return {
    schemaVersion: 1, jobId, status: 'error',
    error: { code: safeCode, fileIndexes: [...new Set(fileIndexes.filter(index => Number.isSafeInteger(index) && index >= 0))].sort((a, b) => a - b), messageKey: `errors.${safeCode}` },
    files: [], groups: [], summary: null
  };
}

export function describeFiles(files) {
  return Array.from(files, (file, sourceIndex) => ({ sourceIndex, file, name: file.name, sizeBytes: file.size }));
}

export function validateSelection(files) {
  if (!Array.isArray(files)) return { ok: false, errors: [{ code: 'READ_FAILED', fileIndexes: [] }] };
  if (!files.length) return { ok: false, errors: [{ code: 'NO_FILES', fileIndexes: [] }] };
  if (files.length > LIMITS.files) return { ok: false, errors: [{ code: 'TOO_MANY_FILES', fileIndexes: [] }] };
  const invalid = [], tooLarge = [], seen = new Set();
  let total = 0;
  for (let position = 0; position < files.length; position++) {
    const item = files[position];
    const index = Number.isSafeInteger(item?.sourceIndex) && item.sourceIndex >= 0 ? item.sourceIndex : position;
    if (!item || Object.keys(item).sort().join(',') !== 'file,name,sizeBytes,sourceIndex'
      || !Number.isSafeInteger(item.sourceIndex) || item.sourceIndex < 0 || item.sourceIndex >= files.length || seen.has(item.sourceIndex)
      || typeof item.name !== 'string' || !Number.isSafeInteger(item.sizeBytes) || item.sizeBytes < 0
      || !item.file || item.file.size !== item.sizeBytes || item.file.name !== item.name
      || typeof item.file.arrayBuffer !== 'function' || typeof item.file.slice !== 'function') {
      invalid.push(index);
      continue;
    }
    seen.add(item.sourceIndex);
    total += item.sizeBytes;
    if (!Number.isSafeInteger(total)) invalid.push(index);
    if (item.sizeBytes > LIMITS.fileBytes) tooLarge.push(index);
  }
  if (invalid.length) return { ok: false, errors: [{ code: 'READ_FAILED', fileIndexes: [...new Set(invalid)].sort((a, b) => a - b) }] };
  const errors = [];
  if (tooLarge.length) errors.push({ code: 'FILE_TOO_LARGE', fileIndexes: tooLarge.sort((a, b) => a - b) });
  if (total > LIMITS.totalBytes) errors.push({ code: 'TOTAL_SIZE_LIMIT', fileIndexes: files.map(item => item.sourceIndex).sort((a, b) => a - b) });
  if (errors.length) return { ok: false, errors };
  return { ok: true, files: files.map(item => ({ sourceIndex: item.sourceIndex, file: item.file, name: item.name, sizeBytes: item.sizeBytes })).sort((a, b) => a.sourceIndex - b.sourceIndex) };
}
