import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { assets, root, inspectTree, inspectSource, securityHeaders } from './files.mjs';

export const origin = 'https://agenda.glossquote.com';
export const productionAssets = Object.freeze([...assets, 'sitemap.xml']);
export const frozenPublic = Object.freeze({
  "_headers": {
    "bytes": 487,
    "sha256": "35c320ae742dba65feae2f9cc43b73f2eb4d15484f8218b5cf998aa0e2526521"
  },
  "404.html": {
    "bytes": 596,
    "sha256": "ca276f422c6b64aa2b1b4e023d831b9ff70ee6d6329bfc91297f1a96a4d88a13"
  },
  "en/index.html": {
    "bytes": 6155,
    "sha256": "f0b143cf0de00cac7ea6b2a1a99595125660156d5e924ae6e78bcfa618c6f5cc"
  },
  "index.html": {
    "bytes": 5931,
    "sha256": "04002cdb8357770a374960f818ff79f67af9e6f2ef8fdbab1f732802551dc301"
  },
  "js/app.js": {
    "bytes": 21296,
    "sha256": "88e66e64d762132558444abc08316d2ac115dfaba7e5a9c51f26623273adae98"
  },
  "js/core/parse-clock.js": {
    "bytes": 558,
    "sha256": "4dfecc332f2b5ba746a8212a44938229e567aeb675c65c650eb396b94af2c3d6"
  },
  "js/core/parse-duration.js": {
    "bytes": 379,
    "sha256": "54e9fdbea4ceb06b46b3b63d459b097084c4a135b6a6b7bf8c03e50304f84ee7"
  },
  "js/core/report.js": {
    "bytes": 1584,
    "sha256": "4d9234bb194d533155a4689de80a6053d9263e5c9db42e48be1d90a901311c23"
  },
  "js/core/schedule.js": {
    "bytes": 1781,
    "sha256": "4320c2f157eb21032e1feaead9dd921cf652d0f25e05fff0e68a10fab25b377c"
  },
  "js/core/validation.js": {
    "bytes": 6423,
    "sha256": "d422a873697d610085168f3e0b5f2ef6e408d21301b580f82c20f0c52449fb66"
  },
  "robots.txt": {
    "bytes": 26,
    "sha256": "331ea9090db0c9f6f597bd9840fd5b171830f6e0b3ba1cb24dfa91f0c95aedc1"
  },
  "styles/app.css": {
    "bytes": 8583,
    "sha256": "1bd1106c7b3d7bcdf64f7d8eb5b56f982b29b03580c460299af89127cdf51d6e"
  }
});
export const releaseSourceFiles = Object.freeze([
  '.gitignore', 'package.json', 'wrangler.jsonc', 'AGENTS.md', 'ACCEPTANCE.md', 'DISPATCH.md', 'HANDOFF.md', 'PRODUCT.md', 'project.json', 'README.md', 'START-HERE.md', 'TASK-ENTRY.md', 'TASKS.md', 'TECHNICAL.md', 'UX-SEO.md',
  ...['BRAND.md', 'DESIGN-SYSTEM.md', 'ENGINEERING.md', 'GIT-PUBLICATION-SAFETY.md', 'PRIVACY-SECURITY.md', 'RELEASE-CANDIDATE.md', 'RELEASE.md'].map(path => 'docs/' + path),
  ...assets.map(path => 'public/' + path),
  ...['files.mjs', 'serve.mjs', 'check.mjs', 'build.mjs', 'production.mjs', 'build-production.mjs', 'check-production.mjs', 'preview-production.mjs', 'release-check.mjs'].map(path => 'scripts/' + path),
  ...['helpers.mjs', 'validation.test.mjs', 'schedule.test.mjs', 'report.test.mjs', 'app-harness.mjs', 'app.test.mjs', 'toolchain.test.mjs', 'production.test.mjs'].map(path => 'test/' + path)
]);
export const exactWranglerConfig = Object.freeze({
  name: 'glossquote-event-timeline', compatibility_date: '2026-10-16', workers_dev: false, preview_urls: false, send_metrics: false,
  assets: { directory: './dist-production', html_handling: 'none', not_found_handling: '404-page' },
  routes: [{ pattern: 'agenda.glossquote.com', custom_domain: true }],
  observability: { enabled: false, logs: { enabled: false }, traces: { enabled: false } }
});
export const pages = Object.freeze([
  { path: 'index.html', lang: 'zh-Hant', ogLocale: 'zh_TW', name: 'GlossQuote 活動時間表', title: 'GlossQuote 活動時間表｜安排活動流程與結束時間', description: '輸入開始時間與每段活動分鐘數，排出逐段起訖、跨午夜標記和目標結束時間差。活動資料只留在目前頁面記憶體。' },
  { path: 'en/index.html', lang: 'en', ogLocale: 'en_US', name: 'GlossQuote Event Timeline', title: 'GlossQuote Event Timeline | Plan an Event Schedule', description: 'Add a start time and activity durations to see each start and end, next-day markers, and the difference from an optional target. Data stays in this page’s memory.' }
]);
export function pageJsonLd(page) {
  return JSON.stringify({ '@context': 'https://schema.org', '@type': 'WebApplication', name: page.name, description: page.description,
    url: origin + '/' + page.path, applicationCategory: 'UtilitiesApplication', operatingSystem: 'Any', inLanguage: page.lang, browserRequirements: 'Requires JavaScript' });
}
export const jsonLdHashes = Object.freeze(pages.map(page => createHash('sha256').update(pageJsonLd(page)).digest('base64')));
export const productionHeaders = Object.freeze({
  ...securityHeaders,
  'Content-Security-Policy': securityHeaders['Content-Security-Policy'].replace("script-src 'self'", "script-src 'self' " + jsonLdHashes.map(hash => "'sha256-" + hash + "'").join(' '))
});
// Both JSON-LD hashes are a deliberate global allowlist. Default noindex also
// covers unknown 404 paths; canonical paths detach it and use HTML index meta.
export const headerText = '/*\n' + Object.entries(productionHeaders).map(([key, value]) => '  ' + key + ': ' + value).join('\n') +
  '\n/index.html\n  ! X-Robots-Tag\n/en/index.html\n  ! X-Robots-Tag\n';
export function resolveProductionHeaders(path, policy = headerText) {
  const headers = {};
  let pattern = null;
  for (const line of policy.split('\n')) {
    if (!line.trim()) continue;
    if (!/^\s/.test(line)) {
      if (!['/*', '/index.html', '/en/index.html'].includes(line)) throw new Error('Unknown header rule');
      pattern = line;
      continue;
    }
    if (pattern !== '/*' && pattern !== path) continue;
    const rule = line.trim();
    if (rule.startsWith('! ')) {
      if (rule !== '! X-Robots-Tag') throw new Error('Unknown detached header');
      delete headers['X-Robots-Tag'];
    } else {
      const colon = rule.indexOf(':');
      const name = rule.slice(0, colon);
      if (colon < 1 || !Object.hasOwn(productionHeaders, name)) throw new Error('Unknown static header');
      const value = rule.slice(colon + 1).trim();
      headers[name] = Object.hasOwn(headers, name) ? headers[name] + ', ' + value : value;
    }
  }
  return headers;
}
export const robotsText = 'User-agent: *\nAllow: /index.html$\nAllow: /en/index.html$\nAllow: /js/\nAllow: /styles/\nDisallow: /\nSitemap: https://agenda.glossquote.com/sitemap.xml\n';
export const sitemapText = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>https://agenda.glossquote.com/index.html</loc></url>\n  <url><loc>https://agenda.glossquote.com/en/index.html</loc></url>\n</urlset>\n';
export async function verifyFrozenPublic() {
  await inspectSource();
  assert.deepEqual([...assets].sort(), Object.keys(frozenPublic).sort(), 'Frozen source file set');
  for (const [path, expected] of Object.entries(frozenPublic)) {
    const bytes = await readFile(join(root, 'public', path));
    assert.equal(bytes.length, expected.bytes, 'M1 public size changed');
    assert.equal(createHash('sha256').update(bytes).digest('hex'), expected.sha256, 'M1 public hash changed');
  }
}
export async function renderProductionAssets() {
  await verifyFrozenPublic();
  const outputs = new Map(await Promise.all(assets.map(async path => [path, await readFile(join(root, 'public', path))])));
  for (const page of pages) {
    const metadata = [
      '<link rel="canonical" href="' + origin + '/' + page.path + '">',
      '<link rel="alternate" hreflang="zh-Hant" href="' + origin + '/index.html">',
      '<link rel="alternate" hreflang="en" href="' + origin + '/en/index.html">',
      '<link rel="alternate" hreflang="x-default" href="' + origin + '/index.html">',
      '<meta property="og:title" content="' + page.title + '">',
      '<meta property="og:description" content="' + page.description + '">',
      '<meta property="og:locale" content="' + page.ogLocale + '">',
      '<meta property="og:url" content="' + origin + '/' + page.path + '">',
      '<meta property="og:type" content="website">',
      '<script type="application/ld+json">' + pageJsonLd(page) + '</script>'
    ].map(line => '  ' + line).join('\n');
    const html = outputs.get(page.path).toString('utf8').replace('<meta name="robots" content="noindex,nofollow">', '<meta name="robots" content="index,follow">').replace('</head>', metadata + '\n</head>');
    outputs.set(page.path, Buffer.from(html));
  }
  outputs.set('_headers', Buffer.from(headerText));
  outputs.set('robots.txt', Buffer.from(robotsText));
  outputs.set('sitemap.xml', Buffer.from(sitemapText));
  return outputs;
}
export async function checkProduction() {
  await inspectTree('dist-production', productionAssets);
  assert.deepEqual(JSON.parse(await readFile(join(root, 'wrangler.jsonc'), 'utf8')), exactWranglerConfig, 'Closed Wrangler configuration');
  const expected = await renderProductionAssets();
  for (const path of productionAssets) assert.ok((await readFile(join(root, 'dist-production', path))).equals(expected.get(path)), 'Production asset mismatch: ' + path);
  return expected;
}
