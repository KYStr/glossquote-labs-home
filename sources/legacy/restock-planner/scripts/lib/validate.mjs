import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { ASSETS, inventory } from './files.mjs';

export function validateText(file, text) {
  if (file.endsWith('.html')) {
    if (!/<meta name="robots" content="noindex,nofollow">/.test(text)) throw new Error('Missing preview noindex');
    if (/<(?:style|iframe|object|embed|form|base)\b|\sstyle\s*=|\son[a-z]+\s*=|rel=["']canonical|application\/ld\+json|http-equiv\s*=|\bautofocus\b|\bcontenteditable\b/i.test(text)) throw new Error('Unsafe or production HTML');
    if (/<script\b(?![^>]*\bsrc=)[^>]*>/i.test(text)) throw new Error('Inline script rejected');
    for (const control of text.matchAll(/<(?:input|button|select|textarea)\b[^>]*>/gi)) {
      if (!/\bdisabled\b/i.test(control[0])) throw new Error('Initial data controls must be disabled');
      if (/^<button/i.test(control[0]) && !/type="button"/.test(control[0])) throw new Error('Button type required');
    }
    for (const tag of text.matchAll(/<([a-z][a-z0-9-]*)\b([^>]*)>/gi)) {
      for (const attribute of tag[2].matchAll(/\b(src|href)\s*=\s*(["'])(.*?)\2/g)) {
        const url = attribute[3];
        if (attribute[1] === 'href' && tag[1] === 'a' && (url.startsWith('#') || url === 'https://glossquote.com/index.html' || url === 'https://glossquote.com/en/index.html')) continue;
        if (!url.startsWith('/') || !ASSETS.includes(url.slice(1))) throw new Error('Unclosed or external HTML reference');
      }
      if (/\b(?:src|href)\s*=\s*[^\s"']/.test(tag[2])) throw new Error('Unquoted resource reference');
    }
    for (const script of text.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) if (script[2].trim() || !/\btype="module"/.test(script[1])) throw new Error('Executable inline or non-module script');
    const ids = [...text.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
    if (new Set(ids).size !== ids.length) throw new Error('Duplicate HTML ID');
    for (const reference of text.matchAll(/\b(?:for|aria-labelledby|aria-describedby)="([^"]+)"/g)) for (const id of reference[1].split(' ')) if (!ids.includes(id)) throw new Error('Missing label or help target');
  }
  if (/\.(?:js|mjs)$/.test(file)) {
    if (/\b(?:innerHTML|outerHTML|insertAdjacentHTML|eval|Function|fetch|XMLHttpRequest|WebSocket|EventSource|localStorage|sessionStorage|indexedDB|sendBeacon|serviceWorker|clipboard|console|Worker|SharedWorker|caches|URLSearchParams)\b|document\.cookie|window\s*\.\s*(?:open|print)\s*\(|\bimport\s*\(|(?:window\s*\.\s*|(?<![.\w]))(?:confirm|prompt|alert)\s*\(/.test(text)) throw new Error(`Disallowed browser API in ${file}`);
    for (const match of text.matchAll(/(?:from\s*|import\s*)['"]([^'"]+)['"]/g)) {
      const specifier = match[1];
      if (!specifier.startsWith('.')) throw new Error('External module');
      const target = path.posix.normalize(path.posix.join(path.posix.dirname(file), specifier));
      if (!ASSETS.includes(target)) throw new Error('Unclosed module');
    }
  }
  if (file.endsWith('.css') && /@import|url\s*\(/i.test(text)) throw new Error('External or unclosed CSS asset');
}

export async function validatePublic(directory) {
  const list = await inventory(directory);
  for (const { path: file } of list) validateText(file, await readFile(path.join(directory, file), 'utf8'));
  for (const [file, language] of [['index.html', 'zh-Hant'], ['en/index.html', 'en']]) {
    if (!(await readFile(path.join(directory, file), 'utf8')).includes(`<html lang="${language}">`)) throw new Error('Incorrect page language');
  }
  return list;
}
