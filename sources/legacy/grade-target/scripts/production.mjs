import assert from 'node:assert/strict';
import { readFile, lstat } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { root, sourceContents, headers, extraFiles, inventory, sha256, verifyBuild } from './assets.mjs';
import { pageCopy } from './generate-pages.mjs';

export const origin = 'https://grades.glossquote.com';
export const canonicalPaths = ['/index.html', '/en/index.html'];
export const expectedConfig = {
  name: 'glossquote-grade-target', compatibility_date: '2026-10-17', workers_dev: false, preview_urls: false,
  send_metrics: false, dependencies_instrumentation: { enabled: false },
  observability: { enabled: false, logs: { enabled: false, invocation_logs: false }, traces: { enabled: false } },
  assets: { directory: './dist-production', html_handling: 'none', not_found_handling: '404-page' },
  routes: [{ pattern: 'grades.glossquote.com', custom_domain: true }]
};
export async function verifyConfig() {
  const file = join(root, 'wrangler.jsonc');
  const stat = await lstat(file);
  assert.ok(stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1);
  const actual = JSON.parse(await readFile(file, 'utf8'));
  assert.deepEqual(actual, expectedConfig);
  return actual;
}
const attribute = value => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
export function structuredData(language, path) {
  const t = pageCopy[language];
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': [
    { '@type': 'WebApplication', name: t.h1, description: t.description, url: origin + path, inLanguage: language, applicationCategory: 'EducationalApplication' },
    { '@type': 'FAQPage', inLanguage: language, mainEntity: t.faqs.map(([question,answer]) => ({ '@type': 'Question', name: question, acceptedAnswer: { '@type': 'Answer', text: answer } })) }
  ] }).replaceAll('<', '\\u003c');
}
export const scriptHash = text => `'sha256-${createHash('sha256').update(text, 'utf8').digest('base64')}'`;
export function pageCsp(schema) {
  return headers['Content-Security-Policy'].replace("script-src 'self'", `script-src 'self' ${scriptHash(schema)}`);
}
export async function expectedProduction() {
  await verifyConfig();
  const files = await sourceContents();
  let headerText = '/*\n' + Object.entries(headers).map(([key,value]) => `  ${key}: ${value}`).join('\n') + '\n';
  for (const [language, path] of [['zh-Hant','/index.html'],['en','/en/index.html']]) {
    const t = pageCopy[language];
    const schema = structuredData(language, path);
    const head = [
      `  <link rel="canonical" href="${origin}${path}">`,
      `  <link rel="alternate" hreflang="zh-Hant" href="${origin}/index.html">`,
      `  <link rel="alternate" hreflang="en" href="${origin}/en/index.html">`,
      `  <link rel="alternate" hreflang="x-default" href="${origin}/index.html">`,
      '  <meta property="og:type" content="website">',
      `  <meta property="og:title" content="${attribute(t.title)}">`,
      `  <meta property="og:description" content="${attribute(t.description)}">`,
      `  <meta property="og:url" content="${origin}${path}">`,
      `  <meta property="og:locale" content="${language === 'en' ? 'en_US' : 'zh_TW'}">`,
      `  <script type="application/ld+json">${schema}</script>`
    ].join('\n');
    const original = files.get(path.slice(1)).toString('utf8');
    assert.equal((original.match(/content="noindex,nofollow"/gu) ?? []).length, 1);
    const html = original.replace('content="noindex,nofollow"','content="index,follow"').replace('</head>', `${head}\n</head>`);
    files.set(path.slice(1), Buffer.from(html));
    headerText += `\n${path}\n  ! X-Robots-Tag\n  X-Robots-Tag: index, follow\n  ! Content-Security-Policy\n  Content-Security-Policy: ${pageCsp(schema)}\n`;
  }
  files.set('_headers', Buffer.from(headerText));
  files.set('404.html', Buffer.from(extraFiles['404.html']));
  files.set('robots.txt', Buffer.from(`User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`));
  files.set('sitemap.xml', Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${canonicalPaths.map(path => `  <url><loc>${origin}${path}</loc></url>`).join('\n')}\n</urlset>\n`));
  return files;
}
export function manifestFor(files) {
  return { schemaVersion: 1, mode: 'production', origin, files: [...files].sort(([a],[b]) => a.localeCompare(b,'en')).map(([path,bytes]) => ({ path, bytes: bytes.length, sha256: sha256(bytes) })) };
}
export async function verifyProduction() {
  const expected = await expectedProduction();
  const directory = join(root, 'dist-production');
  const found = await inventory(directory);
  assert.deepEqual(found, [...expected.keys(),'manifest.json'].sort());
  for (const [path,bytes] of expected) assert.ok(bytes.equals(await readFile(join(directory,path))), `stale-production: ${path}`);
  const manifest = JSON.parse(await readFile(join(directory,'manifest.json'),'utf8'));
  assert.deepEqual(manifest, manifestFor(expected));
  return { files: expected, manifest };
}

// Implements the subset of _headers actually emitted here: ordered matches,
// inherited attachments, comma joining, and explicit detach directives.
export function applyHeaderRules(text, path) {
  const output = {};
  let matches = false;
  for (const line of text.split('\n')) {
    if (!line.trim() || line.trimStart().startsWith('#')) continue;
    if (!/^\s/u.test(line)) { matches = line === '/*' || line === path; continue; }
    if (!matches) continue;
    const rule = line.trim();
    if (rule.startsWith('! ')) { delete output[rule.slice(2).toLowerCase()]; continue; }
    const colon = rule.indexOf(':');
    assert.ok(colon > 0, 'invalid-header-rule');
    const name = rule.slice(0,colon).toLowerCase(), value = rule.slice(colon+1).trim();
    output[name] = output[name] ? `${output[name]}, ${value}` : value;
  }
  return output;
}
export function robotsAllows(text, path) {
  let applies = false, selected = null;
  for (const line of text.split('\n')) {
    const match = /^([A-Za-z-]+):\s*(.*?)\s*$/u.exec(line);
    if (!match) continue;
    const [, key, value] = match;
    if (key.toLowerCase() === 'user-agent') { applies = value === '*'; continue; }
    if (!applies || !['allow','disallow'].includes(key.toLowerCase()) || value === '') continue;
    const end = value.endsWith('$'); const prefix = end ? value.slice(0,-1) : value;
    assert.ok(!prefix.includes('*'), 'unsupported-robots-pattern');
    const matches = end ? path === prefix : path.startsWith(prefix);
    if (matches && (!selected || prefix.length > selected.length || (prefix.length === selected.length && key.toLowerCase() === 'allow'))) selected = { length: prefix.length, allow: key.toLowerCase() === 'allow' };
  }
  return selected ? selected.allow : true;
}
export function auditProduction(files) {
  const ruleText = files.get('_headers').toString('utf8'), robots = files.get('robots.txt').toString('utf8');
  for (const [language,path] of [['zh-Hant','/index.html'],['en','/en/index.html']]) {
    const html = files.get(path.slice(1)).toString('utf8');
    assert.match(html, /<meta name="robots" content="index,follow">/u);
    assert.equal((html.match(/rel="canonical"/gu) ?? []).length, 1);
    assert.ok(html.includes(`<link rel="canonical" href="${origin}${path}">`));
    for (const [lang,url] of [['zh-Hant','/index.html'],['en','/en/index.html'],['x-default','/index.html']]) assert.ok(html.includes(`hreflang="${lang}" href="${origin}${url}"`));
    const scripts = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gu)];
    assert.equal(scripts.length, 1);
    const data = JSON.parse(scripts[0][1]);
    assert.deepEqual(data['@graph'][1].mainEntity, pageCopy[language].faqs.map(([question,answer]) => ({'@type':'Question',name:question,acceptedAnswer:{'@type':'Answer',text:answer}})));
    assert.equal(data['@graph'][0].url, origin + path);
    const actual = applyHeaderRules(ruleText,path);
    assert.equal(actual['x-robots-tag'], 'index, follow');
    assert.equal(actual['content-security-policy'], pageCsp(scripts[0][1]));
    assert.ok(!actual['content-security-policy'].includes('unsafe-'));
    assert.ok(robotsAllows(robots,path));
    for (const asset of [...html.matchAll(/(?:src|href)="(\/[^"#]+)"/gu)].map(match => match[1])) assert.ok(robotsAllows(robots,asset), `robots-blocks: ${asset}`);
    assert.ok(html.includes(`href="https://glossquote.com/${language === 'en' ? 'en/' : ''}index.html"`));
  }
  // ESM imports are crawlable too, not only the HTML's entry-point assets.
  for (const path of files.keys()) if (/\.(?:js|css)$/u.test(path)) assert.ok(robotsAllows(robots,'/'+path));
  const sitemap = files.get('sitemap.xml').toString();
  assert.deepEqual([...sitemap.matchAll(/<loc>(.*?)<\/loc>/gu)].map(match => match[1]), canonicalPaths.map(path => origin+path));
  for (const path of ['/','/en/','/404.html','/missing','/index.html?x=1']) assert.equal(applyHeaderRules(ruleText,path)['x-robots-tag'], 'noindex, nofollow');
  assert.match(files.get('404.html').toString(), /noindex,nofollow/u);
  assert.doesNotMatch(files.get('404.html').toString(), /<form|calculator|rel="canonical"/iu);
}
export async function verifyPreviewIfPresent() {
  try { await lstat(join(root,'dist')); } catch (error) { if (error.code === 'ENOENT') return false; throw error; }
  await verifyBuild(); return true;
}
