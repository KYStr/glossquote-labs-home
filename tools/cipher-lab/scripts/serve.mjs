// Loopback-only static server for local preview. Never opens a browser.
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = join(root, "public");
const port = Number.parseInt(process.env.PORT ?? "8471", 10);
const host = "127.0.0.1";

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", `http://${host}:${port}`);
    let path = normalize(decodeURIComponent(url.pathname)).replace(/^[/\\]+/, "");
    if (path === "" || path.endsWith("/")) path = join(path, "index.html");
    const file = join(publicDir, path);
    if (!file.startsWith(publicDir)) throw new Error("forbidden");
    const info = await stat(file);
    if (!info.isFile()) throw new Error("not a file");
    const body = await readFile(file);
    res.writeHead(200, {
      "content-type": TYPES[extname(file)] ?? "application/octet-stream",
      "x-robots-tag": "noindex, nofollow",
    });
    res.end(body);
  } catch {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("not found");
  }
});

server.listen(port, host, () => {
  console.log(`cipher-lab preview at http://${host}:${port}/ (loopback only)`);
});
