import assert from 'node:assert/strict';
import { request } from 'node:http';
import { ALIASES, PRODUCTION_ASSETS, effectiveHeaders, productionMime, checkProduction } from './production-lib.mjs';
import { sha256 } from './files.mjs';

function get(path, method = 'GET', host = '127.0.0.1:5216') {
  return new Promise((resolve, reject) => {
    const req = request({ hostname: '127.0.0.1', port: 5216, path, method, headers: { Host: host }, agent: false }, response => {
      const chunks = []; response.on('data', chunk => chunks.push(chunk)); response.on('end', () => resolve({ status: response.statusCode, headers: response.headers, bytes: Buffer.concat(chunks) }));
    });
    req.setTimeout(5000, () => req.destroy(new Error('HTTP_TIMEOUT'))); req.on('error', reject); req.end();
  });
}
export async function productionHttpSmoke(root) {
  const checked = await checkProduction(root); const results = []; const headerRules = checked.output.get('_headers').toString();
  for (const file of PRODUCTION_ASSETS.filter(file => !['_headers', '_redirects'].includes(file))) for (const method of ['GET', 'HEAD']) {
    const response = await get('/' + file, method); const expected = checked.output.get(file);
    assert.equal(response.status, 200); assert.equal(response.headers['content-type'], productionMime(file)); assert.equal(response.headers['content-length'], String(expected.length));
    for (const [name, value] of Object.entries(effectiveHeaders(headerRules, '/' + file))) assert.equal(response.headers[name], value);
    if (['index.html', 'en/index.html'].includes(file)) assert.equal(response.headers['x-robots-tag'], undefined);
    assert.deepEqual(response.bytes, method === 'HEAD' ? Buffer.alloc(0) : expected);
    results.push({ path: '/' + file, method, status: 200, bytes: response.bytes.length, sha256: sha256(response.bytes) });
  }
  for (const [path, target] of Object.entries(ALIASES)) for (const method of ['GET', 'HEAD']) {
    const response = await get(path, method); assert.equal(response.status, 302); assert.equal(response.headers.location, target); assert.equal(response.bytes.length, 0);
    results.push({ path, method, status: 302, location: target });
  }
  for (const [path, status, method, host] of [
    ['/missing', 404], ['/en/missing', 404], ['/_headers', 404], ['/_redirects', 404], ['/package.json', 404], ['/app.mjs?draft=FAKE', 404],
    ['/../AGENTS.md', 404], ['/%2e%2e/AGENTS.md', 404], ['/INDEX.html', 404], ['/index.html', 405, 'POST'], ['/index.html', 421, 'GET', 'outside.invalid']
  ]) {
    const response = await get(path, method, host); assert.equal(response.status, status); assert.equal(response.headers['x-robots-tag'], 'noindex, nofollow');
    assert.ok(response.bytes.equals(checked.output.get('404.html'))); results.push({ path, method: method ?? 'GET', status });
  }
  return { status: 'PASS', scope: 'production-candidate-loopback-HTTP-model', origin: 'http://127.0.0.1:5216', deployed: false,
    checks: results.length, emittedAssets: PRODUCTION_ASSETS.length, servedAssets: PRODUCTION_ASSETS.length - 2, assetInventorySha256: checked.manifest.assetInventorySha256, results };
}
