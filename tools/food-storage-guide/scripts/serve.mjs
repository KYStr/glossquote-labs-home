// Loopback-only static preview server.
// GET/HEAD only, correct MIME types, 404 for missing files, directory
// requests resolve to index.html, and any path or symlink escaping the
// served directory is refused. No directory listing, no request logging.

import { createServer } from 'node:http';
import { lstat, readFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function parseArgs(argv) {
  const args = { host: '127.0.0.1', port: 4173, dir: path.join(root, 'dist-preview') };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--host') { args.host = argv[i + 1]; i += 1; } else if (arg.startsWith('--host=')) args.host = arg.slice('--host='.length); else if (arg === '--port') { args.port = Number(argv[i + 1]); i += 1; } else if (arg.startsWith('--port=')) args.port = Number(arg.slice('--port='.length)); else if (arg === '--dir') { args.dir = path.resolve(argv[i + 1]); i += 1; } else if (arg.startsWith('--dir=')) args.dir = path.resolve(arg.slice('--dir='.length)); else throw new Error(`unknown argument: ${arg}`);
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
if (args.host !== '127.0.0.1' && args.host !== '::1' && args.host !== 'localhost') {
  console.error('serve: host must be a loopback address');
  process.exit(1);
}
if (!Number.isInteger(args.port) || args.port < 0 || args.port > 65535) {
  console.error('serve: port must be an integer in 0..65535');
  process.exit(1);
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
};

const SECURITY_HEADERS = {
  'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self'; worker-src blob:; img-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'X-Robots-Tag': 'noindex, nofollow',
};

const baseDir = await realpath(args.dir);

async function resolveFile(urlPath) {
  let decoded;
  try {
    decoded = decodeURIComponent(urlPath);
  } catch {
    return null;
  }
  const relative = decoded.replace(/^\/+/, '');
  const candidate = path.resolve(baseDir, relative);
  if (candidate !== baseDir && !candidate.startsWith(baseDir + path.sep)) return null;
  let real;
  try {
    real = await realpath(candidate);
  } catch {
    return null;
  }
  if (real !== baseDir && !real.startsWith(baseDir + path.sep)) return null;
  const stat = await lstat(real);
  if (stat.isDirectory()) {
    const indexPath = path.join(real, 'index.html');
    try {
      const indexReal = await realpath(indexPath);
      if (!indexReal.startsWith(baseDir + path.sep)) return null;
      return indexReal;
    } catch {
      return null;
    }
  }
  if (!stat.isFile()) return null;
  return real;
}

const server = createServer(async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD', ...SECURITY_HEADERS });
    res.end();
    return;
  }
  const url = new URL(req.url, 'http://loopback');
  const file = await resolveFile(url.pathname);
  if (file === null) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', ...SECURITY_HEADERS });
    res.end(req.method === 'HEAD' ? undefined : 'Not found\n');
    return;
  }
  const bytes = await readFile(file);
  const type = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
  res.writeHead(200, {
    'Content-Type': type,
    'Content-Length': bytes.length,
    ...SECURITY_HEADERS,
  });
  res.end(req.method === 'HEAD' ? undefined : bytes);
});

server.listen(args.port, args.host, () => {
  const address = server.address();
  console.log(`serving ${baseDir} at http://${args.host}:${address.port}/`);
});
