// Loopback-only static preview server (no auto-open, no network beyond
// 127.0.0.1). Serves public/ so the tool can be probed over HTTP locally.
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const PUBLIC = resolve(ROOT, "public");
const HOST = "127.0.0.1";
const PORT = Number(process.env.PORT || 4173);

const MIME = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
]);

const HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Cache-Control": "no-store",
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${HOST}:${PORT}`);
    let path = decodeURIComponent(url.pathname);
    if (path.endsWith("/")) path += "index.html";
    const target = resolve(PUBLIC, `.${path}`);
    if (target !== PUBLIC && !target.startsWith(PUBLIC + sep)) {
      res.writeHead(403, HEADERS).end("forbidden");
      return;
    }
    const info = await stat(target).catch(() => null);
    if (!info || !info.isFile()) {
      res.writeHead(404, HEADERS).end("not found");
      return;
    }
    const body = await readFile(target);
    res.writeHead(200, { ...HEADERS, "Content-Type": MIME.get(extname(target)) ?? "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(500, HEADERS).end("error");
  }
});

server.listen(PORT, HOST, () => {
  console.log(`serving ${PUBLIC} at http://${HOST}:${PORT}/ (loopback only)`);
});
