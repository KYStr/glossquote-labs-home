import { fail } from './errors.js';
export function validatePath(path, offset = 0) {
  if (!Array.isArray(path) || path.length > 12) fail('DEPTH_LIMIT', offset);
  for (const segment of path) {
    if (typeof segment !== 'string' || segment === '' || segment === '.' || segment === '..' || /[\u0000-\u001f\u007f-\u009f]/.test(segment) || new TextEncoder().encode(segment).byteLength > 255) fail('INVALID_STRUCTURE', offset);
  }
  return path.slice();
}
export function groupBookmarks(bookmarks) {
  const byHref = new Map();
  for (const bookmark of bookmarks) {
    let group = byHref.get(bookmark.href);
    if (!group) {
      group = { groupId: `url-group-${String(byHref.size + 1).padStart(3, '0')}`, exactHref: bookmark.href, memberSourceIndexes: [], suggestedKeeperSourceIndex: bookmark.sourceIndex };
      byHref.set(bookmark.href, group);
    }
    group.memberSourceIndexes.push(bookmark.sourceIndex);
    bookmark.duplicateGroupId = group.groupId;
    bookmark.suggestedKeeper = group.suggestedKeeperSourceIndex === bookmark.sourceIndex;
  }
  return [...byHref.values()];
}
export function chooseKeeper(job, groupId, sourceIndex) {
  const group = job.duplicateGroups.find(item => item.groupId === groupId);
  if (!group || !group.memberSourceIndexes.includes(sourceIndex)) fail('INVALID_STRUCTURE');
  group.suggestedKeeperSourceIndex = sourceIndex;
  for (const bookmark of job.bookmarks) if (bookmark.duplicateGroupId === groupId) bookmark.suggestedKeeper = bookmark.sourceIndex === sourceIndex;
}
export function exclusionIndexes(job, groupId) {
  const group = job.duplicateGroups.find(item => item.groupId === groupId);
  if (!group) fail('INVALID_STRUCTURE');
  return job.bookmarks.filter(item => item.duplicateGroupId === groupId && item.sourceIndex !== group.suggestedKeeperSourceIndex && item.included).map(item => item.sourceIndex);
}
export function excludeConfirmed(job, indexes, confirmed = false) {
  if (!confirmed) return false;
  if (!Array.isArray(indexes) || indexes.some(index => !job.bookmarks.some(item => item.sourceIndex === index))) fail('INVALID_STRUCTURE');
  for (const bookmark of job.bookmarks) if (indexes.includes(bookmark.sourceIndex)) bookmark.included = false;
  return true;
}
export function setIncluded(job, sourceIndex, included, confirmed = false) {
  const bookmark = job.bookmarks.find(item => item.sourceIndex === sourceIndex);
  if (!bookmark || typeof included !== 'boolean') fail('INVALID_STRUCTURE');
  if (!included && !confirmed) return false;
  bookmark.included = included;
  return true;
}
export function moveBookmark(job, sourceIndex, path) {
  const validated = validatePath(path);
  const bookmark = job.bookmarks.find(item => item.sourceIndex === sourceIndex);
  if (!bookmark) fail('INVALID_STRUCTURE');
  bookmark.folderPath = validated;
}
export function renameFolder(job, fromPath, toPath) {
  const from = validatePath(fromPath);
  const to = validatePath(toPath);
  if (!from.length || !to.length) fail('INVALID_STRUCTURE');
  const matching = path => from.every((segment, index) => path[index] === segment);
  const updates = job.bookmarks.filter(item => matching(item.folderPath)).map(item => [item, validatePath([...to, ...item.folderPath.slice(from.length)])]);
  const folders = (job.folders ?? []).map(path => matching(path) ? validatePath([...to, ...path.slice(from.length)]) : path.slice());
  for (const [bookmark, path] of updates) bookmark.folderPath = path;
  job.folders = folders;
}
export function folderPaths(job) {
  const paths = new Map([['[]', []]]);
  for (const path of [...(job.folders ?? []), ...job.bookmarks.map(item => item.folderPath)]) {
    for (let length = 1; length <= path.length; length++) paths.set(JSON.stringify(path.slice(0, length)), path.slice(0, length));
  }
  return [...paths.values()];
}
export function buildTree(bookmarks) {
  const root = { kind: 'folder', name: '', path: [], children: [] };
  for (const bookmark of [...bookmarks].sort((a, b) => a.sourceIndex - b.sourceIndex)) {
    let folder = root;
    for (const segment of bookmark.folderPath) {
      let next = folder.children.find(item => item.kind === 'folder' && item.name === segment);
      if (!next) { next = { kind: 'folder', name: segment, path: [...folder.path, segment], children: [] }; folder.children.push(next); }
      folder = next;
    }
    folder.children.push({ kind: 'bookmark', bookmark });
  }
  return root;
}
