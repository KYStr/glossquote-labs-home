import { createServer } from 'node:http';
import { readFile, lstat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertPlainPath, PUBLIC_FILES, MIME } from './validation.mjs';

export const HOST = '127.0.0.1';
export const PORT = 4203;
const HEADERS = Object.freeze({
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'X-Robots-Tag': 'noindex, nofollow',
  'Referrer-Policy': 'no-referrer',
  'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), clipboard-write=(self)'
});

export function routePath(rawUrl) {
  const rawPath = rawUrl.split('?')[0];
  let decoded;
  try { decoded = decodeURIComponent(rawPath); } catch { return null; }
  if (!decoded.startsWith('/') || /[\\\u0000-%:#]/.test(decoded)) return null;
  const segments = decoded.split('/').slice(1);
  if (segments.some((segment, i) => segment.startsWith('.') || (!segment && i !== segments.length - 1))) return null;
  let file = decoded.slice(1);
  if (!file || file.endsWith('/')) file += 'index.html';
  return PUBLIC_FILES.includes(file) ? file : null;
}

export async function startPreview(projectRoot, preferredPort = PORT) {
  const publicRoot = path.join(path.resolve(projectRoot), 'public');
  await assertPlainPath(publicRoot);
  const server = createServer(async (request, response) => {
    const method = request.method;
    if (method !== 'GET' && method !== 'HEAD') {
      response.writeHead(405, { ...HEADERS, Allow: 'GET, HEAD', 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Method not allowed');
      return;
    }
    const file = routePath(request.url ?? '');
    if (!file) {
      response.writeHead(404, { ...HEADERS, 'Content-Type': 'text/plain; charset=utf-8' });
      response.end(method === 'HEAD' ? undefined : 'Not found');
      return;
    }
    try {
      const absolute = await assertPlainPath(publicRoot, file);
      if (!(await lstat(absolute)).isFile()) throw new Error('NOT_REGULAR');
      const bytes = await readFile(absolute);
      response.writeHead(200, { ...HEADERS, 'Content-Type': MIME[path.extname(file)], 'Content-Length': bytes.length });
      response.end(method === 'HEAD' ? undefined : bytes);
    } catch {
      response.writeHead(404, { ...HEADERS, 'Content-Type': 'text/plain; charset=utf-8' });
      response.end(method === 'HEAD' ? undefined : 'Not found');
    }
  });
  function listen(port) {
    return new Promise((resolve, reject) => {
      const error = err => { server.off('listening', ready); reject(err); };
      const ready = () => { server.off('error', error); resolve(); };
      server.once('error', error);
      server.once('listening', ready);
      server.listen(port, HOST);
    });
  }
  let fallback = false;
  try { await listen(preferredPort); }
  catch (error) {
    if (error.code !== 'EADDRINUSE' || preferredPort === 0) throw error;
    fallback = true;
    await listen(0);
  }
  const address = server.address();
  return { server, url: `http://${HOST}:${address.port}`, port: address.port, fallback };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (Number(process.versions.node.split('.')[0]) < 24) throw new Error('NODE_24_REQUIRED');
  const preview = await startPreview(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'));
  console.log(JSON.stringify({ stage: 'M1-preview', url: preview.url, englishUrl: `${preview.url}/en/index.html`, pid: process.pid, fallback: preview.fallback }));
}
