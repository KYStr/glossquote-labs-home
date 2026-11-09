// Loopback-only static server for local preview. Binds 127.0.0.1, never
// opens a browser, serves only files under public/.
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("../public/", import.meta.url)));
const PORT = Number(process.env.PORT || 4173);
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
    const file = resolve(ROOT, "." + path);
    if (file !== ROOT && !file.startsWith(ROOT + sep)) {
      res.writeHead(403).end("Forbidden");
      return;
    }
    const info = await stat(file).catch(() => null);
    if (!info || !info.isFile()) {
      res.writeHead(404).end("Not found");
      return;
    }
    const body = await readFile(file);
    res.writeHead(200, {
      "Content-Type": MIME.get(extname(file)) || "application/octet-stream",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    });
    res.end(body);
  } catch {
    res.writeHead(500).end("Error");
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Serving on http://127.0.0.1:${PORT}/ (loopback only)`);
});
