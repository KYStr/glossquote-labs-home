import http from 'node:http';
import { readFile, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const mime = new Map([
  ['.html', 'text/html; charset=utf-8'], ['.css', 'text/css; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'], ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'], ['.xml', 'application/xml; charset=utf-8'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
]);
export const securityHeaders = {
  'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self'; worker-src 'self' blob:; connect-src 'none'; img-src 'self'; base-uri 'none'; object-src 'none'; form-action 'none'; frame-ancestors 'none'",
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'X-Frame-Options': 'DENY',
};
const inside = (root, candidate) => {
  const rel = path.relative(root, candidate);
  return rel !== '..' && !rel.startsWith(`..${path.sep}`) && !path.isAbsolute(rel);
};

export function createStaticServer(root = path.join(projectRoot, 'public'), { preview = true } = {}) {
  return http.createServer(async (request, response) => {
    const headers = { ...securityHeaders, 'Cache-Control': 'no-store' };
    if (preview) headers['X-Robots-Tag'] = 'noindex, nofollow';
    const reply = (status, body = '') => {
      response.writeHead(status, { ...headers, 'Content-Type': 'text/plain; charset=utf-8' });
      response.end(request.method === 'HEAD' ? undefined : body);
    };
    const notFound = async () => {
      try {
        const resolvedRoot = await realpath(root);
        const missingPage = await realpath(path.join(root,'404.html'));
        if (!inside(resolvedRoot,missingPage)) return reply(404,'Not found');
        const body=await readFile(missingPage);
        response.writeHead(404,{...headers,'Content-Type':'text/html; charset=utf-8','X-Robots-Tag':'noindex, nofollow','Content-Length':body.byteLength});
        response.end(request.method==='HEAD'?undefined:body);
      } catch { reply(404,'Not found'); }
    };
    if (!['GET', 'HEAD'].includes(request.method)) {
      headers.Allow = 'GET, HEAD';
      return reply(405, 'Method not allowed');
    }
    let decoded;
    try { decoded = decodeURIComponent((request.url ?? '').split('?')[0]); }
    catch { return reply(400, 'Invalid path'); }
    if (!decoded.startsWith('/') || decoded.startsWith('//') || /[\\\x00-\x1f:]/u.test(decoded)) return reply(400, 'Invalid path');
    if (decoded.split('/').some(part => part.startsWith('.'))) return reply(403, 'Forbidden path');
    if (decoded.endsWith('/')) decoded += 'index.html';
    const target = path.resolve(root, `.${decoded}`);
    if (!inside(root, target)) return reply(403, 'Forbidden path');
    if (!mime.has(path.extname(target))) return notFound();
    try {
      const resolvedRoot = await realpath(root);
      const resolvedTarget = await realpath(target);
      if (!inside(resolvedRoot, resolvedTarget)) return reply(403, 'Forbidden path');
      if (!(await stat(resolvedTarget)).isFile()) return notFound();
      const data = await readFile(resolvedTarget);
      response.writeHead(200, { ...headers, 'Content-Type': mime.get(path.extname(target)), 'Content-Length': data.byteLength });
      response.end(request.method === 'HEAD' ? undefined : data);
    } catch {
      return notFound();
    }
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const option = process.argv.slice(2);
  if (option.some(arg => !/^--port=\d+$/u.test(arg)) || option.length > 1) throw new Error('Only --port=<number> is accepted');
  const port = option.length ? Number(option[0].slice(7)) : 4182;
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('Invalid port');
  const server = createStaticServer();
  server.on('error', () => { console.error('PREVIEW_START_FAILED: choose a free loopback port'); process.exitCode = 1; });
  server.listen(port, '127.0.0.1', () => console.log(`PREVIEW_READY http://127.0.0.1:${server.address().port}/index.html`));
}
