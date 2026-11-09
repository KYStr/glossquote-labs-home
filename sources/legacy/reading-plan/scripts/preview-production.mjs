// Offline loopback HTTP model, not a Cloudflare runtime or deployment.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ROOT, isMain } from './files.mjs';
import { checkProduction } from './check-production.mjs';
import { PRODUCTION_FILES, headersForPath } from './production.mjs';
export async function startProduction({ root = ROOT, port = 5206 } = {}) {
  await checkProduction(root);
  const server = createServer(async (request, response) => {
    const raw = request.url ?? '';
    const path = raw.split('?')[0];
    const headers = headersForPath(path);
    for (const [name, value] of Object.entries(headers)) response.setHeader(name, value);
    if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405, { Allow: 'GET, HEAD', 'Content-Type': 'text/plain; charset=utf-8', 'X-Robots-Tag': 'noindex, nofollow' }); response.end('Method not allowed'); return; }
    const name = path.startsWith('/') ? path.slice(1) : '';
    const valid = PRODUCTION_FILES.includes(name) && name !== '_headers';
    const file = valid ? name : '404.html';
    try {
      // Recheck the closed tree and bytes before reading, including link safety.
      await checkProduction(root);
      const bytes = await readFile(join(root, 'dist-production', file));
      const mime = { html: 'text/html; charset=utf-8', css: 'text/css; charset=utf-8', mjs: 'text/javascript; charset=utf-8', txt: 'text/plain; charset=utf-8', xml: 'application/xml; charset=utf-8' }[file.split('.').at(-1)];
      if (!valid) response.setHeader('X-Robots-Tag', 'noindex, nofollow');
      response.writeHead(valid ? 200 : 404, { 'Content-Type': mime, 'Content-Length': bytes.length });
      response.end(request.method === 'HEAD' ? undefined : bytes);
    } catch { response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8', 'X-Robots-Tag': 'noindex, nofollow' }); response.end('Candidate unavailable'); }
  });
  await new Promise((accept, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', accept); });
  return server;
}
if (isMain(import.meta.url)) {
  try { const server = await startProduction(); process.stdout.write(`Production HTTP model http://127.0.0.1:${server.address().port}/index.html (loopback only; not deployed)\n`); }
  catch (error) { process.stderr.write(`FAIL production model ${error.code ?? error.message}\n`); process.exitCode = 1; }
}
