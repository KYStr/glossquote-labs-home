import { buildTree, validatePath } from './organizer.js';
import { validateHref } from './urls.js';
export function escapeText(value) { return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;'); }
export function escapeAttribute(value) { return escapeText(value).replaceAll('"', '&quot;'); }
export function exportHtml(job) {
  const included = job.bookmarks.filter(item => item.included);
  for (const item of included) { validatePath(item.folderPath); validateHref(item.href); }
  const lines = ['<!DOCTYPE NETSCAPE-Bookmark-file-1>', '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">', '<TITLE>Organized bookmarks</TITLE>', '<H1>Organized bookmarks</H1>', '<DL><p>'];
  const write = (folder, depth) => {
    const indent = '    '.repeat(depth);
    for (const child of folder.children) {
      if (child.kind === 'bookmark') lines.push(`${indent}<DT><A HREF="${escapeAttribute(child.bookmark.href)}">${escapeText(child.bookmark.title)}</A>`);
      else {
        lines.push(`${indent}<DT><H3>${escapeText(child.name)}</H3>`, `${indent}<DL><p>`);
        write(child, depth + 1);
        lines.push(`${indent}</DL><p>`);
      }
    }
  };
  write(buildTree(included), 1);
  lines.push('</DL><p>', '');
  return lines.join('\n');
}
