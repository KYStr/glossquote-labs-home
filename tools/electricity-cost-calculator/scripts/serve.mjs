// Loopback-only static server for local preview. Serves public/ on
// 127.0.0.1 (default port 4173, override with PORT). Never opens a browser,
// never binds a public interface.
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const PUBLIC_ROOT = join(PROJECT_ROOT, "public");
const HOST = "127.0.0.1";
const PORT = Number(process.env.PORT ?? 4173);

const MIME = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
]);

const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Cache-Control": "no-store",
};

async function resolveFile(urlPath) {
  const decoded = decodeURIComponent(urlPath);
  const relativePath = normalize(decoded).replace(/^(\.\.[/\\])+/, "");
  let candidate = join(PUBLIC_ROOT, relativePath);
  if (candidate !== PUBLIC_ROOT && !candidate.startsWith(PUBLIC_ROOT + sep)) {
    return null;
  }
  const info = await stat(candidate).catch(() => null);
  if (info?.isDirectory()) candidate = join(candidate, "index.html");
  const fileInfo = await stat(candidate).catch(() => null);
  return fileInfo?.isFile() ? candidate : null;
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url, `http://${HOST}:${PORT}`);
  const file = await resolveFile(url.pathname);
  if (!file) {
    response.writeHead(404, { ...SECURITY_HEADERS, "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found\n");
    return;
  }
  const body = await readFile(file);
  response.writeHead(200, {
    ...SECURITY_HEADERS,
    "Content-Type": MIME.get(extname(file)) ?? "application/octet-stream",
    "Content-Length": body.byteLength,
  });
  response.end(request.method === "HEAD" ? undefined : body);
});

server.listen(PORT, HOST, () => {
  console.log(`Serving ${PUBLIC_ROOT} at http://${HOST}:${PORT}/ (loopback only)`);
});
