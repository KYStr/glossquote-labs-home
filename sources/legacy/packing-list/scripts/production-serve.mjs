import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PROJECT_ROOT, verifyPath } from './validation.mjs';
import { PRODUCTION_FILES } from './production-build.mjs';
import { checkProduction, parseHeaders } from './production-check.mjs';

// Local verification adapter, not a Worker and not evidence of live Cloudflare headers.
export async function startProductionPreview({ root = PROJECT_ROOT, port = 0 } = {}) {
  await checkProduction(root);
  const folder = join(root, 'dist-production');
  const rules = parseHeaders(await readFile(join(folder, '_headers'), 'utf8'));
  const mime = { html: 'text/html; charset=utf-8', mjs: 'text/javascript; charset=utf-8', css: 'text/css; charset=utf-8', txt: 'text/plain; charset=utf-8', xml: 'application/xml; charset=utf-8' };
  const server = createServer(async (request, response) => {
    const security = { ...rules.get('/*'), 'X-Robots-Tag': 'noindex, nofollow' };
    const reject = status => { response.writeHead(status, { ...security, 'Content-Type': 'text/plain; charset=utf-8' }); response.end(); };
    if (!['GET', 'HEAD'].includes(request.method)) { response.setHeader('Allow', 'GET, HEAD'); reject(405); return; }
    if (!/^127\.0\.0\.1(?::[0-9]+)?$/.test(request.headers.host ?? '')) { reject(400); return; }
    let path;
    try { path = decodeURIComponent(request.url.split('?')[0]); } catch { reject(400); return; }
    if (path === '/') path = '/index.html'; if (path === '/en/') path = '/en/index.html';
    if (!path.startsWith('/') || path.includes('\\') || path.includes('\0') || path.split('/').some(part => part.startsWith('.'))) { reject(404); return; }
    let status = 200, file = path.slice(1);
    if (file === '_headers' || !PRODUCTION_FILES.includes(file)) { status = 404; file = path.startsWith('/en/') ? 'en/404.html' : '404.html'; }
    try {
      await verifyPath(root, join(folder, file)); const bytes = await readFile(join(folder, file));
      const headers = { ...security, ...(rules.get(`/${file}`) ?? {}), 'Content-Type': mime[file.split('.').at(-1)], 'Content-Length': bytes.length };
      response.writeHead(status, headers); response.end(request.method === 'HEAD' ? undefined : bytes);
    } catch { reject(404); }
  });
  await new Promise((yes, no) => { server.once('error', no); server.listen(port, '127.0.0.1', yes); });
  return { server, port: server.address().port, url: `http://127.0.0.1:${server.address().port}/index.html` };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const preview = await startProductionPreview();
  console.log(JSON.stringify({ url: preview.url, port: preview.port, bind: '127.0.0.1', pid: process.pid, mode: 'local production-output validation; hosting NOT_RUN' }));
}
