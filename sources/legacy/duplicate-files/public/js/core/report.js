import { ALGORITHM } from './analyze.js';

export function chooseKeeper(result, groupId, sourceIndex) {
  if (result?.status !== 'ready') return result;
  const selected = result.groups.find(group => group.groupId === groupId);
  if (!selected || selected.memberSourceIndexes.length < 2 || !selected.memberSourceIndexes.includes(sourceIndex) || selected.keeperSourceIndex === sourceIndex) return result;
  return {
    ...result,
    files: result.files.map(file => selected.memberSourceIndexes.includes(file.sourceIndex)
      ? { ...file, status: file.sourceIndex === sourceIndex ? 'keep' : 'duplicate', keeperSourceIndex: sourceIndex } : { ...file }),
    groups: result.groups.map(group => group.groupId === groupId ? { ...group, keeperSourceIndex: sourceIndex,
      memberSourceIndexes: [...group.memberSourceIndexes], duplicateSourceIndexes: group.memberSourceIndexes.filter(index => index !== sourceIndex) }
      : { ...group, memberSourceIndexes: [...group.memberSourceIndexes], duplicateSourceIndexes: [...group.duplicateSourceIndexes] }),
    summary: { ...result.summary }
  };
}

export function reportObject(result) {
  if (result?.status !== 'ready' || result.algorithm !== ALGORITHM) throw new Error('REPORT_NOT_READY');
  return {
    schemaVersion: 1, kind: 'glossquote-duplicate-report', algorithm: ALGORITHM,
    files: result.files.map(file => ({ sourceIndex: file.sourceIndex, name: file.name, sizeBytes: file.sizeBytes,
      sha256: file.sha256, status: file.status, keeperSourceIndex: file.keeperSourceIndex })),
    groups: result.groups.map(group => ({ groupId: group.groupId, sizeBytes: group.sizeBytes, sha256: group.sha256,
      keeperSourceIndex: group.keeperSourceIndex, memberSourceIndexes: [...group.memberSourceIndexes],
      duplicateSourceIndexes: [...group.duplicateSourceIndexes], savedBytes: group.savedBytes })),
    summary: { selectedFileCount: result.summary.selectedFileCount, uniqueContentCount: result.summary.uniqueContentCount,
      duplicateFileCount: result.summary.duplicateFileCount, savedBytes: result.summary.savedBytes }
  };
}

export const serializeJSON = result => JSON.stringify(reportObject(result), null, 2) + '\n';

export function serializeTXT(result) {
  const report = reportObject(result), summary = report.summary;
  return [
    'Duplicate file report', `Files: ${summary.selectedFileCount}`, `Unique contents: ${summary.uniqueContentCount}`,
    `Duplicate files: ${summary.duplicateFileCount}`, `Potential space saved: ${summary.savedBytes} bytes`, '',
    'STATUS\tSOURCE_INDEX\tNAME_JSON\tSIZE_BYTES\tSHA256\tKEEPER_SOURCE_INDEX',
    ...report.files.map(file => [file.status === 'keep' ? 'KEEP' : 'DUPLICATE', file.sourceIndex,
      JSON.stringify(file.name), file.sizeBytes, file.sha256, file.keeperSourceIndex === null ? 'null' : file.keeperSourceIndex].join('\t'))
  ].join('\n') + '\n';
}

export function visibleName(name) {
  return name.replace(/[\u0000-\u001f\u007f-\u009f\u061c\u200e\u200f\u202a-\u202e\u2066-\u206f]/g,
    character => `\\u${character.charCodeAt(0).toString(16).padStart(4, '0')}`);
}
