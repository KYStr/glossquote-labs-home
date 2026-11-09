// Loopback-only static preview server for the Spacing Token Audit tool.
// Serves dist-preview with correct MIME types, security headers, 404s for
// missing files, and rejection of path traversal / symlink escapes.
// Never lists directories and never logs request content.
// Usage: node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview
import { createServer } from "node:http";
import { readFile, realpath, stat } from "node:fs/promises";
import { extname, join, resolve, sep } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
};

const CSP =
  "default-src 'none'; script-src 'self'; style-src 'self'; worker-src 'blob:'; " +
  "img-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; " +
  "form-action 'none'; frame-ancestors 'none'";

function parseArgs(argv) {
  const args = { host: "127.0.0.1", port: 4173, dir: "dist-preview" };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--host" && argv[i + 1]) args.host = argv[++i];
    else if (argv[i] === "--port" && argv[i + 1]) args.port = Number(argv[++i]);
    else if (argv[i] === "--dir" && argv[i + 1]) args.dir = argv[++i];
    else throw new Error(`unknown argument: ${argv[i]}`);
  }
  if (args.host !== "127.0.0.1" && args.host !== "::1") {
    throw new Error("serve is loopback-only");
  }
  return args;
}

function main() {
  const { host, port, dir } = parseArgs(process.argv.slice(2));
  const baseDir = resolve(root, dir);

  const server = createServer(async (req, res) => {
    const headers = {
      "Content-Security-Policy": CSP,
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
      "X-Robots-Tag": "noindex, nofollow",
    };
    try {
      const url = new URL(req.url, `http://${host}`);
      let pathname = decodeURIComponent(url.pathname);
      if (pathname.endsWith("/")) pathname += "index.html";
      const target = resolve(baseDir, "." + pathname);
      if (!target.startsWith(baseDir + sep) && target !== baseDir) {
        res.writeHead(404, { ...headers, "Content-Type": "text/plain; charset=utf-8" });
        res.end("not found\n");
        return;
      }
      const real = await realpath(target).catch(() => null);
      if (real === null || (!real.startsWith(baseDir + sep) && real !== baseDir)) {
        res.writeHead(404, { ...headers, "Content-Type": "text/plain; charset=utf-8" });
        res.end("not found\n");
        return;
      }
      const info = await stat(real).catch(() => null);
      if (info === null || !info.isFile()) {
        res.writeHead(404, { ...headers, "Content-Type": "text/plain; charset=utf-8" });
        res.end("not found\n");
        return;
      }
      const body = await readFile(real);
      const type = MIME[extname(real).toLowerCase()] || "application/octet-stream";
      res.writeHead(200, { ...headers, "Content-Type": type, "Content-Length": body.length });
      if (req.method === "HEAD") res.end();
      else res.end(body);
    } catch {
      res.writeHead(500, { ...headers, "Content-Type": "text/plain; charset=utf-8" });
      res.end("error\n");
    }
  });

  let attempt = port;
  const tryListen = () => {
    server.listen(attempt, host, () => {
      console.log(`serving ${baseDir} at http://${host}:${attempt}/`);
      if (attempt !== port) console.log(`(port ${port} was busy; using ${attempt})`);
    });
  };
  server.on("error", (error) => {
    if (error.code === "EADDRINUSE" && attempt < port + 10) {
      attempt += 1;
      tryListen();
    } else {
      console.error(error.message);
      process.exit(1);
    }
  });
  tryListen();
}

main();
