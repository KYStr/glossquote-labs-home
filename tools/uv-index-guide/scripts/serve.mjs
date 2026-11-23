// Loopback-only static preview server. GET/HEAD with correct MIME, 404 for
// missing files, traversal and symlink escapes rejected, no directory
// listing, no request logging. Never opens a browser.
// Usage: node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview
// With --port 0 it prints "PORT <n>" once listening.

import { createServer } from "node:http";
import { readFile, realpath, stat } from "node:fs/promises";
import { dirname, extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const toolDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
function argValue(name, fallback) {
  const i = args.indexOf(name);
  return i === -1 ? fallback : args[i + 1];
}
const host = argValue("--host", "127.0.0.1");
const port = Number(argValue("--port", "4173"));
const root = resolve(toolDir, argValue("--dir", "dist-preview"));
const rootReal = await realpath(root);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
};

const SECURITY_HEADERS = {
  "Content-Security-Policy":
    "default-src 'none'; script-src 'self'; style-src 'self'; worker-src blob:; img-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "X-Robots-Tag": "noindex, nofollow",
};

const server = createServer(async (req, res) => {
  const send = (status, body, type) => {
    res.writeHead(status, {
      ...SECURITY_HEADERS,
      "Content-Type": type || "text/plain; charset=utf-8",
      "Content-Length": body ? body.length : 0,
    });
    if (req.method === "HEAD") res.end();
    else res.end(body);
  };
  try {
    if (req.method !== "GET" && req.method !== "HEAD") {
      send(405, Buffer.from("method not allowed"));
      return;
    }
    const url = new URL(req.url, "http://localhost");
    let pathname;
    try {
      pathname = decodeURIComponent(url.pathname);
    } catch {
      send(400, Buffer.from("bad request"));
      return;
    }
    if (pathname.endsWith("/")) pathname += "index.html";
    const candidate = resolve(root, "." + pathname);
    if (candidate !== root && !candidate.startsWith(root + sep)) {
      send(404, Buffer.from("not found"));
      return;
    }
    let real;
    try {
      real = await realpath(candidate);
    } catch {
      send(404, Buffer.from("not found"));
      return;
    }
    if (real !== rootReal && !real.startsWith(rootReal + sep)) {
      send(404, Buffer.from("not found"));
      return;
    }
    const info = await stat(real);
    if (!info.isFile()) {
      send(404, Buffer.from("not found"));
      return;
    }
    const body = await readFile(real);
    send(200, body, MIME[extname(real)] || "application/octet-stream");
  } catch {
    send(500, Buffer.from("internal error"));
  }
});

server.listen(port, host, () => {
  const actual = server.address().port;
  console.log(`PORT ${actual}`);
  console.log(`serving ${root} on http://${host}:${actual}/`);
});
