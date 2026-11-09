// 只使用 Node 內建工具，不安裝套件或部署。
import { copyFile, lstat, mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { root, listFiles } from './files.mjs';
import { page } from './pages.mjs';
import { options, outputPage, extras } from './site.mjs';
export async function build(args = []) {
  const settings = options(args), source = resolve(root, 'public');
  const destination = resolve(root, settings.production ? 'dist-production' : 'dist-preview');
  const files = await listFiles(source);
  try { const info = await lstat(destination); if (info.isSymbolicLink() || !info.isDirectory()) throw Error('OUTPUT_REJECTED'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  await rm(destination, { recursive: true, force: true }); await mkdir(destination);
  for (const file of files) {
    const target = resolve(destination, relative(source, file));
    await mkdir(dirname(target), { recursive: true }); await copyFile(file, target);
  }
  await mkdir(resolve(destination, 'en'), { recursive: true });
  for (const [language, path] of [['zh-Hant', 'index.html'], ['en', 'en/index.html']]) await writeFile(resolve(destination, path), outputPage(page(language), path, settings));
  await writeFile(resolve(destination, '404.html'), '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><meta name="viewport" content="width=device-width,initial-scale=1"><title>404 · GlossQuote</title></head><body><h1>404</h1><p>找不到頁面 / Page not found</p><a href="/index.html" lang="zh-Hant">繁體中文</a> · <a href="/en/index.html" lang="en">English</a></body></html>');
  for (const [path, content] of Object.entries(extras(settings))) await writeFile(resolve(destination, path), content);
  return destination;
}
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) console.log(`BUILD PASS: ${await build(process.argv.slice(2))} (not deployed)`);
