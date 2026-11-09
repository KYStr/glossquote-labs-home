// Loopback-only static server for the built preview (dist-preview/).
// Correct MIME types, 404 for missing paths, traversal and symlink-escape
// rejection, no directory listing, no request-content logging, and the
// pinned preview security headers. Usage: node scripts/serve.mjs [--port=N]
// (default 4173; --port=0 picks an ephemeral port and prints it).

import { createServer } from "node:http";
import { lstat, readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const TOOL_DIR = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const ROOT = path.join(TOOL_DIR, "dist-preview");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon"
};

const HEADERS = {
  "Content-Security-Policy":
    "default-src 'none'; script-src 'self'; style-src 'self'; worker-src blob:; img-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "X-Robots-Tag": "noindex, nofollow"
};

export async function startServer(root = ROOT, port = 0) {
  const realRoot = await realpath(root);
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://127.0.0.1");
      let pathname = decodeURIComponent(url.pathname);
      if (pathname.endsWith("/")) pathname += "index.html";
      const candidate = path.normalize(path.join(realRoot, pathname));
      if (candidate !== realRoot && !candidate.startsWith(realRoot + path.sep)) {
        res.writeHead(403, HEADERS);
        res.end("Forbidden");
        return;
      }
      const real = await realpath(candidate).catch(() => null);
      if (real === null || (real !== realRoot && !real.startsWith(realRoot + path.sep))) {
        res.writeHead(404, HEADERS);
        res.end("Not found");
        return;
      }
      const stat = await lstat(real);
      if (!stat.isFile()) {
        res.writeHead(404, HEADERS);
        res.end("Not found");
        return;
      }
      const body = await readFile(real);
      const type = MIME[path.extname(real)] || "application/octet-stream";
      res.writeHead(200, { ...HEADERS, "Content-Type": type, "Content-Length": body.length });
      if (req.method === "HEAD") res.end();
      else res.end(body);
    } catch {
      res.writeHead(500, HEADERS);
      res.end("Error");
    }
  });
  await new Promise((resolve) => server.listen(port, "127.0.0.1", resolve));
  return server;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const arg = process.argv.find((a) => a.startsWith("--port="));
  const port = arg ? Number(arg.slice("--port=".length)) : 4173;
  const server = await startServer(ROOT, port);
  console.log("Serving " + ROOT + " at http://127.0.0.1:" + server.address().port + "/");
}
