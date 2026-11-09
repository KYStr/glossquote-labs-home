// Loopback-only static preview server. Serves public/ on
// 127.0.0.1 (port 4173, override with PORT). Never opens a browser,
// never binds a non-loopback interface, and refuses path traversal,
// dotfiles and symlinks. A trailing "/" maps to that directory's
// index.html so both language roots open directly.

import { createServer } from "node:http";
import { lstat, readFile, realpath } from "node:fs/promises";
import { extname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const PUBLIC_ROOT = resolve(PROJECT_ROOT, "public");
const HOST = "127.0.0.1";
const PORT = Number(process.env.PORT || 4173);

const MIME_TYPES = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
]);

const SECURITY_HEADERS = Object.freeze({
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Cache-Control": "no-store",
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
});

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

async function resolveRequestFile(requestTarget) {
  if (typeof requestTarget !== "string" || requestTarget[0] !== "/" || requestTarget.startsWith("//")) {
    return { statusCode: 400 };
  }
  const queryAt = requestTarget.indexOf("?");
  const rawPath = queryAt === -1 ? requestTarget : requestTarget.slice(0, queryAt);
  let decoded;
  try {
    decoded = decodeURIComponent(rawPath);
  } catch {
    return { statusCode: 400 };
  }
  if (decoded.includes("\\") || decoded.includes("\0")) return { statusCode: 400 };
  if (decoded.endsWith("/")) decoded += "index.html";

  const segments = decoded.slice(1).split("/");
  if (
    segments.some(
      (segment) => segment === "" || segment === "." || segment === ".." || segment.startsWith("."),
    )
  ) {
    return { statusCode: 403 };
  }
  const extension = extname(segments.at(-1)).toLowerCase();
  if (!MIME_TYPES.has(extension)) return { statusCode: 404 };

  const target = resolve(PUBLIC_ROOT, ...segments);
  if (!isPathInside(PUBLIC_ROOT, target) || target === PUBLIC_ROOT) return { statusCode: 403 };
  try {
    let current = PUBLIC_ROOT;
    for (const segment of segments) {
      current = resolve(current, segment);
      const info = await lstat(current);
      if (info.isSymbolicLink()) return { statusCode: 403 };
    }
    const canonicalRoot = await realpath(PUBLIC_ROOT);
    const canonicalTarget = await realpath(target);
    if (!isPathInside(canonicalRoot, canonicalTarget)) return { statusCode: 403 };
    const info = await lstat(canonicalTarget);
    if (!info.isFile()) return { statusCode: 404 };
    return { filePath: canonicalTarget, extension };
  } catch (error) {
    if (error?.code === "ENOENT" || error?.code === "ENOTDIR") return { statusCode: 404 };
    return { statusCode: 404 };
  }
}

export function createStaticServer() {
  return createServer(async (request, response) => {
    const method = request.method ?? "";
    if (method !== "GET" && method !== "HEAD") {
      sendText(response, 405, "Method not allowed.", method);
      return;
    }
    const resolved = await resolveRequestFile(request.url);
    if (resolved.statusCode) {
      const messages = new Map([
        [400, "Bad request."],
        [403, "Forbidden."],
        [404, "Not found."],
      ]);
      sendText(response, resolved.statusCode, messages.get(resolved.statusCode) ?? "Not found.", method);
      return;
    }
    try {
      const body = await readFile(resolved.filePath);
      response.writeHead(200, {
        ...SECURITY_HEADERS,
        "Content-Type": MIME_TYPES.get(resolved.extension),
        "Content-Length": body.byteLength,
      });
      response.end(method === "HEAD" ? undefined : body);
    } catch {
      sendText(response, 404, "Not found.", method);
    }
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const server = createStaticServer();
  server.on("error", (error) => {
    process.stderr.write(
      error?.code === "EADDRINUSE"
        ? `Could not start local preview at ${HOST}:${PORT}; the port may be in use.\n`
        : "Could not start the local preview server.\n",
    );
    process.exitCode = 1;
  });
  server.listen(PORT, HOST, () => {
    process.stdout.write(`Local preview available at http://${HOST}:${PORT}/index.html\n`);
  });
}
