// Loopback-only static preview server for the EV Charging Calculator.
// Serves dist-preview/ with the candidate security headers, refuses path
// traversal and symlink escapes, and never opens a browser.

import { createServer as createHttpServer } from "node:http";
import { lstat, readFile, realpath } from "node:fs/promises";
import { extname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { PROJECT_ROOT } from "./check.mjs";

const MIME_TYPES = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
]);

export const SECURITY_HEADERS = Object.freeze({
  "Content-Security-Policy":
    "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex, nofollow",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Cache-Control": "no-store",
});

function isPathInside(rootPath, candidatePath) {
  const difference = relative(rootPath, candidatePath);
  return difference === "" || (
    difference !== ".." &&
    !isAbsolute(difference) &&
    difference.split(sep)[0] !== ".."
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

export function createPreviewServer({ root = resolve(PROJECT_ROOT, "dist-preview") } = {}) {
  const server = createHttpServer(async (request, response) => {
    const method = request.method ?? "GET";
    try {
      if (method !== "GET" && method !== "HEAD") {
        sendText(response, 405, "Method not allowed.", method);
        return;
      }
      const target = request.url ?? "/";
      if (!target.startsWith("/") || target.includes("\\") || target.includes("\0")) {
        sendText(response, 400, "Bad request.", method);
        return;
      }
      const queryIndex = target.indexOf("?");
      const rawPath = queryIndex === -1 ? target : target.slice(0, queryIndex);
      let decodedPath;
      try {
        decodedPath = decodeURIComponent(rawPath);
      } catch {
        sendText(response, 400, "Bad request.", method);
        return;
      }
      if (decodedPath.includes("\\") || decodedPath.includes("\0")) {
        sendText(response, 400, "Bad request.", method);
        return;
      }
      const relativePath = decodedPath === "/" ? "index.html" : decodedPath.slice(1);
      const segments = relativePath.split("/");
      if (segments.some((segment) => segment === "" || segment === "." || segment === ".." || segment.startsWith("."))) {
        sendText(response, 403, "Forbidden.", method);
        return;
      }
      const extension = extname(segments.at(-1)).toLowerCase();
      if (!MIME_TYPES.has(extension)) {
        sendText(response, 404, "Not found.", method);
        return;
      }
      const canonicalRoot = await realpath(root);
      const filePath = resolve(canonicalRoot, relativePath);
      if (!isPathInside(canonicalRoot, filePath)) {
        sendText(response, 403, "Forbidden.", method);
        return;
      }
      const info = await lstat(filePath).catch(() => null);
      if (!info || !info.isFile() || info.isSymbolicLink()) {
        sendText(response, 404, "Not found.", method);
        return;
      }
      const canonicalFile = await realpath(filePath);
      if (!isPathInside(canonicalRoot, canonicalFile)) {
        sendText(response, 403, "Forbidden.", method);
        return;
      }
      const bytes = await readFile(canonicalFile);
      response.writeHead(200, {
        ...SECURITY_HEADERS,
        "Content-Type": MIME_TYPES.get(extension),
        "Content-Length": bytes.byteLength,
      });
      response.end(method === "HEAD" ? undefined : bytes);
    } catch {
      sendText(response, 500, "Internal error.", method);
    }
  });
  return server;
}

export function parseServeArgs(argv) {
  let port = 4173;
  let dir = resolve(PROJECT_ROOT, "dist-preview");
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--port") {
      port = Number(argv[i + 1]);
      i += 1;
      if (!Number.isInteger(port) || port < 0 || port > 65535) {
        throw new Error("Invalid --port value.");
      }
    } else if (argv[i] === "--dir") {
      dir = resolve(argv[i + 1] ?? "");
      i += 1;
    } else if (argv[i] === "--host") {
      if (argv[i + 1] !== "127.0.0.1") throw new Error("Preview serving is loopback-only (127.0.0.1).");
      i += 1;
    } else {
      throw new Error(`Unknown serve argument: ${argv[i]}`);
    }
  }
  return { port, dir };
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  try {
    const { port, dir } = parseServeArgs(process.argv.slice(2));
    const server = createPreviewServer({ root: dir });
    server.listen(port, "127.0.0.1", () => {
      const address = server.address();
      process.stdout.write(`Serving preview at http://127.0.0.1:${address.port}/\n`);
    });
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : "Serve failed."}\n`);
    process.exitCode = 1;
  }
}
