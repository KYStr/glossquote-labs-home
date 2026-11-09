// Loopback-only static preview server. Serves dist-preview/ when a build
// exists, otherwise public/. Never opens a browser, binds 127.0.0.1 only.

import { existsSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const toolRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const built = path.join(toolRoot, "dist-preview");
const root = existsSync(path.join(built, "index.html")) ? built : path.join(toolRoot, "public");
const port = Number(process.env.PORT || 4173);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

const server = createServer((req, res) => {
  const url = new URL(req.url, "http://127.0.0.1");
  let rel = decodeURIComponent(url.pathname).replace(/^\/+/, "");
  if (rel === "" || rel.endsWith("/")) rel += "index.html";
  const file = path.normalize(path.join(root, rel));
  if (!file.startsWith(root) || !existsSync(file) || !statSync(file).isFile()) {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("not found");
    return;
  }
  res.writeHead(200, {
    "content-type": MIME[path.extname(file)] ?? "application/octet-stream",
    "x-robots-tag": "noindex, nofollow",
  });
  res.end(readFileSync(file));
});

server.listen(port, "127.0.0.1", () => {
  console.log(`serving ${path.relative(toolRoot, root)}/ at http://127.0.0.1:${port}/ (loopback only)`);
});
