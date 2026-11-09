import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { PROJECT_ROOT, PUBLIC_FILES, htmlTags, sha256, verifyPath } from './validation.mjs';
import { PRODUCTION_ORIGIN, PRODUCTION_FILES, assertPinnedPreview, walkProduction, CSP_BASE } from './production-build.mjs';

export function parseHeaders(source) {
  const rules = new Map(); let current;
  for (const line of source.split('\n')) {
    if (!line.trim()) continue;
    if (!line.startsWith('  ')) {
      if (rules.has(line) || !(line === '/*' || /^\/[A-Za-z0-9_./-]+$/.test(line))) throw new Error('HEADER_RULE');
      current = {}; rules.set(line, current);
    } else {
      const split = line.indexOf(':');
      if (!current || split < 3) throw new Error('HEADER_FIELD');
      const name = line.slice(2, split), value = line.slice(split + 1).trim();
      if (Object.hasOwn(current, name) || !/^[A-Za-z-]+$/.test(name) || /[\r\n]/.test(value)) throw new Error('HEADER_FIELD');
      current[name] = value;
    }
  }
  return rules;
}
export function validateProductionHtml(html, language, path) {
  const tags = htmlTags(html);
  const metas = tags.filter(tag => tag.name === 'meta');
  const links = tags.filter(tag => tag.name === 'link');
  const select = (attribute, value) => metas.filter(tag => tag.attrs.get(attribute) === value);
  assert.equal(tags[0].attrs.get('lang'), language);
  assert.equal(select('name', 'robots').length, 1);
  assert.equal(select('name', 'robots')[0].attrs.get('content'), 'index,follow');
  assert.equal(links.filter(tag => tag.attrs.get('rel') === 'canonical').length, 1);
  assert.equal(links.find(tag => tag.attrs.get('rel') === 'canonical').attrs.get('href'), `${PRODUCTION_ORIGIN}/${path}`);
  const alternates = links.filter(tag => tag.attrs.get('rel') === 'alternate');
  assert.equal(alternates.length, 3);
  for (const [locale, target] of [['zh-Hant', 'index.html'], ['en', 'en/index.html'], ['x-default', 'index.html']]) {
    assert.equal(alternates.filter(tag => tag.attrs.get('hreflang') === locale).length, 1);
    assert.equal(alternates.find(tag => tag.attrs.get('hreflang') === locale).attrs.get('href'), `${PRODUCTION_ORIGIN}/${target}`);
  }
  assert.equal(select('property', 'og:url')[0].attrs.get('content'), `${PRODUCTION_ORIGIN}/${path}`);
  assert.equal(select('property', 'og:locale')[0].attrs.get('content'), language === 'en' ? 'en_US' : 'zh_TW');
  const description = select('name', 'description')[0].attrs.get('content');
  assert.equal(select('property', 'og:description')[0].attrs.get('content'), description);
  const title = /<title>([^<]+)<\/title>/.exec(html)[1];
  assert.equal(select('property', 'og:title')[0].attrs.get('content'), title);
  const schemas = [...html.matchAll(/<script type="application\/ld\+json">([^<]+)<\/script>/g)];
  assert.equal(schemas.length, 1);
  const schema = JSON.parse(schemas[0][1]);
  assert.deepEqual(Object.keys(schema), ['@context', '@type', 'name', 'url', 'inLanguage', 'applicationCategory', 'operatingSystem', 'description']);
  assert.equal(schema['@context'], 'https://schema.org'); assert.equal(schema['@type'], 'WebApplication');
  assert.equal(schema.name, /<h1>([^<]+)<\/h1>/.exec(html)[1]);
  assert.equal(schema.url, `${PRODUCTION_ORIGIN}/${path}`); assert.equal(schema.inLanguage, language);
  assert.equal(schema.description, description); assert.equal(schema.applicationCategory, 'UtilitiesApplication');
  const home = language === 'en' ? 'https://glossquote.com/en/index.html' : 'https://glossquote.com/index.html';
  assert.match(html, new RegExp(`<footer>[^<]*<a href="${home.replaceAll('.', '\\.')}"`));
  for (const tag of tags) for (const [attribute, value] of tag.attrs) {
    if (/^on/i.test(attribute) || ['srcdoc', 'style', 'action', 'formaction', 'srcset', 'ping'].includes(attribute)) throw new Error('ACTIVE_ATTRIBUTE');
    if (attribute === 'src' && value !== '/js/app.mjs') throw new Error('ACTIVE_SOURCE');
    if (attribute === 'href' && !value.startsWith('#') && !PRODUCTION_FILES.includes(value.slice(1)) &&
        ![home, `${PRODUCTION_ORIGIN}/index.html`, `${PRODUCTION_ORIGIN}/en/index.html`].includes(value)) throw new Error('UNEXPECTED_LINK');
  }
  assert.equal(tags.filter(tag => tag.name === 'script').length, 2);
  return createHash('sha256').update(schemas[0][1]).digest('base64');
}
export async function checkProduction(root = PROJECT_ROOT) {
  await assertPinnedPreview(root);
  const output = join(root, 'dist-production'); await walkProduction(root, output);
  const config = JSON.parse(await readFile(join(root, 'wrangler.jsonc'), 'utf8'));
  assert.deepEqual(config, {
    name: 'glossquote-packing-list', compatibility_date: '2026-10-13', workers_dev: false, preview_urls: false,
    send_metrics: false, logpush: false, dependencies_instrumentation: { enabled: false },
    observability: { enabled: false, logs: { enabled: false }, traces: { enabled: false } },
    assets: { directory: './dist-production', html_handling: 'none', not_found_handling: '404-page' },
    routes: [{ pattern: 'packing.glossquote.com', custom_domain: true }]
  });
  const hashes = [];
  for (const [path, language] of [['index.html', 'zh-Hant'], ['en/index.html', 'en']]) {
    hashes.push(validateProductionHtml(await readFile(join(output, path), 'utf8'), language, path));
  }
  for (const file of PUBLIC_FILES.filter(file => file.endsWith('.mjs') || file.endsWith('.css'))) {
    assert.equal(sha256(await readFile(join(output, file))), sha256(await readFile(join(root, 'public', file))), file);
  }
  const headers = parseHeaders(await readFile(join(output, '_headers'), 'utf8'));
  const security = headers.get('/*');
  assert.equal(security['X-Content-Type-Options'], 'nosniff'); assert.equal(security['X-Frame-Options'], 'DENY');
  assert.equal(security['Referrer-Policy'], 'no-referrer'); assert.equal(security['Cache-Control'], 'no-store');
  assert.equal(security['Permissions-Policy'], 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
  assert.equal(security['Content-Security-Policy'], `${CSP_BASE}; script-src 'self' ${hashes.map(hash => `'sha256-${hash}'`).join(' ')}`);
  assert.equal(/unsafe-inline|unsafe-eval/.test(security['Content-Security-Policy']), false);
  for (const file of PUBLIC_FILES.filter(file => file.endsWith('.mjs'))) assert.equal(headers.get(`/${file}`)['Content-Type'], 'text/javascript; charset=utf-8');
  for (const [path, language] of [['404.html', 'zh-Hant'], ['en/404.html', 'en']]) {
    const html = await readFile(join(output, path), 'utf8');
    assert.equal(htmlTags(html)[0].attrs.get('lang'), language); assert.match(html, /name="robots" content="noindex,nofollow"/);
    assert.equal(html.includes('rel="canonical"'), false); assert.equal(html.includes('<script'), false);
    assert.equal(headers.get(`/${path}`)['X-Robots-Tag'], 'noindex, nofollow');
  }
  assert.equal(await readFile(join(output, 'robots.txt'), 'utf8'), `User-agent: *\nAllow: /\nSitemap: ${PRODUCTION_ORIGIN}/sitemap.xml\n`);
  const sitemap = await readFile(join(output, 'sitemap.xml'), 'utf8');
  assert.deepEqual([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]), [`${PRODUCTION_ORIGIN}/index.html`, `${PRODUCTION_ORIGIN}/en/index.html`]);
  const entries = [];
  for (const path of PRODUCTION_FILES) { const bytes = await readFile(join(output, path)); entries.push({ path, bytes: bytes.length, sha256: sha256(bytes) }); }
  return { status: 'PASS_PRODUCTION_STATIC_CHECKS', origin: PRODUCTION_ORIGIN, files: entries,
    digest: sha256(JSON.stringify(entries)), preview: '7 original assets byte-identical, noindex/nofollow; M1 preview server unchanged', hosting: 'NOT_RUN' };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 2) throw new Error('UNEXPECTED_ARGUMENT');
  console.log(JSON.stringify(await checkProduction(), null, 2));
}
