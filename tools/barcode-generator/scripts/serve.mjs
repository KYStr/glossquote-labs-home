// Loopback-only static server for local preview. No auto-open, no writes.
// Usage: node scripts/serve.mjs [port]   (default 4173, 127.0.0.1 only)
import { createServer } from "node:http";
import { readFile, realpath, stat } from "node:fs/promises";
import { extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const PUBLIC_ROOT = await realpath(join(PROJECT_ROOT, "public"));
const PORT = Number(process.argv[2] ?? 4173);

const MIME = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
]);

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://127.0.0.1");
    let path = decodeURIComponent(url.pathname);
    if (path.endsWith("/")) path += "index.html";
    const filePath = await realpath(join(PUBLIC_ROOT, path));
    if (filePath !== PUBLIC_ROOT && !filePath.startsWith(PUBLIC_ROOT + sep)) {
      res.writeHead(403).end("forbidden");
      return;
    }
    const info = await stat(filePath);
    if (!info.isFile()) throw new Error("not a file");
    const body = await readFile(filePath);
    res.writeHead(200, {
      "Content-Type": MIME.get(extname(filePath)) ?? "application/octet-stream",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy":
        "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
    });
    res.end(body);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("not found");
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`serving http://127.0.0.1:${PORT}/ (loopback only)`);
});
