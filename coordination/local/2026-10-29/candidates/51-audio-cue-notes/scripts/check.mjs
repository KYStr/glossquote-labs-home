import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { PUBLIC_FILES, root, closedTree, previewMetadata, requireNode24 } from './files.mjs';
import { messages } from '../public/js/i18n.js';

requireNode24();
const base = new URL('public/', root);
await closedTree(base);
await previewMetadata(base);
const pkg = JSON.parse(await readFile(new URL('package.json', root), 'utf8'));
if (pkg.private !== true || pkg.type !== 'module' || Object.keys(pkg.dependencies ?? {}).length ||
    Object.keys(pkg.devDependencies ?? {}).length) throw new Error('Package must be private ESM with zero dependencies.');
for (const file of PUBLIC_FILES) {
  const url = new URL(file, base);
  const text = await readFile(url, 'utf8');
  const forbidden = /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|localStorage|sessionStorage|indexedDB|serviceWorker|sendBeacon|eval|innerHTML|outerHTML|insertAdjacentHTML)\b|\bconsole\s*\.|document\.cookie|navigator\.(?:clipboard|mediaDevices)|\bnew\s+Function\b/;
  if (forbidden.test(text)) throw new Error(`Forbidden capability in ${file}`);
  if (file.endsWith('.js')) {
    const syntax = spawnSync(process.execPath, ['--check', fileURLToPath(url)], {
      shell: false, windowsHide: true, encoding: 'utf8'
    });
    if (syntax.status !== 0 || syntax.error) throw new Error(`ESM syntax check failed: ${file}`);
    for (const match of text.matchAll(/^\s*import\b[^;]*\bfrom\s*['"]([^'"]+)['"]/gm)) {
      const target = new URL(match[1], url);
      const rel = fileURLToPath(target).slice(fileURLToPath(base).length).replaceAll('\\', '/');
      if (!match[1].startsWith('.') || !PUBLIC_FILES.includes(rel)) throw new Error(`Unclosed import: ${file}`);
    }
  }
  if (/https?:\/\//i.test(text) && !file.endsWith('.html')) throw new Error(`Remote reference in ${file}`);
  if (file.endsWith('.html')) {
    const lang = file.startsWith('en/') ? 'en' : 'zh-Hant';
    const m = messages[lang];
    const home = lang === 'en' ? 'https://glossquote.com/en/index.html' : 'https://glossquote.com/index.html';
    for (const needed of [ `<html lang="${lang}">`, `<title>${m.title}</title>`, `<h1>${m.heading}</h1>`,
      m.description, m.languageWarning, 'connect-src \'none\'', 'media-src blob:', 'preload="metadata"' ]) {
      if (!text.includes(needed)) throw new Error(`Missing semantic content in ${file}`);
    }
    if (/\bautoplay\b|<iframe|<base\b|<form[^>]*action\s*=/i.test(text)) throw new Error(`Unexpected HTML capability: ${file}`);
    for (const match of text.matchAll(/\b(?:src|href)="([^"]+)"/g)) {
      if (match[1] === home) continue;
      const target = new URL(match[1], url);
      const rel = fileURLToPath(target).slice(fileURLToPath(base).length).replaceAll('\\', '/');
      if (!PUBLIC_FILES.includes(rel)) throw new Error(`Bad static reference: ${file}`);
    }
    const ids = [...text.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
    if (new Set(ids).size !== ids.length) throw new Error(`Duplicate HTML ID: ${file}`);
    for (const match of text.matchAll(/\b(?:for|aria-describedby|aria-labelledby)="([^"]+)"/g)) {
      if (match[1].split(/\s+/).some(id => !ids.includes(id))) throw new Error(`Broken label reference: ${file}`);
    }
  }
}
if (Object.keys(messages.en.errors).sort().join() !== Object.keys(messages['zh-Hant'].errors).sort().join()) {
  throw new Error('Error translations do not cover the same codes.');
}
console.log(`PASS: ${PUBLIC_FILES.length} closed static files, ESM syntax, two noindex pages, links, labels, capability scan and bilingual errors.`);
console.log('Static scans are not browser, codec, layout or security acceptance. No server started.');
