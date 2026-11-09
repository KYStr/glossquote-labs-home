import { createHash } from 'node:crypto';
import { validateProduction, ORIGIN, headersForAsset } from './production.mjs';

const files = await validateProduction();
for (const file of ['index.html', 'en/index.html']) {
  const html = files.get(file).toString('utf8');
  if (!html.includes(`rel="canonical" href="${ORIGIN}/${file}"`) || !html.includes('content="index,follow"')) throw new Error('PRODUCTION_SEO');
  const scripts = [...html.matchAll(/<script type="application\/ld\+json">([^<]+)<\/script>/g)];
  if (scripts.length !== 1) throw new Error('JSON_LD_COUNT');
  const hash = createHash('sha256').update(scripts[0][1]).digest('base64');
  if (!headersForAsset(files, file)['Content-Security-Policy'].includes(`'sha256-${hash}'`)) throw new Error('JSON_LD_CSP');
}
process.stdout.write(`PASS production: ${files.size} exact assets, closed deployment config, bilingual SEO, JSON-LD CSP hashes, robots/sitemap/404/headers\n`);
