import { createHash } from 'node:crypto';
import { lstat, readdir, readFile, realpath, mkdir, open, unlink, rmdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { root, publicFiles, securityHeaders } from './files.mjs';
import { checkDeploymentConfig } from './deployment-config.mjs';

export const releaseConfig = Object.freeze({ origin: 'https://quote.glossquote.com', toolSlug: 'quote-builder' });
// Reviewed M1 public bytes, pinned independently of the writable output manifest.
// Changing the product requires a separate task and a new reviewed source lock.
export const releaseSourceLock = Object.freeze([
  { path: 'en/index.html', bytes: 8099, sha256: '329fdb054d5cc4c775f08d12b0449a9f0e3ed8647741d6fe8bfbf84b11771205' },
  { path: 'index.html', bytes: 7929, sha256: 'f6f3fa6dce799b588f6ad5d89ae5cf74c1ebd7f800f9a2473c31f0736e95d11a' },
  { path: 'js/app.js', bytes: 24692, sha256: 'c4b99ed0a954bbc0d4f02b573f6698163eb58d9d8f97a5e8f1857bee1fd2f186' },
  { path: 'js/core/decimal.mjs', bytes: 1641, sha256: '7e05ca8e88c14731280fc41da151c12972b51fcb98e5ec75a839c9bd9deb1fa6' },
  { path: 'js/core/import.mjs', bytes: 3575, sha256: '504580e80b4ea83317e324a0092cfe498d0e9179ec3ef64e1f847b8765d58026' },
  { path: 'js/core/quote.mjs', bytes: 4604, sha256: '57855e407bf45330237f0b62aae43a348cdcbceb5286cfac7cfa01e9056b656c' },
  { path: 'js/core/safe-output.mjs', bytes: 6070, sha256: '8a7d335e98ea97748943fcf277709d929a9fa4a85f8aa4af8e31f35930127965' },
  { path: 'styles/app.css', bytes: 11368, sha256: 'cbda98d385f49c79b0293c3d746723dd71814888c27d39f7bcd2ea75236d77c0' },
].map(entry => Object.freeze(entry)));

const fail = code => { throw new Error(code); };
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const same = (left, right) => Buffer.from(left).equals(Buffer.from(right));
const sourcePaths = releaseSourceLock.map(entry => entry.path);
if (JSON.stringify([...publicFiles].sort()) !== JSON.stringify(sourcePaths)) fail('RELEASE_ALLOWLIST_CHANGED');

async function ordinaryDirectory(directory) {
  const stat = await lstat(directory);
  if (!stat.isDirectory() || stat.isSymbolicLink() || await realpath(directory) !== path.resolve(directory)) fail('RELEASE_LINK_OR_DIRECTORY');
}

async function readExactTree(directory, expectedPaths, { absentAllowed = false, sizes = new Map() } = {}) {
  try { await lstat(directory); }
  catch (error) { if (absentAllowed && error.code === 'ENOENT') return null; throw error; }
  const allowedFiles = new Set(expectedPaths);
  const allowedDirectories = new Set(['']);
  for (const file of expectedPaths) {
    if (!file || file.includes('\\') || path.posix.normalize(file) !== file || file.startsWith('/') || file.split('/').includes('..')) fail('RELEASE_UNSAFE_PATH');
    const segments = file.split('/');
    for (let i = 1; i < segments.length; i++) allowedDirectories.add(segments.slice(0, i).join('/'));
  }
  const contents = new Map();
  async function walk(relative) {
    const absolute = path.join(directory, relative);
    const stat = await lstat(absolute);
    if (stat.isSymbolicLink() || await realpath(absolute) !== path.resolve(absolute)) fail('RELEASE_LINK_REJECTED');
    if (stat.isDirectory()) {
      if (!allowedDirectories.has(relative)) fail('RELEASE_UNKNOWN_DIRECTORY');
      for (const name of (await readdir(absolute)).sort()) await walk(relative ? `${relative}/${name}` : name);
    } else if (stat.isFile()) {
      if (!allowedFiles.has(relative)) fail('RELEASE_UNKNOWN_FILE');
      if (stat.size !== (sizes.get(relative) ?? stat.size) || stat.size > 1048576) fail('RELEASE_SIZE_MISMATCH');
      contents.set(relative, await readFile(absolute));
    } else fail('RELEASE_SPECIAL_FILE');
  }
  await walk('');
  if (contents.size !== expectedPaths.length) fail('RELEASE_MISSING_FILE');
  return contents;
}

function headParts(html) {
  const opens = [...html.matchAll(/<head\s*>/gi)];
  const closes = [...html.matchAll(/<\/head\s*>/gi)];
  if (opens.length !== 1 || closes.length !== 1 || opens[0].index >= closes[0].index) fail('RELEASE_HTML_HEAD');
  const start = opens[0].index + opens[0][0].length;
  return { before: html.slice(0, start), head: html.slice(start, closes[0].index), after: html.slice(closes[0].index) };
}

function headElements(html) {
  const { head } = headParts(html);
  const elements = [];
  for (const match of head.matchAll(/<(meta|link)\s+([^>]+)>/gi)) {
    const attrs = Object.create(null);
    for (const attr of match[2].matchAll(/([a-z][a-z0-9-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)) {
      const name = attr[1].toLowerCase();
      if (Object.hasOwn(attrs, name)) fail('RELEASE_DUPLICATE_ATTRIBUTE');
      attrs[name] = attr[2] ?? attr[3];
    }
    elements.push({ tag: match[1].toLowerCase(), attrs, raw: match[0] });
  }
  return elements;
}

const canonicalPaths = ['index.html', 'en/index.html'];
const releaseFooters = Object.freeze({
  'index.html': ['<span>本地候選版本 · 不自動儲存草稿</span>', '<span>不自動儲存草稿</span>'],
  'en/index.html': ['<span>Local candidate · Drafts are not saved automatically</span>', '<span>Drafts are not saved automatically</span>'],
});
export const releaseRedirects = '/ /index.html 301\n/en /en/index.html 301\n/en/ /en/index.html 301\n';
const url = file => `${releaseConfig.origin}/${file}`;
const alternates = Object.freeze({ 'zh-Hant': url('index.html'), en: url('en/index.html'), 'x-default': url('index.html') });

export function inspectReleaseSeo(html, file) {
  if (!canonicalPaths.includes(file)) fail('RELEASE_UNKNOWN_PAGE');
  const tags = headElements(html);
  const robots = tags.filter(tag => tag.tag === 'meta' && tag.attrs.name?.toLowerCase() === 'robots');
  const canonical = tags.filter(tag => tag.tag === 'link' && tag.attrs.rel?.toLowerCase() === 'canonical');
  const alternate = tags.filter(tag => tag.tag === 'link' && tag.attrs.rel?.toLowerCase() === 'alternate');
  if (robots.length !== 1 || robots[0].attrs.content !== 'index,follow') fail('RELEASE_ROBOTS');
  if (canonical.length !== 1 || canonical[0].attrs.href !== url(file)) fail('RELEASE_CANONICAL');
  if (alternate.length !== 3 || new Set(alternate.map(tag => tag.attrs.hreflang)).size !== 3) fail('RELEASE_ALTERNATES');
  for (const tag of alternate) if (!Object.hasOwn(alternates, tag.attrs.hreflang) || tag.attrs.href !== alternates[tag.attrs.hreflang]) fail('RELEASE_ALTERNATES');
  const language = /<html\s+lang="([^"]+)"/.exec(html)?.[1];
  if (language !== (file === 'index.html' ? 'zh-Hant' : 'en')) fail('RELEASE_LANGUAGE');
  return { canonical: canonical[0].attrs.href, alternates: Object.fromEntries(alternate.map(tag => [tag.attrs.hreflang, tag.attrs.href])) };
}

function releaseHtml(bytes, file) {
  const html = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  const { before, head, after } = headParts(html);
  const tags = headElements(html);
  const robots = tags.filter(tag => tag.tag === 'meta' && tag.attrs.name?.toLowerCase() === 'robots');
  if (robots.length !== 1 || robots[0].attrs.content !== 'noindex,nofollow' || tags.some(tag => tag.tag === 'link' && ['canonical', 'alternate'].includes(tag.attrs.rel?.toLowerCase()))) fail('RELEASE_PREVIEW_METADATA_CHANGED');
  const nextRobots = robots[0].raw.replace('content="noindex,nofollow"', 'content="index,follow"');
  if (nextRobots === robots[0].raw) fail('RELEASE_PREVIEW_METADATA_CHANGED');
  const links = `  <link rel="canonical" href="${url(file)}">\n` + Object.entries(alternates).map(([language, href]) => `  <link rel="alternate" hreflang="${language}" href="${href}">\n`).join('');
  const [previewFooter, productionFooter] = releaseFooters[file];
  if (after.indexOf(previewFooter) < 0 || after.indexOf(previewFooter) !== after.lastIndexOf(previewFooter)) fail('RELEASE_CANDIDATE_FOOTER_CHANGED');
  const result = before + head.replace(robots[0].raw, nextRobots) + links + after.replace(previewFooter, productionFooter);
  inspectReleaseSeo(result, file);
  return Buffer.from(result, 'utf8');
}

function releaseHeaders() {
  // Original safety/privacy policy from files.mjs, imported by serve.mjs.
  // A changed policy needs explicit review; only crawler indexing changes here.
  const expected = {
    'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'none'; img-src 'none'; font-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
    'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'Cache-Control': 'no-store',
    'X-Robots-Tag': 'noindex, nofollow', 'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  };
  if (JSON.stringify(securityHeaders) !== JSON.stringify(expected)) fail('RELEASE_HEADER_SOURCE_CHANGED');
  return Buffer.from('/*\n' + Object.entries(securityHeaders).map(([name, value]) => `  ${name}: ${name === 'X-Robots-Tag' ? 'index, follow' : value}\n`).join(''), 'utf8');
}

export async function expectedRelease(rootDirectory = root) {
  await ordinaryDirectory(rootDirectory);
  await checkDeploymentConfig(rootDirectory);
  const source = await readExactTree(path.join(rootDirectory, 'public'), sourcePaths, { sizes: new Map(releaseSourceLock.map(entry => [entry.path, entry.bytes])) });
  for (const entry of releaseSourceLock) if (hash(source.get(entry.path)) !== entry.sha256) fail('RELEASE_SOURCE_CHANGED');
  const site = new Map(source);
  for (const file of canonicalPaths) site.set(file, releaseHtml(source.get(file), file));
  site.set('robots.txt', Buffer.from(`User-agent: *\nAllow: /\nSitemap: ${releaseConfig.origin}/sitemap.xml\n`, 'utf8'));
  site.set('_headers', releaseHeaders());
  site.set('_redirects', Buffer.from(releaseRedirects, 'utf8'));
  site.set('sitemap.xml', Buffer.from('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + canonicalPaths.map(file => `  <url><loc>${url(file)}</loc></url>\n`).join('') + '</urlset>\n', 'utf8'));
  const records = map => [...map.keys()].sort().map(file => ({ path: file, bytes: map.get(file).byteLength, sha256: hash(map.get(file)) }));
  const manifest = { schemaVersion: 1, mode: 'release-candidate', origin: releaseConfig.origin, toolSlug: releaseConfig.toolSlug, files: records(site), sourceFiles: records(source) };
  const all = new Map([...site].map(([file, bytes]) => [`site/${file}`, bytes]));
  all.set('manifest.json', Buffer.from(JSON.stringify(manifest, null, 2) + '\n', 'utf8'));
  return { all, manifest };
}

async function compareExisting(rootDirectory, expected, absentAllowed = false) {
  const output = await readExactTree(path.join(rootDirectory, 'release-artifacts'), [...expected.all.keys()], { absentAllowed, sizes: new Map([...expected.all].map(([file, bytes]) => [file, bytes.length])) });
  if (output === null) return null;
  // Reconstructed expected bytes, not output-manifest trust. This rejects
  // coordinated asset+manifest tampering and semantically incorrect metadata.
  for (const [file, bytes] of expected.all) if (!same(output.get(file), bytes)) fail('RELEASE_OUTPUT_CHANGED');
  for (const file of canonicalPaths) inspectReleaseSeo(output.get(`site/${file}`).toString('utf8'), file);
  return output;
}

export async function checkRelease(rootDirectory = root) {
  const expected = await expectedRelease(rootDirectory);
  await compareExisting(rootDirectory, expected);
  return { files: expected.manifest.files.length, sourceFiles: expected.manifest.sourceFiles.length, reused: true };
}

export async function buildRelease(rootDirectory = root) {
  const expected = await expectedRelease(rootDirectory);
  if (await compareExisting(rootDirectory, expected, true)) return { files: expected.manifest.files.length, sourceFiles: expected.manifest.sourceFiles.length, reused: true };
  const outputDirectory = path.join(rootDirectory, 'release-artifacts');
  const madeDirectories = [], madeFiles = [];
  try {
    // No recursive mkdir/delete, no replacement of pre-existing paths. Existing
    // managed outputs were fully checked above and never need rewriting.
    const directories = new Set(['']);
    for (const file of expected.all.keys()) {
      const segments = file.split('/');
      for (let i = 1; i < segments.length; i++) directories.add(segments.slice(0, i).join('/'));
    }
    for (const directory of [...directories].sort((a, b) => a.split('/').length - b.split('/').length || (a < b ? -1 : a > b ? 1 : 0))) {
      const absolute = path.join(outputDirectory, directory);
      await mkdir(absolute); madeDirectories.push(absolute);
    }
    for (const [file, bytes] of expected.all) {
      const absolute = path.join(outputDirectory, file);
      const handle = await open(absolute, 'wx');
      try { await handle.writeFile(bytes); }
      finally { await handle.close(); }
      madeFiles.push({ absolute, bytes });
    }
    await compareExisting(rootDirectory, expected);
    return { files: expected.manifest.files.length, sourceFiles: expected.manifest.sourceFiles.length, reused: false };
  } catch (error) {
    // Roll back only this attempt's exact unmodified files and empty owned
    // directories. Unknown/changed material is preserved for owner inspection.
    for (const { absolute, bytes } of madeFiles.reverse()) {
      try { const stat = await lstat(absolute); if (stat.isFile() && !stat.isSymbolicLink() && same(await readFile(absolute), bytes)) await unlink(absolute); } catch { /* preserve when not safely attributable */ }
    }
    for (const directory of madeDirectories.reverse()) { try { await rmdir(directory); } catch { /* never remove nonempty or foreign material */ } }
    throw error;
  }
}

export async function runReleaseCommand(args, rootDirectory = root) {
  if (args.length !== 1 || !['build', 'check'].includes(args[0])) fail('RELEASE_USAGE: expected exactly build or check; no origin/path/deploy options');
  return args[0] === 'build' ? buildRelease(rootDirectory) : checkRelease(rootDirectory);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const result = await runReleaseCommand(process.argv.slice(2));
    console.log(`PASS: ${process.argv[2]} release candidate; ${result.files} site files / ${result.sourceFiles} pinned sources; ${result.reused ? 'verified existing bytes' : 'created independent output'}. Not deployed.`);
  } catch (error) {
    console.error(error.message.startsWith('RELEASE_') ? error.message : 'RELEASE_IO_FAILED: output preserved; inspect task evidence');
    process.exitCode = 1;
  }
}
