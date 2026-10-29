// 靜態掃描是防線之一，不等於完整安全認證。
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { root, listFiles } from './files.mjs';
import { page } from './pages.mjs';
import { locales } from '../public/js/locales.mjs';
const files = [...await listFiles(resolve(root, 'public')), ...await listFiles(resolve(root, 'scripts')), ...await listFiles(resolve(root, 'test'))];
for (const file of files.filter(file => file.endsWith('.mjs'))) {
  const checked = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  assert.equal(checked.status, 0, checked.stderr);
}
for (const file of (await listFiles(resolve(root, 'public'))).filter(file => file.endsWith('.mjs'))) {
  const source = await readFile(file, 'utf8');
  assert.doesNotMatch(source, /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon|localStorage|sessionStorage|indexedDB)\b|\.innerHTML\b|insertAdjacentHTML|createObjectURL|revokeObjectURL|\beval\s*\(|new\s+Function\b/, file);
  assert.doesNotMatch(source, /(?:import|from)\s*['"]https?:/, file);
}
const keys = object => Object.keys(object).flatMap(key => typeof object[key] === 'object' ? keys(object[key]).map(child => `${key}.${child}`) : [key]).sort();
assert.deepEqual(keys(locales.en), keys(locales['zh-Hant']));
for (const language of ['zh-Hant', 'en']) {
  const html = page(language);
  assert.match(html, /content="noindex,nofollow"/); assert.doesNotMatch(html, /rel="canonical"|<script(?! type="module" src=)/);
  assert.match(html, /id="status" role="status"/); assert.match(html, /<html lang=/);
}
console.log(`CHECK PASS: syntax, bilingual parity, bounded public API and noindex checks (${files.length} source files)`);
