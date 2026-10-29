import { readFile, readdir, lstat, realpath, stat } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { inside, projectRoot, publicRoot } from './serve.mjs';
import { verifyAssets } from './verify-assets.mjs';

export async function walk(root) {
  if ((await lstat(root)).isSymbolicLink()) throw new Error('SYMLINK_SOURCE_ROOT');
  const files = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const absolute = path.join(root, entry.name);
    if ((await lstat(absolute)).isSymbolicLink()) throw new Error('SYMLINK_SOURCE_FILE');
    if (root === path.join(projectRoot, 'test') && entry.name === '.tmp' && entry.isDirectory()) continue; // Task-owned test artifacts are never public/build inputs.
    if (entry.name.startsWith('.')) throw new Error('HIDDEN_SOURCE_FILE');
    if (entry.isDirectory()) files.push(...await walk(absolute));
    else if (entry.isFile()) files.push(absolute);
    else throw new Error('UNSUPPORTED_SOURCE_FILE');
  }
  return files;
}

async function localReference(file, reference, root) {
  if (reference.startsWith('#') || /^(?:node:)/u.test(reference)) return;
  if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/iu.test(reference)) throw new Error(`EXTERNAL_RESOURCE: ${path.relative(projectRoot, file)}`);
  let target;
  try { target = path.resolve(reference.startsWith('/') ? root : path.dirname(file), decodeURIComponent(reference.split(/[?#]/u)[0]).replace(/^\//u, '')); }
  catch { throw new Error('INVALID_REFERENCE'); }
  if (!inside(root, target) || !inside(root, await realpath(target)) || !(await stat(target)).isFile()) throw new Error('MISSING_OR_ESCAPING_REFERENCE');
}

export async function checkProject() {
  if (Number(process.versions.node.split('.')[0]) < 24) throw new Error('NODE_24_REQUIRED');
  const required = ['package.json', 'scripts/serve.mjs', 'scripts/check.mjs', 'scripts/build.mjs', 'public/index.html', 'public/styles/tokens.css', 'public/styles/app.css', 'public/js/app.mjs', 'test/scaffold.test.mjs'];
  for (const file of required) if (!(await stat(path.join(projectRoot, file))).isFile()) throw new Error('MISSING_REQUIRED_FILE');
  const files = (await Promise.all(['public', 'scripts', 'test'].map(directory => walk(path.join(projectRoot, directory))))).flat();
  for (const file of files) {
    const relative = path.relative(projectRoot, file).replaceAll('\\', '/');
    if (/^public\/(?:vendor|models)\//u.test(relative)) continue; // T02 pins and verifies third-party files separately.
    const extension = path.extname(file);
    if (['.mjs', '.js'].includes(extension)) {
      const result = spawnSync(process.execPath, ['--check', file], { shell: false, encoding: 'utf8', windowsHide: true });
      if (result.status !== 0) throw new Error(`SYNTAX_FAILED: ${relative}`);
    }
    if (!['.html', '.css', '.mjs', '.js'].includes(extension)) continue;
    const source = await readFile(file, 'utf8');
    if (relative.startsWith('public/') && ['.js', '.mjs'].includes(extension) && /\b(?:innerHTML|outerHTML|insertAdjacentHTML|eval|localStorage|sessionStorage|indexedDB)\b|\bnew\s+Function\b|\bnavigator\.sendBeacon\b|\bcaches\./u.test(source)) throw new Error(`UNSAFE_BROWSER_API: ${relative}`);
    if (extension === '.html') {
      if (/<script\b(?![^>]*\bsrc=)[^>]*>\s*\S|\son[a-z]+\s*=|\sstyle\s*=/iu.test(source)) throw new Error('INLINE_EXECUTION');
      for (const match of source.matchAll(/\b(?:src|href)\s*=\s*["']([^"']+)["']/giu)) {
        if (match[1].startsWith('https://glossquote.com/')) continue; // Family navigation is not an executable resource.
        await localReference(file, match[1], relative.startsWith('test/spike/') ? projectRoot : publicRoot);
      }
    }
    if (extension === '.css') for (const match of source.matchAll(/(?:url\(\s*|@import\s+)["']?([^"')\s;]+)/giu)) await localReference(file, match[1], publicRoot);
    if (['.js', '.mjs'].includes(extension)) {
      for (const match of source.matchAll(/(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)["']([^"']+)["']/gu)) {
        if (!match[1].startsWith('.') && !match[1].startsWith('/')) {
          if (match[1].startsWith('node:') && !relative.startsWith('public/')) continue;
          throw new Error(`UNAPPROVED_IMPORT: ${relative}`);
        }
        // Match the spike server's exact public-resource routes, while keeping
        // all existence, symlink, origin and containment checks intact.
        const spikePublic = relative.startsWith('test/spike/') && ['/js/', '/models/', '/vendor/'].some(prefix => match[1].startsWith(prefix));
        await localReference(file, match[1], relative.startsWith('public/') || spikePublic ? publicRoot : projectRoot);
      }
    }
  }
  const html = await readFile(path.join(publicRoot, 'index.html'), 'utf8');
  if (!/<meta\s+name="robots"\s+content="noindex, nofollow"/u.test(html)) throw new Error('PREVIEW_NOINDEX_REQUIRED');
  await verifyAssets();
  return { checkedFiles: files.length };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { console.log(`CHECK PASS: ${(await checkProject()).checkedFiles} files`); }
  catch (error) { console.error(`CHECK FAIL: ${error.message}`); process.exitCode = 1; }
}
