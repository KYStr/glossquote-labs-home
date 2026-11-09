// Loopback-only static server for local preview. Serves dist/ (the
// generated preview) when present, otherwise public/. Binds 127.0.0.1
// only; never opens a browser. Sends the SPEC-pinned CSP and nosniff
// headers. Usage: node scripts/serve.mjs [--port N] (default 8123).

import { createReadStream } from "node:fs";
import { createServer } from "node:http";
import { lstat, readFile } from "node:fs/promises";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));

const portArg = process.argv.find((arg) => arg.startsWith("--port"));
const port = portArg
  ? Number(process.argv[process.argv.indexOf(portArg) + 1] ?? portArg.split("=")[1])
  : 8123;
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("Invalid --port value");
}

const distRoot = resolve(PROJECT_ROOT, "dist");
const publicRoot = resolve(PROJECT_ROOT, "public");
const distExists = await lstat(distRoot).catch(() => null);
const root = distExists && distExists.isDirectory() ? distRoot : publicRoot;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

// CSP pinned by SPEC.md (implementation section), served as an HTTP header.
const CSP =
  "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; worker-src 'self'; connect-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; object-src 'none'";

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, "http://127.0.0.1");
    let pathname = decodeURIComponent(url.pathname);
    if (pathname === "/") pathname = "/index.html";
    else if (pathname.endsWith("/")) pathname = `${pathname}index.html`;
    const target = normalize(join(root, pathname));
    if (!target.startsWith(root + sep) && target !== root) {
      response.writeHead(404, { "content-type": "text/plain" });
      response.end("not found\n");
      return;
    }
    const stat = await lstat(target).catch(() => null);
    if (stat === null || !stat.isFile()) {
      response.writeHead(404, { "content-type": "text/plain" });
      response.end("not found\n");
      return;
    }
    const type = MIME[extname(target)] || "application/octet-stream";
    response.writeHead(200, {
      "content-type": type,
      "content-security-policy": CSP,
      "x-content-type-options": "nosniff",
    });
    createReadStream(target).pipe(response);
  } catch {
    response.writeHead(500, { "content-type": "text/plain" });
    response.end("error\n");
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Serving ${root} at http://127.0.0.1:${port}/ (loopback only)`);
});
