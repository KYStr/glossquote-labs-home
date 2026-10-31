import { createServer } from 'node:http';
import { readFile, lstat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { root, assets, listFiles } from './check.mjs';
// 只服務已建置且閉合的靜態清單，不把工作區變成任意檔案伺服器。
const csp = "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' blob:; connect-src 'none'; font-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
const mime = { html:'text/html; charset=utf-8',mjs:'text/javascript; charset=utf-8',css:'text/css; charset=utf-8',txt:'text/plain; charset=utf-8' };
export async function startServer(port = 4238) {
  const dist = resolve(root,'dist');
  const permitted = new Set([...assets,'build-manifest.json']);
  if ((await listFiles(dist)).some(path => !permitted.has(path))) throw new Error('DIST_ALLOWLIST');
  const server = createServer(createHandler(dist, () => server.address().port));
  await new Promise((resolve,reject) => { server.once('error',reject); server.listen(port,'127.0.0.1',resolve); });
  return server;
}
// 可直接以假 request/response 測試，不需另開網路 daemon。
export function createHandler(dist, getPort) {
  async function safeRead(path) {
    let current = dist;
    if ((await lstat(current)).isSymbolicLink()) throw new Error('LINK_REJECTED');
    for (const part of path.split('/')) {
      current = resolve(current, part); const stat = await lstat(current);
      if (stat.isSymbolicLink() || (stat.isFile() && stat.nlink !== 1)) throw new Error('LINK_REJECTED');
    }
    return readFile(current);
  }
  return async (request,response) => {
    const headers = {'Content-Security-Policy':csp,'Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Permissions-Policy':'camera=(), microphone=(), geolocation=()','X-Robots-Tag':'noindex, nofollow','Cache-Control':'no-store'};
    const reply = (status, body = '', contentType = 'text/plain; charset=utf-8', extra = {}) => { response.writeHead(status,{...headers,'Content-Type':contentType,...extra}); response.end(request.method === 'HEAD' ? undefined : body); };
    const actualPort = getPort();
    if (![`127.0.0.1:${actualPort}`,`localhost:${actualPort}`].includes(request.headers.host)) return reply(403,'Forbidden');
    if (!['GET','HEAD'].includes(request.method)) return reply(405,'Method not allowed','text/plain; charset=utf-8',{'Allow':'GET, HEAD'});
    if (request.url === '/') return reply(302,'','text/plain; charset=utf-8',{'Location':'/index.html'});
    if (request.url === '/en/') return reply(302,'','text/plain; charset=utf-8',{'Location':'/en/index.html'});
    const path = request.url?.slice(1);
    if (!assets.includes(path) || path === '_headers') {
      try { return reply(404,await safeRead('404.html'),'text/html; charset=utf-8'); } catch { return reply(500,'Build unavailable'); }
    }
    try {
      return reply(200,await safeRead(path),mime[path.split('.').at(-1)]);
    } catch { return reply(500,'Build unavailable'); }
  };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const server = await startServer(); console.log(`Preview: http://127.0.0.1:${server.address().port}/index.html (loopback only)`);
}
