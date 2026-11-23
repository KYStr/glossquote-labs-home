import { readFile, readdir, lstat, realpath } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { PROJECT_ROOT, MIME, LICENSE_FILES, isWithin } from './serve.mjs';

export async function walk(root) {
  const files = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const target = path.join(root, entry.name);
    if (entry.isSymbolicLink() || (await lstat(target)).isSymbolicLink()) throw new Error('Symlink is not a managed file');
    if (!isWithin(await realpath(root), await realpath(target))) throw new Error('File escapes managed root');
    if (entry.isDirectory()) files.push(...await walk(target));
    else if (entry.isFile()) files.push(target);
    else throw new Error('Unsupported file kind');
  }
  return files;
}
export async function checkProject() {
  const publicRoot = path.join(PROJECT_ROOT, 'public');
  for (const required of ['package.json', 'scripts/serve.mjs', 'scripts/check.mjs', 'scripts/build.mjs', 'test/scaffold.test.mjs', 'public/index.html', 'public/styles/tokens.css', 'public/styles/app.css', 'public/js/app.mjs']) await readFile(path.join(PROJECT_ROOT, required));
  const publicFiles = await walk(publicRoot);
  const managed = [...publicFiles, ...await walk(path.join(PROJECT_ROOT, 'scripts')), ...await walk(path.join(PROJECT_ROOT, 'test'))];
  for (const file of managed) {
    const ext = path.extname(file);
    if (publicFiles.includes(file) && (!MIME.has(ext) && !LICENSE_FILES.has(path.basename(file)))) throw new Error(`Unapproved public file type: ${path.relative(PROJECT_ROOT, file)}`);
    if (path.relative(PROJECT_ROOT, file).split(path.sep).some((part) => part.startsWith('.'))) throw new Error('Dotfile in managed source');
    if (['.mjs', '.js'].includes(ext)) {
      const checked = spawnSync(process.execPath, ['--check', file], { shell: false, encoding: 'utf8' });
      if (checked.status !== 0) throw new Error(`Syntax check failed: ${path.relative(PROJECT_ROOT, file)}`);
    }
    if (!['.mjs', '.js', '.html', '.css'].includes(ext)) continue;
    const source = await readFile(file, 'utf8');
    const vendor = file.startsWith(path.join(publicRoot, 'vendor') + path.sep);
    if (!vendor && file.startsWith(publicRoot) && /\b(?:innerHTML|outerHTML|insertAdjacentHTML|eval)\b|new\s+Function\s*\(|\b(?:localStorage|sessionStorage|indexedDB)\b/.test(source)) throw new Error(`Unsafe runtime API: ${path.relative(PROJECT_ROOT, file)}`);
    let refs = [];
    if (ext === '.html') {
      if (/\son[a-z]+\s*=|<script\b(?![^>]*\bsrc=)/i.test(source)) throw new Error('Inline execution is forbidden');
      refs = [...source.matchAll(/(?:src|href)\s*=\s*["']([^"']+)["']/g)].map((m) => m[1]);
    } else if (['.js', '.mjs'].includes(ext)) {
      refs = [...source.matchAll(/(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)["']([^"']+)["']/g)].map((m) => m[1]);
    } else refs = [...source.matchAll(/(?:url\(\s*|@import\s*)["']?([^\s)'";]+)["']?/g)].map((m) => m[1]);
    for (const ref of refs) {
      if (ref.startsWith('#') || ref.startsWith('node:')) continue;
      if (/^(?:https?:|data:|\/\/)/i.test(ref)) throw new Error('External executable/resource reference');
      if (ref.includes('?') || ref.includes('#')) throw new Error('Unreviewed resource URL');
      const target = ref.startsWith('/') ? path.resolve(publicRoot, `.${ref}`) : path.resolve(path.dirname(file), ref);
      if (!isWithin(PROJECT_ROOT, target)) throw new Error('Reference escapes project');
      if (!(await lstat(target)).isFile()) throw new Error('Missing referenced file');
    }
  }
  const html = await readFile(path.join(publicRoot, 'index.html'), 'utf8');
  if (!/<meta\s+name="robots"\s+content="noindex,nofollow"\s*\/>/i.test(html)) throw new Error('Preview must remain noindex');
  if (publicFiles.includes(path.join(publicRoot, 'js/ffmpeg-adapter.mjs'))) {
    const { validateManifest } = await import('../public/js/core/manifest.mjs');
    const manifest = validateManifest(JSON.parse(await readFile(path.join(publicRoot, 'runtime-manifest.json'), 'utf8')));
    for (const entry of manifest.files) {
      const bytes = await readFile(path.join(publicRoot, entry.path));
      if (bytes.length !== entry.bytes || createHash('sha256').update(bytes).digest('hex') !== entry.sha256) throw new Error('Vendor integrity mismatch');
    }
    const staged = publicFiles.filter((file) => file.startsWith(path.join(publicRoot, 'vendor') + path.sep));
    if (staged.some((file) => !manifest.files.some((entry) => path.join(publicRoot, entry.path) === file) && !/^LICENSE\./.test(path.basename(file)))) throw new Error('Unexpected staged vendor file');
  }
  return publicFiles;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const files = await checkProject();
  console.log(`PASS: syntax, local references, DOM safety, public files (${files.length}), preview noindex.`);
}
