// Loopback-only preview server for dist-preview.
// Binds 127.0.0.1 on an OS-assigned (or --port) port, never auto-opens a
// browser, and sends the pinned security headers on every response.

import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const toolRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distDir = path.join(toolRoot, "dist-preview");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

const CSP =
  "default-src 'none'; script-src 'self'; style-src 'self'; worker-src blob:; img-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";

function sendHeaders(res, contentType, isHtml) {
  res.setHeader("Content-Type", contentType);
  res.setHeader("Content-Security-Policy", CSP);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  );
  if (isHtml) res.setHeader("X-Robots-Tag", "noindex, nofollow");
}

const portFlag = process.argv.indexOf("--port");
const requestedPort = portFlag === -1 ? 0 : Number(process.argv[portFlag + 1]);

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://127.0.0.1");
    let pathname = decodeURIComponent(url.pathname);
    if (pathname.endsWith("/")) pathname += "index.html";
    const filePath = path.normalize(path.join(distDir, pathname));
    if (!filePath.startsWith(distDir)) {
      res.writeHead(403);
      res.end("forbidden");
      return;
    }
    const info = await stat(filePath).catch(() => null);
    if (info === null || !info.isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("not found");
      return;
    }
    const extension = path.extname(filePath);
    sendHeaders(res, MIME[extension] ?? "application/octet-stream", extension === ".html");
    res.writeHead(200);
    res.end(await readFile(filePath));
  } catch {
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("error");
  }
});

server.listen(requestedPort, "127.0.0.1", () => {
  const address = server.address();
  console.log(`serving dist-preview at http://127.0.0.1:${address.port}/ (loopback only)`);
});
