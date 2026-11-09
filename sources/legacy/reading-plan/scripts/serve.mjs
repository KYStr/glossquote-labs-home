import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ROOT, ASSETS, checkedTree, isMain } from './files.mjs';

export async function startPreview({ root = ROOT, port = 4206, fallback = false } = {}) {
  const directory = join(root, 'public');
  await checkedTree(directory);
  const types = { html: 'text/html; charset=utf-8', css: 'text/css; charset=utf-8', mjs: 'text/javascript; charset=utf-8', txt: 'text/plain; charset=utf-8' };
  const server = createServer(async (request, response) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('X-Robots-Tag', 'noindex, nofollow');
    response.setHeader('Cache-Control', 'no-store');
    if (!['GET', 'HEAD'].includes(request.method)) {
      response.writeHead(405, { Allow: 'GET, HEAD', 'Content-Type': 'text/plain; charset=utf-8' }); response.end('Method not allowed'); return;
    }
    const path = request.url;
    const name = path === '/' ? 'index.html' : typeof path === 'string' && path.startsWith('/') ? path.slice(1) : '';
    if (!ASSETS.includes(name)) {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); response.end(request.method === 'HEAD' ? undefined : 'Not found'); return;
    }
    try {
      await checkedTree(directory);
      const bytes = await readFile(join(directory, name));
      response.writeHead(200, { 'Content-Type': types[name.split('.').at(-1)], 'Content-Length': bytes.length });
      response.end(request.method === 'HEAD' ? undefined : bytes);
    } catch {
      response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' }); response.end('Preview unavailable');
    }
  });
  async function listen(actualPort) {
    await new Promise((accept, reject) => {
      const failed = (error) => { server.off('listening', ready); reject(error); };
      const ready = () => { server.off('error', failed); accept(); };
      server.once('error', failed); server.once('listening', ready); server.listen(actualPort, '127.0.0.1');
    });
  }
  try { await listen(port); }
  catch (error) { if (fallback && error.code === 'EADDRINUSE') await listen(0); else throw error; }
  return server;
}
if (isMain(import.meta.url)) {
  try {
    const server = await startPreview({ fallback: true });
    process.stdout.write(`Reading plan preview http://127.0.0.1:${server.address().port}/index.html (loopback only)\n`);
  } catch (error) { process.stderr.write(`FAIL preview ${error.code ?? 'UNAVAILABLE'}\n`); process.exitCode = 1; }
}
