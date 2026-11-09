// 所有公開檔案皆由白名單定義，不掃描兄弟資料夾或帳戶目錄。
import { lstat, readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
export const root = fileURLToPath(new URL('..', import.meta.url));
export const assets = Object.freeze(['404.html', '_headers', 'app.mjs', 'core.mjs', 'en/index.html', 'index.html', 'messages.mjs', 'resources.mjs', 'robots.txt', 'styles.css']);
// 僅允許普通、單一 hard link 檔案與實體目錄。
export async function inspectTree(directory) {
  const base = join(root, directory);
  const found = [];
  async function walk(path, prefix = '') {
    const info = await lstat(path);
    if (!info.isDirectory() || info.isSymbolicLink()) throw new Error('Unsafe directory');
    for (const name of await readdir(path)) {
      const child = join(path, name);
      const rel = prefix + name;
      const entry = await lstat(child);
      if (entry.isSymbolicLink()) throw new Error('Symlinks are not allowed');
      if (entry.isDirectory()) {
        if (rel !== 'en') throw new Error('Unknown asset directory');
        await walk(child, rel + '/');
      } else {
        if (!entry.isFile() || entry.nlink !== 1) throw new Error('Unsafe asset');
        found.push(rel);
      }
    }
  }
  await walk(base);
  if (found.sort().join('\n') !== assets.join('\n')) throw new Error('Asset allowlist mismatch');
}
// Preview 不輸出 production canonical/sitemap，所有頁面固定 noindex。
export async function inspectSource() {
  await inspectTree('public');
  for (const page of ['index.html', 'en/index.html', '404.html']) {
    const html = await readFile(join(root, 'public', page), 'utf8');
    if (!html.includes('content="noindex,nofollow"') || /rel="canonical"|sitemap|<script(?![^>]*src=)/i.test(html)) throw new Error('Preview metadata violation');
  }
  for (const file of assets.filter(name => name.endsWith('.mjs'))) {
    const code = await readFile(join(root, 'public', file), 'utf8');
    if (/\b(fetch|XMLHttpRequest|WebSocket|sendBeacon|localStorage|sessionStorage|indexedDB|innerHTML|outerHTML|eval)\b|console\.|document\.cookie|history\s*\.\s*(pushState|replaceState|go|back|forward)/.test(code)) throw new Error('Runtime safety violation');
  }
}
// HTTP 模型與靜態 host 設定共用同一份 headers，避免聲稱已驗證真 hosting。
export async function securityHeaders() {
  const text = await readFile(join(root, 'public/_headers'), 'utf8');
  return Object.fromEntries(text.trim().split('\n').slice(1).map(line => {
    const split = line.indexOf(':');
    return [line.slice(0, split).trim(), line.slice(split + 1).trim()];
  }));
}
