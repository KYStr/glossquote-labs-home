import { lstat, readdir, readFile, mkdir, open } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { ROOT, PUBLIC_FILES, validatePublic } from './contract.mjs';
import { validateDeploymentConfig } from './deploy-config.mjs';

export const ORIGIN = 'https://moving-boxes.glossquote.com';
export const TOOL_SLUG = 'moving-boxes';
export const SITE_FILES = Object.freeze([...new Set([...PUBLIC_FILES, 'robots.txt', '_headers', 'sitemap.xml', '_redirects'])].sort());
// Reviewed M1 public bytes; updating the product requires a separately reviewed pin update.
const SOURCE_PINS = Object.freeze([
  ['404.html', 519, '035a67301a5d9ad222e223f56445923decd8592c26f9c0ef6ca4f1208f0ba641'],
  ['_headers', 388, '532881a8ca75ace650d2d0cc980d169f3e9fc8dc90edeecede95d3d36afb321f'],
  ['en/index.html', 8516, 'a939fb4dc5aa6393b9b7fb3ddb83d9d103954c0169480f91ecc227de74f0595b'],
  ['index.html', 8443, 'f73201ca925e678ff8854f6098a6e722f9bcff2c647afd2130a66b9906c37321'],
  ['js/app.mjs', 23763, '8dd1766c0f55129657f87a70e927533eb3acfc7e23f245cfc87c4eee10f86950'],
  ['js/controller.mjs', 9977, 'f0a886725dfab915b6ca11a79a6baee225c9194611c0084e17114fe6ac2f52da'],
  ['js/core/boxes.mjs', 3905, 'd26e74f4e5c8005396f4171a75fd484de8ed7a605a28c8e9cf6c5ce755984221'],
  ['js/core/report.mjs', 1852, '6a865c800567071bf45fdd4c0b73f90b84808bdc00497c226272f3c4a690629e'],
  ['js/core/schema.mjs', 5404, '6f35623d6dd4558c2861a222af5ef4412c16af8d63bc17d75b848af7614320eb'],
  ['js/core/session.mjs', 2053, '715e332c48fac6064725ce4a2f7ced70de20dafe17b3e4dae37077f6213c88d5'],
  ['js/locales/en.mjs', 6065, 'c990d9f43e66676c163d9f72e1921b3b24f05b3263cc0bd7f91b5e608406e8b6'],
  ['js/locales/zh-Hant.mjs', 5922, 'c2aa4e16ffb23b8613357c5f2d1c503fd3d2c77c3bc0e0e6f489e9100172e8b3'],
  ['robots.txt', 26, '331ea9090db0c9f6f597bd9840fd5b171830f6e0b3ba1cb24dfa91f0c95aedc1'],
  ['styles/app.css', 8725, '57943e78af39cbfae9eb00e9e80424526fdb8d515f91c18a83faaf227a69b906']
].map(([file, bytes, sha256]) => Object.freeze({ path: file, bytes, sha256 })));
const URLS = Object.freeze({ 'zh-Hant': ORIGIN + '/index.html', en: ORIGIN + '/en/index.html' });
const ROBOTS = 'User-agent: *\nAllow: /\nSitemap: ' + ORIGIN + '/sitemap.xml\n';
const SITEMAP = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>' + URLS['zh-Hant'] + '</loc></url>\n  <url><loc>' + URLS.en + '</loc></url>\n</urlset>\n';
const REDIRECTS = '/ /index.html 301\n/en /en/index.html 301\n/en/ /en/index.html 301\n';
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const metadata = buffers => [...buffers].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([file, bytes]) => ({ path: file, bytes: bytes.length, sha256: digest(bytes) }));
const encodeManifest = value => Buffer.from(JSON.stringify(value, null, 2) + '\n');
const same = (actual, expected, code) => { if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(code); };
const decode = bytes => new TextDecoder('utf-8', { fatal: true }).decode(bytes);
const directories = paths => [...new Set(paths.flatMap(file => {
  const parts = file.split('/'); parts.pop(); return parts.map((_, i) => parts.slice(0, i + 1).join('/'));
}))].sort();
const SITE_DIRECTORIES = directories(SITE_FILES);

async function info(file, optional = false) {
  try {
    const stat = await lstat(file);
    if (stat.isSymbolicLink() || stat.isFile() && stat.nlink > 1) throw new Error('UNSAFE_RELEASE_LINK');
    if (!stat.isFile() && !stat.isDirectory()) throw new Error('UNSAFE_RELEASE_ENTRY');
    return stat;
  } catch (error) { if (optional && error.code === 'ENOENT') return null; throw error; }
}
async function source(root) {
  if (Number(process.versions.node.split('.')[0]) < 24) throw new Error('NODE_24_REQUIRED');
  const rootStat = await info(root);
  if (!rootStat.isDirectory()) throw new Error('INVALID_PROJECT_ROOT');
  await validatePublic(path.join(root, 'public'));
  const buffers = new Map();
  for (const file of [...PUBLIC_FILES].sort()) buffers.set(file, await readFile(path.join(root, 'public', file)));
  same(metadata(buffers), SOURCE_PINS, 'SOURCE_CHANGED_FROM_M1');
  return buffers;
}
function releaseHTML(bytes, language) {
  const html = decode(bytes);
  const heads = [...html.matchAll(/<head\b[^>]*>([\s\S]*?)<\/head>/gi)];
  if (heads.length !== 1 || (heads[0][1].match(/<meta name="robots" content="noindex,nofollow">/g) ?? []).length !== 1) throw new Error('INVALID_SOURCE_HEAD');
  const head = heads[0][0].replace('<meta name="robots" content="noindex,nofollow">', '<meta name="robots" content="index,follow">');
  const links = [
    '  <link rel="canonical" href="' + URLS[language] + '">',
    '  <link rel="alternate" hreflang="zh-Hant" href="' + URLS['zh-Hant'] + '">',
    '  <link rel="alternate" hreflang="en" href="' + URLS.en + '">',
    '  <link rel="alternate" hreflang="x-default" href="' + URLS['zh-Hant'] + '">'
  ].join('\n');
  return Buffer.from(html.replace(heads[0][0], head.replace('</head>', links + '\n</head>')));
}
function releaseHeaders(bytes) {
  const original = decode(bytes);
  const pattern = /^([ \t]*X-Robots-Tag:[ \t]*)noindex,[ \t]*nofollow([ \t]*)$/gm;
  if ([...original.matchAll(pattern)].length !== 1) throw new Error('INVALID_SOURCE_ROBOTS_HEADER');
  return Buffer.from(original.replace(pattern, '$1index, follow$2'));
}
function expected(sourceBuffers, configBytes) {
  const buffers = new Map(sourceBuffers);
  buffers.set('index.html', releaseHTML(sourceBuffers.get('index.html'), 'zh-Hant'));
  buffers.set('en/index.html', releaseHTML(sourceBuffers.get('en/index.html'), 'en'));
  buffers.set('_headers', releaseHeaders(sourceBuffers.get('_headers')));
  buffers.set('robots.txt', Buffer.from(ROBOTS));
  buffers.set('sitemap.xml', Buffer.from(SITEMAP));
  buffers.set('_redirects', Buffer.from(REDIRECTS));
  const manifest = { schemaVersion: 1, mode: 'release-candidate', origin: ORIGIN, toolSlug: TOOL_SLUG, files: metadata(buffers), sourceFiles: metadata(sourceBuffers), configFiles: metadata(new Map([['wrangler.jsonc', configBytes]])) };
  return { buffers, manifest, manifestBytes: encodeManifest(manifest) };
}
export function verifySEO(buffers, sourceBuffers) {
  const fixed = new URL(ORIGIN);
  if (fixed.protocol !== 'https:' || fixed.host !== 'moving-boxes.glossquote.com' || fixed.username || fixed.password || fixed.port || fixed.pathname !== '/' || fixed.search || fixed.hash) throw new Error('INVALID_FIXED_ORIGIN');
  for (const [file, language] of [['index.html', 'zh-Hant'], ['en/index.html', 'en']]) {
    const html = decode(buffers.get(file));
    const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1];
    if (!head) throw new Error('MISSING_RELEASE_HEAD');
    const tags = [...head.matchAll(/<(?:link|meta)\b[^>]*>/gi)].map(match => Object.fromEntries([...match[0].matchAll(/([a-z-]+)="([^"]*)"/gi)].map(attribute => [attribute[1].toLowerCase(), attribute[2]])));
    same(tags.filter(tag => tag.rel === 'canonical').map(tag => tag.href), [URLS[language]], 'WRONG_CANONICAL');
    same(tags.filter(tag => tag.rel === 'alternate').map(tag => [tag.hreflang, tag.href]), [['zh-Hant', URLS['zh-Hant']], ['en', URLS.en], ['x-default', URLS['zh-Hant']]], 'WRONG_ALTERNATES');
    same(tags.filter(tag => tag.name === 'robots').map(tag => tag.content), ['index,follow'], 'WRONG_RELEASE_ROBOTS');
    const original = decode(sourceBuffers.get(file));
    same(html.replace(/<head\b[^>]*>[\s\S]*?<\/head>/i, '<head/>'), original.replace(/<head\b[^>]*>[\s\S]*?<\/head>/i, '<head/>'), 'VISIBLE_PRODUCT_CHANGED');
  }
  for (const file of PUBLIC_FILES.filter(file => !['index.html', 'en/index.html', '_headers', 'robots.txt'].includes(file))) {
    if (!buffers.get(file)?.equals(sourceBuffers.get(file))) throw new Error('RUNTIME_CHANGED');
  }
  if (decode(buffers.get('robots.txt')) !== ROBOTS || decode(buffers.get('sitemap.xml')) !== SITEMAP) throw new Error('WRONG_RELEASE_DISCOVERY');
  if (!buffers.get('_headers').equals(releaseHeaders(sourceBuffers.get('_headers')))) throw new Error('RELEASE_SECURITY_HEADERS_CHANGED');
  if (decode(buffers.get('_redirects')) !== REDIRECTS) throw new Error('WRONG_RELEASE_REDIRECTS');
}
async function output(root) {
  const directory = path.join(root, 'release-artifacts');
  const stat = await info(directory, true);
  if (!stat) return { exists: false, buffers: new Map(), manifestBytes: null, directories: [] };
  if (!stat.isDirectory()) throw new Error('INVALID_RELEASE_DIRECTORY');
  const state = { exists: true, buffers: new Map(), manifestBytes: null, directories: [] };
  for (const name of await readdir(directory)) {
    const entry = await info(path.join(directory, name));
    if (name === 'manifest.json' && entry.isFile()) state.manifestBytes = await readFile(path.join(directory, name));
    else if (name === 'site' && entry.isDirectory()) {
      state.directories.push('');
      async function walk(prefix = '') {
        for (const name of await readdir(path.join(directory, 'site', prefix))) {
          const file = prefix ? prefix + '/' + name : name;
          const entry = await info(path.join(directory, 'site', file));
          if (entry.isDirectory() && SITE_DIRECTORIES.includes(file)) { state.directories.push(file); await walk(file); }
          else if (entry.isFile() && SITE_FILES.includes(file)) state.buffers.set(file, await readFile(path.join(directory, 'site', file)));
          else throw new Error('UNKNOWN_RELEASE_OUTPUT');
        }
      }
      await walk();
    } else throw new Error('UNKNOWN_RELEASE_OUTPUT');
  }
  state.directories.sort();
  return state;
}
function validateOutput(state, wanted, sourceBuffers) {
  if (!state.manifestBytes) throw new Error('MISSING_RELEASE_MANIFEST');
  let parsed;
  try { parsed = JSON.parse(decode(state.manifestBytes)); } catch { throw new Error('INVALID_RELEASE_MANIFEST'); }
  same(parsed, wanted.manifest, 'RELEASE_MANIFEST_MISMATCH');
  if (!state.manifestBytes.equals(wanted.manifestBytes)) throw new Error('NONCANONICAL_RELEASE_MANIFEST');
  same(metadata(state.buffers), wanted.manifest.files, 'RELEASE_OUTPUT_MISMATCH');
  for (const [file, bytes] of wanted.buffers) if (!state.buffers.get(file)?.equals(bytes)) throw new Error('RELEASE_BYTES_MISMATCH');
  verifySEO(state.buffers, sourceBuffers);
}
const fingerprint = state => JSON.stringify({ exists: state.exists, files: metadata(state.buffers), manifest: state.manifestBytes ? digest(state.manifestBytes) : null, directories: state.directories });
async function directory(target) {
  try { await mkdir(target); } catch (error) { if (error.code !== 'EEXIST') throw error; }
  if (!(await info(target)).isDirectory()) throw new Error('UNSAFE_RELEASE_DIRECTORY');
}
async function exclusiveFile(target, bytes) {
  const handle = await open(target, 'wx');
  try { await handle.writeFile(bytes); } finally { await handle.close(); }
}
export async function buildRelease(root = ROOT) {
  const sources = await source(root);
  const configBytes = await validateDeploymentConfig(root);
  const wanted = expected(sources, configBytes);
  verifySEO(wanted.buffers, sources);
  const previous = await output(root);
  if (previous.manifestBytes || previous.buffers.size) {
    validateOutput(previous, wanted, sources);
    return { manifest: wanted.manifest, created: false };
  }
  // Recheck all inputs and outputs before the first mutation. No file is ever overwritten.
  same(metadata(await source(root)), metadata(sources), 'SOURCE_CHANGED_DURING_BUILD');
  if (!(await validateDeploymentConfig(root)).equals(configBytes)) throw new Error('DEPLOY_CONFIG_CHANGED_DURING_BUILD');
  if (fingerprint(await output(root)) !== fingerprint(previous)) throw new Error('OUTPUT_CHANGED_DURING_BUILD');
  const target = path.join(root, 'release-artifacts');
  await directory(target); await directory(path.join(target, 'site'));
  for (const name of [...SITE_DIRECTORIES].sort((a, b) => a.split('/').length - b.split('/').length || (a < b ? -1 : a > b ? 1 : 0))) await directory(path.join(target, 'site', name));
  for (const [file, bytes] of [...wanted.buffers].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)) await exclusiveFile(path.join(target, 'site', file), bytes);
  await exclusiveFile(path.join(target, 'manifest.json'), wanted.manifestBytes);
  await checkRelease(root);
  return { manifest: wanted.manifest, created: true };
}
export async function checkRelease(root = ROOT) {
  const sources = await source(root), wanted = expected(sources, await validateDeploymentConfig(root));
  validateOutput(await output(root), wanted, sources);
  return wanted.manifest;
}
export async function runCLI(args) {
  if (args.length !== 1 || !['build', 'check'].includes(args[0])) throw new Error('USAGE_RELEASE_BUILD_OR_CHECK_ONLY');
  const result = args[0] === 'build' ? (await buildRelease()).manifest : await checkRelease();
  process.stdout.write('PASS: ' + args[0] + ' release-candidate; ' + result.files.length + ' site files, fixed origin ' + ORIGIN + '. Offline only; not deployed or browser accepted.\n');
}
if (process.argv[1] && path.resolve(process.argv[1]) === path.join(ROOT, 'scripts', 'release.mjs')) runCLI(process.argv.slice(2)).catch(error => {
  const safe = /^[A-Z][A-Z0-9_]+$/.test(error.message) ? error.message : 'RELEASE_OPERATION_FAILED';
  process.stderr.write(safe + '\n'); process.exitCode = 1;
});
