import { mkdir, rm, readFile, writeFile, lstat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { root, check, listFiles, checkDist } from './check.mjs';
import { safeDirectory, validateHtml } from './validate.mjs';
import { releaseHtml, robots, sitemap, headers, productionOrigin } from './release.mjs';

export async function build({ production = false, origin = productionOrigin } = {}) {
  if (origin !== productionOrigin) throw new Error('UNAPPROVED_ORIGIN');
  const assets = await check();
  await safeDirectory(path.join(root, 'public')); await safeDirectory(root);
  // Validate and render all content BEFORE replacing dist.
  const rendered = new Map();
  for (const asset of assets) {
    let content = await readFile(path.join(root, 'public', asset), 'utf8');
    if (production && asset.endsWith('.html')) content = releaseHtml(content, asset);
    if (asset === '_headers') content = headers(content, production);
    if (asset.endsWith('.html')) validateHtml(content, new Set(assets), { production: production && ['index.html','en/index.html'].includes(asset) });
    rendered.set(asset, content);
  }
  rendered.set('robots.txt', robots(production)); rendered.set('sitemap.xml', sitemap(production));
  const dist = path.resolve(root, 'dist');
  if (dist !== path.join(root, 'dist')) throw new Error('UNSAFE_DIST');
  try { if ((await lstat(dist)).isSymbolicLink()) throw new Error('UNSAFE_DIST'); await listFiles(dist); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  await rm(dist, { recursive: true, force: true });
  for (const [asset, content] of rendered) {
    const target = path.join(dist, asset);
    await mkdir(path.dirname(target), { recursive: true }); await writeFile(target, content, 'utf8');
  }
  const manifest = await checkDist(production);
  console.log(`BUILD PASS: ${manifest.files.length} ${manifest.mode} assets; public-only`);
  return manifest;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.some(arg => arg !== '--production' && !arg.startsWith('--origin='))) throw new Error('UNKNOWN_ARGUMENT');
  await build({ production: args.includes('--production'), origin: args.find(arg => arg.startsWith('--origin='))?.slice(9) ?? productionOrigin });
}
