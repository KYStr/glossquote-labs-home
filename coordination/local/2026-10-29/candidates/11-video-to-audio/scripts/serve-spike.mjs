import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createStaticServer, listenLoopback, PROJECT_ROOT, CSP } from './serve.mjs';
import { RUNTIME_FILES } from '../public/js/core/manifest.mjs';

const mounts = [
  { prefix: '/spike/', root: path.join(PROJECT_ROOT, 'test/spike') },
  { prefix: '/vendor/ffmpeg/', root: path.join(PROJECT_ROOT, 'public/vendor/ffmpeg') },
  { prefix: '/js/', root: path.join(PROJECT_ROOT, 'public/js') },
  { prefix: '/runtime-manifest.json', root: path.join(PROJECT_ROOT, 'public'), file: 'runtime-manifest.json' },
];
// Only fixed, test-owned routes; no upload, telemetry, arbitrary files or external proxy.
const loggedRoutes = new Set([
  ...RUNTIME_FILES.map((file) => file.path),
  ...['index.html', 'spike.mjs', 'fixtures.mjs', 'audio-metrics.mjs', 'unblock.mjs', 'observed-worker.mjs', 'worker-observer.mjs'].map((file) => `/spike/${file}`),
  '/js/ffmpeg-adapter.mjs', '/js/core/manifest.mjs', '/js/core/ffprobe-return.mjs', '/js/core/ffprobe-core.mjs', '/js/core/isolated-probe.mjs', '/runtime-manifest.json',
]);
export function createSpikeServer({ log = () => {}, fault = 'none' } = {}) {
  if (!['none', 'missing-wasm', 'corrupt-wasm', 'download-stall', 'slow-download'].includes(fault)) throw new Error('Unknown fixed spike fault');
  const wasmRoute = '/vendor/ffmpeg/core-0.12.10/ffmpeg-core.wasm';
  const server = createStaticServer({ mounts, delay: (route) => fault === 'download-stall' && route === wasmRoute ? 125000 : 0 });
  server.setSpikeFault = (value) => {
    if (!['none', 'missing-wasm', 'corrupt-wasm', 'download-stall', 'slow-download'].includes(value)) throw new Error('Unknown fixed spike fault');
    fault = value;
  };
  const serve = server.listeners('request')[0];
  server.removeListener('request', serve);
  server.on('request', async (req, res) => {
    const route = (req.url ?? '').split('?')[0];
    // Cache this immutable test observer so a genuinely unreachable origin can
    // exercise a fresh probe Worker. It is never in the product build.
    if (['/spike/observed-worker.mjs', '/js/core/ffprobe-core.mjs', '/js/core/ffprobe-return.mjs'].includes(route)) {
      const writeHead = res.writeHead;
      res.writeHead = function (...args) { this.setHeader('Cache-Control', 'public, max-age=3600'); return writeHead.apply(this, args); };
    }
    if (['GET', 'HEAD'].includes(req.method) && route === wasmRoute && ['missing-wasm', 'corrupt-wasm'].includes(fault)) {
      res.setHeader('Content-Security-Policy', CSP); res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Robots-Tag', 'noindex, nofollow'); res.setHeader('Referrer-Policy', 'no-referrer'); res.setHeader('Cache-Control', 'no-store');
      if (fault === 'missing-wasm') { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('404\n'); return; }
      const bytes = await readFile(path.join(PROJECT_ROOT, 'public/vendor/ffmpeg/core-0.12.10/ffmpeg-core.wasm'));
      bytes[bytes.length - 1] ^= 1;
      res.writeHead(200, { 'Content-Type': 'application/wasm', 'Content-Length': bytes.length });
      res.end(req.method === 'HEAD' ? undefined : bytes); return;
    }
    if (req.method === 'GET' && route === wasmRoute && fault === 'slow-download') {
      const bytes = await readFile(path.join(PROJECT_ROOT, 'public/vendor/ffmpeg/core-0.12.10/ffmpeg-core.wasm'));
      res.setHeader('Content-Security-Policy', CSP); res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('Cache-Control', 'no-store');
      res.writeHead(200, { 'Content-Type': 'application/wasm', 'Content-Length': bytes.length });
      for (let offset = 0; offset < bytes.length && !res.destroyed; offset += 1048576) {
        res.write(bytes.subarray(offset, offset + 1048576));
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      if (!res.destroyed) res.end(); return;
    }
    await serve(req, res);
  });
  server.on('request', (req, res) => {
    const route = (req.url ?? '').split('?')[0];
    res.once('finish', () => {
      log({ at: new Date().toISOString(), method: ['GET', 'HEAD'].includes(req.method) ? req.method : 'OTHER', route: loggedRoutes.has(route) ? route : 'REJECTED_ROUTE', status: res.statusCode, bytes: Number(res.getHeader('Content-Length')) || 0, fault });
    });
    res.once('close', () => { if (!res.writableFinished) log({ at: new Date().toISOString(), method: req.method === 'GET' ? 'GET' : 'OTHER', route: loggedRoutes.has(route) ? route : 'REJECTED_ROUTE', status: res.statusCode, incomplete: true, fault }); });
  });
  return server;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const faultArg = process.argv.slice(2).find((arg) => arg.startsWith('--fault='));
  const server = createSpikeServer({ fault: faultArg ? faultArg.slice(8) : 'none', log: (record) => console.log(JSON.stringify(record)) });
  const port = await listenLoopback(server, 5191);
  console.log(`Synthetic-only spike: http://127.0.0.1:${port}/spike/index.html`);
  process.on('SIGINT', () => server.close());
  process.on('SIGTERM', () => server.close());
}
