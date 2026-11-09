// Loopback-only static preview server. Binds 127.0.0.1, never opens a
// browser, serves only the public/ tree with directory index support.

import { createServer } from "node:http";
import { lstat, readFile, realpath } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const PUBLIC = join(ROOT, "public");
const HOST = "127.0.0.1";
const PORT = Number(process.env.PORT || 4175);

const MIME = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
]);

const HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Cache-Control": "no-store",
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'",
};

function send(res, status, body, type = "text/plain; charset=utf-8") {
  const buf = Buffer.isBuffer(body) ? body : Buffer.from(body, "utf8");
  res.writeHead(status, { ...HEADERS, "Content-Type": type, "Content-Length": buf.byteLength });
  res.end(buf);
}

async function resolveFile(urlPath) {
  let decoded;
  try {
    decoded = decodeURIComponent(urlPath.split("?")[0]);
  } catch {
    return null;
  }
  if (!decoded.startsWith("/") || decoded.includes("\\") || decoded.includes("\0")) return null;
  const segments = decoded.split("/").filter((s) => s !== "" && s !== ".");
  if (segments.some((s) => s === "..")) return null;
  let target = join(PUBLIC, ...segments);
  try {
    const info = await lstat(target);
    if (info.isDirectory()) target = join(target, "index.html");
    const canonical = await realpath(target);
    const canonicalRoot = await realpath(PUBLIC);
    if (!canonical.startsWith(canonicalRoot)) return null;
    const finalInfo = await lstat(canonical);
    if (!finalInfo.isFile() || !MIME.has(extname(canonical).toLowerCase())) return null;
    return canonical;
  } catch {
    return null;
  }
}

const server = createServer(async (req, res) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    send(res, 405, "Method not allowed.");
    return;
  }
  const file = await resolveFile(req.url || "/");
  if (!file) {
    send(res, 404, "Not found.");
    return;
  }
  const body = await readFile(file);
  if (req.method === "HEAD") {
    res.writeHead(200, { ...HEADERS, "Content-Type": MIME.get(extname(file).toLowerCase()), "Content-Length": body.byteLength });
    res.end();
    return;
  }
  send(res, 200, body, MIME.get(extname(file).toLowerCase()));
});

server.listen(PORT, HOST, () => {
  process.stdout.write(`Local preview at ${"http:"}//${HOST}:${PORT}/ (loopback only)\n`);
});
