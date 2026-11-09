import assert from 'node:assert/strict';
import { readFile, readdir, lstat, realpath } from 'node:fs/promises';
import { join, resolve, relative, posix } from 'node:path';
import { createHash } from 'node:crypto';
import { ASSETS, CSP, HEADERS, mime } from './manifest.mjs';
import { assertNode, inspectTree, sha256 } from './files.mjs';

export const ORIGIN = 'https://subtitles.glossquote.com';
export const M1_PUBLIC_SHA256 = '0326098381c7f70510374488259b1dd50a3a9a0e95a1b31390e02ab0bcc06404';
export const PRODUCTION_ASSETS = Object.freeze([...ASSETS, '_redirects', 'sitemap.xml'].sort());
export const PAGES = Object.freeze(['index.html', 'en/index.html']);
export const ALIASES = Object.freeze({ '/': '/index.html', '/en': '/en/index.html', '/en/': '/en/index.html' });
export const FOOTERS = Object.freeze({
  'index.html': { from: 'Gloss Tools by GlossQuote · 本機預覽版', to: 'Gloss Tools by GlossQuote · 字幕時間平移' },
  'en/index.html': { from: 'Gloss Tools by GlossQuote · Local preview', to: 'Gloss Tools by GlossQuote · Subtitle Time Shift' }
});
export const WRANGLER = Object.freeze({
  name: 'glossquote-subtitle-shift', compatibility_date: '2026-10-19', workers_dev: false, preview_urls: false, send_metrics: false,
  assets: { directory: './dist-production', html_handling: 'none', not_found_handling: '404-page', run_worker_first: false },
  routes: [{ pattern: 'subtitles.glossquote.com', custom_domain: true }],
  observability: { enabled: false, logs: { enabled: false, invocation_logs: false }, traces: { enabled: false } }
});
export function validateWrangler(config) { assert.deepEqual(config, WRANGLER, 'CONFIG_NOT_EXACT_STATIC_ONLY'); }
const count = (text, needle) => text.split(needle).length - 1;
export function bodyOf(html) {
  const at = html.indexOf('<body>'); assert.ok(at >= 0 && count(html, '<body>') === 1, 'BODY_BOUNDARY'); return html.slice(at);
}
const decode = text => text.replace(/&(?:amp|quot|apos|lt|gt|#39);/g, token => ({ '&amp;': '&', '&quot;': '"', '&apos;': "'", '&lt;': '<', '&gt;': '>', '&#39;': "'" })[token]);
export function visibleFaq(html) {
  const entries = [...html.matchAll(/<details><summary>([^<]+)<\/summary><p>([^<]+)<\/p><\/details>/g)].map(match => ({ question: decode(match[1]), answer: decode(match[2]) }));
  assert.equal(entries.length, 5, 'VISIBLE_FAQ_COUNT'); return entries;
}
export function structuredData(html, file) {
  const language = file.startsWith('en/') ? 'en' : 'zh-Hant';
  const name = /<h1>([^<]+)<\/h1>/.exec(html)?.[1];
  const description = /<meta name="description" content="([^"]+)">/.exec(html)?.[1];
  assert.ok(name && description, 'VISIBLE_METADATA');
  return { '@context': 'https://schema.org', '@graph': [
    { '@type': 'WebApplication', '@id': `${ORIGIN}/${file}#app`, name: decode(name), description: decode(description), url: `${ORIGIN}/${file}`, inLanguage: language, applicationCategory: 'UtilitiesApplication', operatingSystem: 'Any', isAccessibleForFree: true },
    { '@type': 'FAQPage', '@id': `${ORIGIN}/${file}#faq`, inLanguage: language, mainEntity: visibleFaq(html).map(({ question, answer }) => ({ '@type': 'Question', name: question, acceptedAnswer: { '@type': 'Answer', text: answer } })) }
  ] };
}
export function makeProductionHtml(source, file) {
  assert.ok(PAGES.includes(file));
  const footer = FOOTERS[file]; assert.equal(count(bodyOf(source), footer.from), 1, 'FOOTER_EXACT_OCCURRENCE');
  const jsonText = '\n' + JSON.stringify(structuredData(source, file)).replaceAll('<', '\\u003c') + '\n';
  const jsonHash = 'sha256-' + createHash('sha256').update(jsonText).digest('base64');
  const seo = [
    `  <link rel="canonical" href="${ORIGIN}/${file}">`,
    `  <link rel="alternate" hreflang="zh-Hant" href="${ORIGIN}/index.html">`,
    `  <link rel="alternate" hreflang="en" href="${ORIGIN}/en/index.html">`,
    `  <link rel="alternate" hreflang="x-default" href="${ORIGIN}/index.html">`,
    `  <script id="tool-structured-data" type="application/ld+json">${jsonText}</script>`
  ].join('\n') + '\n';
  assert.equal(count(source, '<meta name="robots" content="noindex, nofollow">'), 1, 'PREVIEW_ROBOTS_REQUIRED');
  let html = source.replace('<meta name="robots" content="noindex, nofollow">', '<meta name="robots" content="index, follow">').replace('</head>', seo + '</head>');
  html = html.replace(footer.from, footer.to);
  assert.equal(bodyOf(html), bodyOf(source).replace(footer.from, footer.to), 'BODY_DIFF_OUTSIDE_APPROVED_FOOTER');
  return { html, jsonHash, bodyChange: { file, from: footer.from, to: footer.to, occurrences: 1, beforeSha256: sha256(bodyOf(source)), afterSha256: sha256(bodyOf(html)) } };
}
export function makeHeaders(hashes) {
  const scriptHashes = [...hashes].sort().map(hash => `'${hash}'`).join(' ');
  const headers = { ...HEADERS, 'Content-Security-Policy': CSP.replace("script-src 'self'", "script-src 'self' " + scriptHashes) };
  // One CSP policy. The only page-specific operation detaches the global
  // noindex header; no overlapping index/noindex or duplicate CSP values.
  return '/*\n' + Object.entries(headers).map(([name, value]) => `  ${name}: ${value}\n`).join('')
    + PAGES.map(file => `/${file}\n  ! X-Robots-Tag\n`).join('');
}
export function parseHeaders(text) {
  const rules = []; let current;
  for (const line of text.trimEnd().split('\n')) {
    if (line.startsWith('/')) { current = { path: line, operations: [] }; rules.push(current); }
    else {
      assert.ok(current, 'HEADER_RULE_MISSING');
      const remove = /^  ! ([A-Za-z-]+)$/.exec(line); const add = /^  ([A-Za-z-]+): (.+)$/.exec(line);
      assert.ok(remove || add, 'HEADER_SYNTAX');
      current.operations.push(remove ? { name: remove[1].toLowerCase(), remove: true } : { name: add[1].toLowerCase(), value: add[2], remove: false });
    }
  }
  return rules;
}
export function effectiveHeaders(text, path) {
  const result = {};
  for (const rule of parseHeaders(text)) if (rule.path === '/*' || rule.path === path) for (const operation of rule.operations) {
    if (operation.remove) delete result[operation.name];
    else result[operation.name] = Object.hasOwn(result, operation.name) ? result[operation.name] + ', ' + operation.value : operation.value;
  }
  return result;
}
export function makeRobots() {
  const allowed = ['/', '/en', '/en/', ...PRODUCTION_ASSETS.filter(file => !['_headers', '_redirects', '404.html'].includes(file)).map(file => '/' + file)];
  return 'User-agent: *\nDisallow: /\n' + allowed.map(path => `Allow: ${path}$\n`).join('') + `Sitemap: ${ORIGIN}/sitemap.xml\n`;
}
export function robotsAllows(text, path) {
  let group = false; let best = -1; let allowed = true;
  for (const line of text.trim().split('\n')) {
    const at = line.indexOf(':'); if (at < 0) continue;
    const name = line.slice(0, at).toLowerCase(); const value = line.slice(at + 1).trim();
    if (name === 'user-agent') { group = value === '*'; continue; }
    if (!group || !['allow', 'disallow'].includes(name) || value === '') continue;
    const anchored = value.endsWith('$'); const pattern = anchored ? value.slice(0, -1) : value;
    const escaped = pattern.split('*').map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*');
    if (!new RegExp('^' + escaped + (anchored ? '$' : '')).test(path)) continue;
    const length = pattern.replaceAll('*', '').length;
    if (length > best || (length === best && name === 'allow')) { best = length; allowed = name === 'allow'; }
  }
  return allowed;
}
export function makeSitemap() { return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + PAGES.map(file => `  <url><loc>${ORIGIN}/${file}</loc></url>\n`).join('') + '</urlset>\n'; }
export function makeRedirects() { return Object.entries(ALIASES).map(([from, to]) => `${from} ${to} 302\n`).join(''); }
export function productionMime(file) { return file === 'sitemap.xml' ? 'application/xml; charset=utf-8' : mime(file); }
export async function inspectProduction(root, partial = false) {
  const absolute = resolve(root); assertNode(await lstat(absolute), true);
  const physical = await realpath(absolute);
  assert.equal(process.platform === 'win32' ? physical.toLowerCase() : physical, process.platform === 'win32' ? absolute.toLowerCase() : absolute, 'REDIRECTED_PRODUCTION_TREE');
  const records = [];
  async function walk(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name); const name = relative(absolute, path).replaceAll('\\', '/'); const stat = await lstat(path);
      if (stat.isDirectory()) { assertNode(stat, true); assert.equal(name, 'en', 'UNKNOWN_PRODUCTION_DIRECTORY'); await walk(path); }
      else { assertNode(stat, false); assert.ok(PRODUCTION_ASSETS.includes(name), 'UNKNOWN_PRODUCTION_ASSET'); const bytes = await readFile(path); records.push({ path: name, bytes: bytes.length, sha256: sha256(bytes) }); }
    }
  }
  await walk(absolute); records.sort((a, b) => a.path.localeCompare(b.path, 'en'));
  if (!partial) assert.deepEqual(records.map(file => file.path).sort(), [...PRODUCTION_ASSETS].sort(), 'INCOMPLETE_PRODUCTION_ASSETS');
  return records;
}
export async function pinnedPublic(root) {
  const pin = JSON.parse(await readFile(join(root, 'config/m1-public.json'), 'utf8'));
  assert.equal(pin.schemaVersion, 1); assert.equal(pin.publicInventorySha256, M1_PUBLIC_SHA256);
  assert.equal(pin.sourceCandidateSha256, '43f921617c3478558b113bc39a666a017bd54274478179c3a8746bdca1c5f5a0');
  assert.equal(sha256(JSON.stringify(pin.files) + '\n'), M1_PUBLIC_SHA256, 'PIN_MANIFEST_DRIFT');
  const files = await inspectTree(join(root, 'public')); assert.deepEqual(files, pin.files, 'M1_PUBLIC_BYTES_CHANGED');
  return new Map(await Promise.all(ASSETS.map(async file => [file, await readFile(join(root, 'public', file))])));
}
export function compileProduction(source) {
  assert.deepEqual([...source.keys()].sort(), [...ASSETS].sort());
  const output = new Map(source); const pages = PAGES.map(file => ({ file, ...makeProductionHtml(source.get(file).toString('utf8'), file) }));
  for (const page of pages) output.set(page.file, Buffer.from(page.html));
  output.set('_headers', Buffer.from(makeHeaders(pages.map(page => page.jsonHash))));
  output.set('robots.txt', Buffer.from(makeRobots())); output.set('sitemap.xml', Buffer.from(makeSitemap())); output.set('_redirects', Buffer.from(makeRedirects()));
  return { output, pages };
}
export function validateProductionMap(output, source) {
  assert.deepEqual([...output.keys()].sort(), [...PRODUCTION_ASSETS].sort(), 'CLOSED_PRODUCTION_SET');
  const headers = output.get('_headers').toString('utf8'); const hashes = [];
  for (const file of PAGES) {
    const html = output.get(file).toString('utf8'); const original = source.get(file).toString('utf8');
    const approved = makeProductionHtml(original, file).html;
    assert.equal(html.slice(0, html.indexOf('<body>')), approved.slice(0, approved.indexOf('<body>')), 'UNAPPROVED_HEAD_DIFF');
    assert.equal(bodyOf(html), bodyOf(original).replace(FOOTERS[file].from, FOOTERS[file].to), 'UNAPPROVED_BODY_DIFF');
    assert.ok(html.includes('<meta name="robots" content="index, follow">') && !html.includes('content="noindex'), 'PRODUCTION_NOINDEX');
    assert.deepEqual([...html.matchAll(/<link rel="canonical" href="([^"]+)">/g)].map(match => match[1]), [`${ORIGIN}/${file}`]);
    assert.deepEqual([...html.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)">/g)].map(match => [match[1], match[2]]), [['zh-Hant', ORIGIN + '/index.html'], ['en', ORIGIN + '/en/index.html'], ['x-default', ORIGIN + '/index.html']]);
    const blocks = [...html.matchAll(/<script id="tool-structured-data" type="application\/ld\+json">([\s\S]*?)<\/script>/g)]; assert.equal(blocks.length, 1);
    assert.equal([...html.matchAll(/<script\b[^>]*>[\s\S]*?<\/script>/g)].length, 2, 'UNEXPECTED_SCRIPT_BLOCK');
    const originalModule = /<script type="module" src="[^"]+"><\/script>/.exec(original)?.[0];
    assert.ok(originalModule && count(html, originalModule) === 1, 'MODULE_TAG_CHANGED');
    assert.deepEqual(JSON.parse(blocks[0][1]), structuredData(original, file), 'VISIBLE_JSONLD_MISMATCH');
    const hash = 'sha256-' + createHash('sha256').update(blocks[0][1]).digest('base64'); hashes.push(hash);
    const effective = effectiveHeaders(headers, '/' + file);
    assert.equal(effective['x-robots-tag'], undefined, 'INDEX_NOINDEX_HEADER_MERGE');
    assert.ok(effective['content-security-policy'].includes(`'${hash}'`), 'JSONLD_HASH_NOT_ALLOWED');
    for (const match of html.matchAll(/<(?:script|link)\b[^>]*(?:src|href)="([^"]+)"/g)) {
      const ref = match[1]; if (ref.startsWith('https:')) { assert.ok(ref.startsWith(ORIGIN + '/'), 'REMOTE_HEAD_ASSET'); continue; }
      assert.ok(!/[:?#\\]/.test(ref)); assert.ok(output.has(posix.normalize(posix.join(posix.dirname(file), ref))), 'MISSING_HEAD_ASSET');
    }
  }
  assert.equal(headers, makeHeaders(hashes), 'HEADERS_NOT_EXACT');
  assert.equal(output.get('404.html').toString(), source.get('404.html').toString());
  assert.ok(output.get('404.html').toString().includes('content="noindex, nofollow"'));
  for (const path of ['/404.html', '/missing', '/en/missing', '/private/nested/missing']) assert.equal(effectiveHeaders(headers, path)['x-robots-tag'], 'noindex, nofollow');
  for (const file of ASSETS.filter(file => !['index.html', 'en/index.html', '_headers', 'robots.txt'].includes(file))) assert.ok(output.get(file).equals(source.get(file)), 'M1_EXECUTABLE_OR_ASSET_CHANGED');
  assert.equal(output.get('_redirects').toString(), makeRedirects()); assert.equal(output.get('sitemap.xml').toString(), makeSitemap());
  assert.equal(output.get('robots.txt').toString(), makeRobots());
  for (const file of PRODUCTION_ASSETS.filter(file => !['_headers', '_redirects', '404.html'].includes(file))) assert.equal(robotsAllows(output.get('robots.txt').toString(), '/' + file), true, 'REQUIRED_ASSET_ROBOTS_BLOCKED');
  for (const path of Object.keys(ALIASES)) assert.equal(robotsAllows(output.get('robots.txt').toString(), path), true, 'ALIAS_ROBOTS_BLOCKED');
  for (const path of ['/404.html', '/missing', '/private/data', '/app.mjs/extra']) assert.equal(robotsAllows(output.get('robots.txt').toString(), path), false, 'UNKNOWN_ROBOTS_ALLOWED');
}
export function productionManifest(compiled, configBytes) {
  const files = [...compiled.output].map(([path, bytes]) => ({ path, bytes: bytes.length, sha256: sha256(bytes) })).sort((a, b) => a.path.localeCompare(b.path, 'en'));
  return { schemaVersion: 1, mode: 'production-candidate-not-deployed', origin: ORIGIN, assets: files, assetInventorySha256: sha256(JSON.stringify(files) + '\n'),
    m1PublicInventorySha256: M1_PUBLIC_SHA256, wranglerSha256: sha256(configBytes),
    bodyChanges: compiled.pages.map(page => page.bodyChange), jsonLd: compiled.pages.map(page => ({ path: page.file, cspHash: page.jsonHash })) };
}
export async function readExpectedProduction(root) {
  const source = await pinnedPublic(root); const configBytes = await readFile(join(root, 'wrangler.jsonc'));
  validateWrangler(JSON.parse(configBytes)); const compiled = compileProduction(source); validateProductionMap(compiled.output, source);
  return { source, ...compiled, manifest: productionManifest(compiled, configBytes) };
}
export async function checkProduction(root) {
  const expected = await readExpectedProduction(root); const files = await inspectProduction(join(root, 'dist-production'));
  assert.deepEqual(files, expected.manifest.assets, 'PRODUCTION_BYTES_DRIFT');
  const actual = new Map(await Promise.all(PRODUCTION_ASSETS.map(async file => [file, await readFile(join(root, 'dist-production', file))])));
  validateProductionMap(actual, expected.source);
  assert.deepEqual(JSON.parse(await readFile(join(root, 'release-manifest.json'), 'utf8')), expected.manifest, 'RELEASE_MANIFEST_DRIFT');
  return { ...expected, files };
}
