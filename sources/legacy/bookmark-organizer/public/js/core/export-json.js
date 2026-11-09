import { PROFILE } from './errors.js';
import { exportHtml } from './export-html.js';
export function exportJson(job) {
  const bookmarks = [...job.bookmarks].sort((a, b) => a.sourceIndex - b.sourceIndex).map(item => ({ sourceIndex: item.sourceIndex, title: item.title, href: item.href, originalFolderPath: item.originalFolderPath.slice(), folderPath: item.folderPath.slice(), included: item.included, duplicateGroupId: item.duplicateGroupId, suggestedKeeper: item.suggestedKeeper }));
  const duplicateGroups = job.duplicateGroups.map(item => ({ groupId: item.groupId, exactHref: item.exactHref, memberSourceIndexes: item.memberSourceIndexes.slice(), suggestedKeeperSourceIndex: item.suggestedKeeperSourceIndex }));
  return JSON.stringify({ schemaVersion: 1, kind: 'glossquote-bookmark-organizer-backup', parserProfile: PROFILE, bookmarks, duplicateGroups }, null, 2) + '\n';
}
// Invoked only in the explicit download event path, never during preview.
export function createOutputs(job) {
  return { exportHtml: new Blob([new TextEncoder().encode(exportHtml(job))], { type: 'text/html;charset=utf-8' }), backupJson: new Blob([new TextEncoder().encode(exportJson(job))], { type: 'application/json;charset=utf-8' }) };
}
