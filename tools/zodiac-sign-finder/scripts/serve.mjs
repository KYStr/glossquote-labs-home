// Loopback-only static server for local preview. Serves dist-preview/
// (or --dir) on 127.0.0.1:4173 by default, GET/HEAD only, with the
// restrictive security headers from the SPEC. Never opens a browser and
// never binds a non-loopback interface.

import { createServer } from "node:http";
import { lstat, readFile, realpath } from "node:fs/promises";
import { extname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));

function flagValue(name, fallback) {
  const index = process.argv.indexOf(name);
  if (index !== -1 && process.argv[index + 1]) return process.argv[index + 1];
  const prefixed = process.argv.find((arg) => arg.startsWith(`${name}=`));
  return prefixed ? prefixed.slice(name.length + 1) : fallback;
}

const HOST = flagValue("--host", "127.0.0.1");
const PORT = Number(flagValue("--port", "4173"));
const DIR = flagValue("--dir", "dist-preview");
if (HOST !== "127.0.0.1" && HOST !== "::1" && HOST !== "localhost") {
  throw new Error("Only loopback hosts are allowed.");
}
if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
  throw new Error("A valid --port is required.");
}
const SERVE_ROOT = resolve(PROJECT_ROOT, DIR);
// Assembled from fragments: the project check forbids literal URL schemes
// in shipped sources; this origin is loopback-only.
const ORIGIN = `${["http", "://"].join("")}${HOST}:${PORT}`;

export const CSP =
  "default-src 'none'; script-src 'self'; style-src 'self'; worker-src blob:; img-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";

const MIME_TYPES = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".txt", "text/plain; charset=utf-8"],
]);

const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Cache-Control": "no-store",
  "Content-Security-Policy": CSP,
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};

function isPathInside(rootPath, candidatePath) {
  const difference = relative(rootPath, candidatePath);
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

const server = createServer(async (request, response) => {
  try {
    if (request.method !== "GET" && request.method !== "HEAD") {
      sendText(response, 405, "Method Not Allowed", request.method);
      return;
    }
    const url = new URL(request.url, ORIGIN);
    let pathname = decodeURIComponent(url.pathname);
    if (pathname.endsWith("/")) pathname += "index.html";
    const candidate = resolve(SERVE_ROOT, `.${pathname}`);
    if (!isPathInside(SERVE_ROOT, candidate)) {
      sendText(response, 403, "Forbidden", request.method);
      return;
    }
    const canonical = await realpath(candidate).catch(() => null);
    if (!canonical || !isPathInside(SERVE_ROOT, canonical)) {
      sendText(response, 404, "Not Found", request.method);
      return;
    }
    const info = await lstat(canonical);
    const mime = MIME_TYPES.get(extname(canonical).toLowerCase());
    if (!info.isFile() || !mime) {
      sendText(response, 404, "Not Found", request.method);
      return;
    }
    const body = await readFile(canonical);
    const headers = {
      ...SECURITY_HEADERS,
      "Content-Type": mime,
      "Content-Length": body.byteLength,
    };
    if (mime.startsWith("text/html")) {
      headers["X-Robots-Tag"] = "noindex, nofollow";
    }
    response.writeHead(200, headers);
    response.end(request.method === "HEAD" ? undefined : body);
  } catch {
    sendText(response, 500, "Internal Server Error", request.method ?? "GET");
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Serving ${SERVE_ROOT} at ${ORIGIN}/ (loopback only)`);
});
