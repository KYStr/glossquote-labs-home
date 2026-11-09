// Loopback-only static server for the preview build.
// Usage: node scripts/serve.mjs [--host 127.0.0.1] [--port 4173] [--dir dist-preview]
// --port 0 picks an ephemeral port and prints the bound port.

import { createServer } from "node:http";
import { lstat, readFile, realpath } from "node:fs/promises";
import { extname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));

const MIME_TYPES = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
]);

const SECURITY_HEADERS = Object.freeze({
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Cache-Control": "no-store",
  "X-Robots-Tag": "noindex, nofollow",
  "Content-Security-Policy":
    "default-src 'none'; script-src 'self'; style-src 'self'; worker-src blob:; img-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
});

function isPathInside(root, candidate) {
  const difference = relative(root, candidate);
  return (
    difference === "" ||
    (difference !== ".." && !isAbsolute(difference) && difference.split(sep)[0] !== "..")
  );
}

function sendText(response, statusCode, text, method) {
  const body = Buffer.from(text, "utf8");
  response.writeHead(statusCode, {
    ...SECURITY_HEADERS,
    "Content-Type": "text/plain; charset=utf-8",
    "Content-Length": body.byteLength,
  });
  response.end(method === "HEAD" ? undefined : body);
}

export function createStaticServer(rootDir) {
  const root = resolve(rootDir);
  return createServer(async (request, response) => {
    const method = request.method ?? "GET";
    if (method !== "GET" && method !== "HEAD") {
      sendText(response, 405, "Method Not Allowed", method);
      return;
    }
    let pathname;
    try {
      pathname = decodeURIComponent(new URL(request.url ?? "/", "http://127.0.0.1").pathname);
    } catch {
      sendText(response, 400, "Bad Request", method);
      return;
    }
    if (pathname.includes("\\") || pathname.includes("\0")) {
      sendText(response, 400, "Bad Request", method);
      return;
    }
    const relativePath = pathname.replace(/^\/+/, "");
    const candidate = resolve(join(root, relativePath));
    if (!isPathInside(root, candidate)) {
      sendText(response, 404, "Not Found", method);
      return;
    }
    try {
      const info = await lstat(candidate);
      let filePath = candidate;
      if (info.isSymbolicLink()) {
        sendText(response, 404, "Not Found", method);
        return;
      }
      if (info.isDirectory()) filePath = join(candidate, "index.html");
      const real = await realpath(filePath);
      if (!isPathInside(root, real)) {
        sendText(response, 404, "Not Found", method);
        return;
      }
      const body = await readFile(real);
      const type = MIME_TYPES.get(extname(real)) ?? "application/octet-stream";
      response.writeHead(200, {
        ...SECURITY_HEADERS,
        "Content-Type": type,
        "Content-Length": body.byteLength,
      });
      response.end(method === "HEAD" ? undefined : body);
    } catch {
      sendText(response, 404, "Not Found", method);
    }
  });
}

function parseArgs(argv) {
  const args = { host: "127.0.0.1", port: 4173, dir: resolve(PROJECT_ROOT, "dist-preview") };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--host") args.host = argv[++i];
    else if (argv[i] === "--port") args.port = Number(argv[++i]);
    else if (argv[i] === "--dir") args.dir = resolve(argv[++i]);
    else throw new Error("Unknown argument: " + argv[i]);
  }
  return args;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const args = parseArgs(process.argv.slice(2));
  const server = createStaticServer(args.dir);
  server.listen(args.port, args.host, () => {
    const address = server.address();
    console.log("Serving " + args.dir + " at http://" + args.host + ":" + address.port + "/");
  });
}
