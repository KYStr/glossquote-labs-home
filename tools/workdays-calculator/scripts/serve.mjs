import { createServer } from "node:http";
import { lstat, readFile, realpath } from "node:fs/promises";
import { extname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));

export const STATIC_MIME_TYPES = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
]);

const SECURITY_HEADERS = Object.freeze({
  "Content-Security-Policy":
    "default-src 'none'; script-src 'self'; style-src 'self'; worker-src 'blob:'; img-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex, nofollow",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Cache-Control": "no-store",
});

function isPathInside(rootPath, candidatePath) {
  const difference = relative(rootPath, candidatePath);
  return (
    difference === "" ||
    (difference !== ".." &&
      !isAbsolute(difference) &&
      difference.split(sep)[0] !== "..")
  );
}

function sendText(response, statusCode, text, extraHeaders = {}, method = "GET") {
  const body = Buffer.from(text, "utf8");
  response.writeHead(statusCode, {
    ...SECURITY_HEADERS,
    "Content-Type": "text/plain; charset=utf-8",
    "Content-Length": body.byteLength,
    ...extraHeaders,
  });
  response.end(method === "HEAD" ? undefined : body);
}

async function resolveRequestFile(rootPath, requestTarget) {
  if (typeof requestTarget !== "string" || requestTarget.length === 0 || requestTarget[0] !== "/") {
    return { statusCode: 400 };
  }
  if (requestTarget[1] === "/" || requestTarget.includes("\\") || requestTarget.includes("\0")) {
    return { statusCode: 400 };
  }
  const queryPosition = requestTarget.indexOf("?");
  const rawPath = queryPosition === -1 ? requestTarget : requestTarget.slice(0, queryPosition);
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(rawPath);
  } catch {
    return { statusCode: 400 };
  }
  if (decodedPath.includes("\\") || decodedPath.includes("\0") || decodedPath[0] !== "/") {
    return { statusCode: 400 };
  }
  if (decodedPath === "/") return { statusCode: 404 };

  const segments = decodedPath.slice(1).split("/");
  if (
    segments.length === 0 ||
    segments.some(
      (segment) =>
        segment === "" || segment === "." || segment === ".." || segment[0] === "." || segment.includes(":"),
    )
  ) {
    return { statusCode: 403 };
  }

  const extension = extname(segments.at(-1)).toLowerCase();
  if (!STATIC_MIME_TYPES.has(extension)) return { statusCode: 404 };

  const absoluteTarget = resolve(rootPath, ...segments);
  if (!isPathInside(rootPath, absoluteTarget) || absoluteTarget === rootPath) {
    return { statusCode: 403 };
  }

  try {
    const rootInfo = await lstat(rootPath);
    if (!rootInfo.isDirectory() || rootInfo.isSymbolicLink()) return { statusCode: 403 };

    let currentPath = rootPath;
    for (const segment of segments) {
      currentPath = resolve(currentPath, segment);
      const info = await lstat(currentPath);
      if (info.isSymbolicLink()) return { statusCode: 403 };
    }

    const canonicalRoot = await realpath(rootPath);
    const canonicalTarget = await realpath(absoluteTarget);
    if (!isPathInside(canonicalRoot, canonicalTarget) || canonicalTarget === canonicalRoot) {
      return { statusCode: 403 };
    }
    const info = await lstat(canonicalTarget);
    if (!info.isFile()) return { statusCode: 404 };
    return { filePath: canonicalTarget, extension };
  } catch (error) {
    if (error?.code === "ENOENT" || error?.code === "ENOTDIR") return { statusCode: 404 };
    return { statusCode: 404 };
  }
}

export function createStaticServer({ root } = {}) {
  const rootPath = resolve(root ?? resolve(PROJECT_ROOT, "dist-preview"));
  return createServer(async (request, response) => {
    const method = request.method ?? "";
    if (method !== "GET" && method !== "HEAD") {
      sendText(response, 405, "Method not allowed.", { Allow: "GET, HEAD" }, method);
      return;
    }
    const resolved = await resolveRequestFile(rootPath, request.url);
    if (resolved.statusCode) {
      const messages = new Map([
        [400, "Bad request."],
        [403, "Forbidden."],
        [404, "Not found."],
      ]);
      sendText(response, resolved.statusCode, messages.get(resolved.statusCode) ?? "Not found.", {}, method);
      return;
    }
    try {
      const body = await readFile(resolved.filePath);
      response.writeHead(200, {
        ...SECURITY_HEADERS,
        "Content-Type": STATIC_MIME_TYPES.get(resolved.extension),
        "Content-Length": body.byteLength,
      });
      response.end(method === "HEAD" ? undefined : body);
    } catch {
      sendText(response, 404, "Not found.", {}, method);
    }
  });
}

export function parseServeArgs(argv) {
  const parsed = { host: "127.0.0.1", port: 4173, dir: "dist-preview" };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--host") {
      parsed.host = argv[i + 1];
      i += 1;
    } else if (argv[i] === "--port") {
      parsed.port = Number(argv[i + 1]);
      i += 1;
    } else if (argv[i] === "--dir") {
      parsed.dir = argv[i + 1];
      i += 1;
    } else {
      throw new Error(`Unknown serve argument: ${argv[i]}`);
    }
  }
  if (!Number.isInteger(parsed.port) || parsed.port < 0 || parsed.port > 65535) {
    throw new Error("The serve port must be an integer between 0 and 65535.");
  }
  return parsed;
}

export function startServer({ host = "127.0.0.1", port = 4173, dir = "dist-preview" } = {}) {
  const rootPath = resolve(PROJECT_ROOT, dir);
  const server = createStaticServer({ root: rootPath });
  server.on("error", (error) => {
    if (error?.code === "EADDRINUSE") {
      process.stderr.write(`Could not start the preview at ${host}:${port}; the port may be in use.\n`);
    } else {
      process.stderr.write("Could not start the preview server.\n");
    }
    process.exitCode = 1;
  });
  server.listen(port, host, () => {
    const address = server.address();
    const actualPort = address && typeof address === "object" ? address.port : port;
    process.stdout.write(`Local preview available at http://${host}:${actualPort}/index.html\n`);
  });
  return server;
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  try {
    startServer(parseServeArgs(process.argv.slice(2)));
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : "Serve failed."}\n`);
    process.exitCode = 1;
  }
}
