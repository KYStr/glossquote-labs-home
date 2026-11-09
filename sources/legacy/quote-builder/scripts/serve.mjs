import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { root, publicFiles, securityHeaders, inspectTree } from './files.mjs';

export async function respond(request, response) {
  for (const [key, value] of Object.entries(securityHeaders)) response.setHeader(key, value);
  const finish = (status, text) => {
    response.statusCode = status;
    response.setHeader('Content-Type', 'text/plain; charset=utf-8');
    response.end(request.method === 'HEAD' ? undefined : text);
  };
  if (!['127.0.0.1:4237', 'localhost:4237'].includes(request.headers.host)) return finish(403, 'Forbidden host');
  if (!['GET', 'HEAD'].includes(request.method)) { response.setHeader('Allow', 'GET, HEAD'); return finish(405, 'Method not allowed'); }
  const raw = request.url;
  if (typeof raw !== 'string' || raw.includes('%') || raw.includes('\\') || raw.includes('..') || raw.includes('?') || raw.includes('#') || !raw.startsWith('/') || raw.startsWith('//')) return finish(400, 'Invalid path');
  const file = raw === '/' ? 'index.html' : raw === '/en/' ? 'en/index.html' : raw.slice(1);
  if (!publicFiles.includes(file)) return finish(404, 'Not found');
  try {
    await inspectTree(path.join(root, 'public'));
    const bytes = await readFile(path.join(root, 'public', file));
    response.statusCode = 200;
    const type = file.endsWith('.html') ? 'text/html' : file.endsWith('.css') ? 'text/css' : 'text/javascript';
    response.setHeader('Content-Type', `${type}; charset=utf-8`);
    response.setHeader('Content-Length', bytes.byteLength);
    response.end(request.method === 'HEAD' ? undefined : bytes);
  } catch { finish(500, 'Unable to read resource'); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await inspectTree(path.join(root, 'public'));
  const server = createServer((request, response) => { void respond(request, response); });
  server.on('error', () => { console.error('DEV_START_FAILED: expected 127.0.0.1:4237; no existing process was stopped.'); process.exitCode = 1; });
  server.listen(4237, '127.0.0.1', () => console.log('Preview: http://127.0.0.1:4237 (no browser opened)'));
}
