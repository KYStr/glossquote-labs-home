import { lstat, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = fileURLToPath(new URL('../', import.meta.url));
export const PUBLIC_FILES = Object.freeze([
  'index.html', 'en/index.html', '404.html', '_headers', 'robots.txt',
  'styles/app.css', 'js/app.mjs', 'js/controller.mjs',
  'js/locales/zh-Hant.mjs', 'js/locales/en.mjs',
  'js/core/boxes.mjs', 'js/core/schema.mjs', 'js/core/report.mjs', 'js/core/session.mjs'
]);

export async function inventory(directory, { optional = false } = {}) {
  let stat;
  try { stat = await lstat(directory); }
  catch (error) { if (optional && error.code === 'ENOENT') return []; throw error; }
  if (stat.isSymbolicLink() || !stat.isDirectory()) throw new Error('UNSAFE_DIRECTORY');
  const files = [];
  async function visit(base, prefix = '') {
    for (const entry of await readdir(base, { withFileTypes: true })) {
      const relative = prefix + entry.name;
      const absolute = path.join(base, entry.name);
      const info = await lstat(absolute);
      if (info.isSymbolicLink()) throw new Error('UNSAFE_LINK');
      if (info.isFile() && info.nlink > 1) throw new Error('UNSAFE_FILE_LINK');
      if (info.isDirectory()) {
        if (!PUBLIC_FILES.some(file => file.startsWith(relative + '/'))) throw new Error('UNKNOWN_DIRECTORY');
        await visit(absolute, relative + '/');
      } else if (info.isFile() && PUBLIC_FILES.includes(relative)) files.push(relative);
      else throw new Error('UNKNOWN_FILE');
    }
  }
  await visit(directory);
  return files.sort();
}

export async function validatePublic(directory) {
  const files = await inventory(directory);
  if (files.length !== PUBLIC_FILES.length) throw new Error('MISSING_PUBLIC_FILE');
  for (const file of files) {
    const bytes = await readFile(path.join(directory, file));
    const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    if (text.includes('\uFEFF')) throw new Error('UNEXPECTED_BOM');
    if (/\.(?:html|css|mjs)$/.test(file)) {
      if (/(?:\binnerHTML\b|\bouterHTML\b|insertAdjacentHTML|\beval\s*\(|new\s+Function\b|document\.write|\bfetch\s*\(|\bimport\s*\(|XMLHttpRequest|WebSocket|sendBeacon|localStorage|sessionStorage|indexedDB|serviceWorker|\bconsole\s*\.)/i.test(text)) throw new Error('FORBIDDEN_SOURCE');
      if (/(?:https?:)?\/\/[a-z0-9][^\s"'<>)]*/i.test(text.replaceAll('https://glossquote.com/index.html', '').replaceAll('https://glossquote.com/en/index.html', ''))) throw new Error('REMOTE_RESOURCE');
    }
    if (file.endsWith('.html')) {
      for (const token of ['<!doctype html>', '<title>', 'name="description"', 'name="robots" content="noindex,nofollow"', '<h1', 'charset="utf-8"']) {
        if (!text.toLowerCase().includes(token.toLowerCase())) throw new Error('INVALID_HTML_METADATA');
      }
      if (/\bon[a-z]+\s*=|<script(?![^>]*src=)|\brel="canonical"|sitemap/i.test(text)) throw new Error('UNSAFE_PREVIEW_HTML');
      const ids = [...text.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
      if (new Set(ids).size !== ids.length) throw new Error('DUPLICATE_HTML_ID');
      for (const match of text.matchAll(/\bfor="([^"]+)"/g)) if (!ids.includes(match[1])) throw new Error('MISSING_FIELD_LABEL_TARGET');
      for (const match of text.matchAll(/<([a-z][a-z0-9-]*)\b([^>]*)>/gi)) {
        const tag = match[1].toLowerCase();
        for (const attribute of match[2].matchAll(/\b(src|href|action|style|srcset)="([^"]*)"/gi)) {
          const name = attribute[1].toLowerCase(), value = attribute[2];
          if (['action', 'style', 'srcset'].includes(name)) throw new Error('FORBIDDEN_HTML_ATTRIBUTE');
          if (name === 'src' && !(tag === 'script' && value === '/js/app.mjs' && match[2].includes('type="module"'))) throw new Error('UNKNOWN_LOCAL_RESOURCE');
          if (name === 'href') {
            const allowed = tag === 'link' ? ['/styles/app.css'] : ['/index.html', '/en/index.html', 'https://glossquote.com/index.html', 'https://glossquote.com/en/index.html'];
            if (!allowed.includes(value) && !(value.startsWith('#') && ids.includes(value.slice(1)))) throw new Error('UNKNOWN_LINK');
          }
        }
      }
    }
  }
  const zh = await readFile(path.join(directory, 'index.html'), 'utf8');
  const en = await readFile(path.join(directory, 'en/index.html'), 'utf8');
  if (!zh.includes('lang="zh-Hant"') || !en.includes('lang="en"') || !zh.includes('href="/en/index.html"') || !en.includes('href="/index.html"')) throw new Error('INVALID_LANGUAGE_LINK');
  if (!zh.includes('href="https://glossquote.com/index.html"') || !en.includes('href="https://glossquote.com/en/index.html"')) throw new Error('INVALID_HOME_LINK');
  const ids = text => [...text.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  if (JSON.stringify(ids(zh).sort()) !== JSON.stringify(ids(en).sort()) || new Set(ids(zh)).size !== ids(zh).length) throw new Error('LANGUAGE_STRUCTURE_MISMATCH');
  for (const [html, title, heading, description] of [
    [zh, '搬家裝箱與物品定位｜本機處理工具 - GlossQuote', '搬家裝箱與物品定位', '搬家後急找充電器或鍋子，只知道在某箱；希望裝箱時記一次就能搜尋並給搬運人員房間清單。 使用 搬家裝箱與物品定位，在瀏覽器本地整理資料並取得可下載成果。'],
    [en, 'Moving box inventory | GlossQuote', 'Moving box inventory', 'Moving box inventory in your browser. Review the result and export it locally without uploading your input.']
  ]) {
    if (html.match(/<title>([^<]*)<\/title>/)?.[1] !== title || html.match(/<h1[^>]*>([^<]*)<\/h1>/)?.[1] !== heading || html.match(/name="description" content="([^"]*)"/)?.[1] !== description) throw new Error('SEMANTIC_METADATA_MISMATCH');
    if ([...html.matchAll(/<h1\b/g)].length !== 1 || !html.includes('id="application-controls" disabled')) throw new Error('INVALID_INITIAL_STATE');
  }
  const headers = await readFile(path.join(directory, '_headers'), 'utf8');
  for (const required of ["default-src 'self'", "connect-src 'none'", "frame-ancestors 'none'", "form-action 'none'", 'X-Content-Type-Options: nosniff', 'Referrer-Policy: no-referrer', 'X-Robots-Tag: noindex, nofollow', 'Cache-Control: no-store']) if (!headers.includes(required)) throw new Error('MISSING_SECURITY_HEADER');
  for (const file of files.filter(file => file.endsWith('.mjs'))) {
    const source = await readFile(path.join(directory, file), 'utf8');
    for (const match of source.matchAll(/^[ \t]*import[ \t]+(?:[^;\n]*?[ \t]+from[ \t]+)?['"]([^'"]+)['"]/gm)) {
      if (!match[1].startsWith('./') || !files.includes(path.posix.normalize(path.posix.join(path.posix.dirname(file), match[1])))) throw new Error('NONLOCAL_IMPORT');
    }
    if (file.startsWith('js/core/') && /\b(?:document|window|FileReader|Blob|URL|localStorage|sessionStorage|indexedDB)\b/.test(source)) throw new Error('IMPURE_CORE');
  }
  if ((await readFile(path.join(directory, 'robots.txt'), 'utf8')) !== 'User-agent: *\nDisallow: /\n') throw new Error('INVALID_PREVIEW_ROBOTS');
  return files;
}
