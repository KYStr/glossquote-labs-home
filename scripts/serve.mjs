import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { defaultProjectRoot, expectedFilesForProject, verifyGeneratedTree } from "./generated.mjs";

const HOST = "127.0.0.1";
const PORT = 4180;
const root = defaultProjectRoot();
const expected = expectedFilesForProject(root, "preview");
const output = verifyGeneratedTree(root, "preview", expected);
const mimeTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".txt", "text/plain; charset=utf-8"],
  [".xml", "application/xml; charset=utf-8"]
]);
const securityHeaders = {
  "Content-Security-Policy": "default-src 'none'; base-uri 'none'; object-src 'none'; script-src 'none'; style-src 'self'; img-src 'self'; font-src 'self'; connect-src 'none'; form-action 'none'; frame-ancestors 'none'; media-src 'none'; worker-src 'none'",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Permissions-Policy": "camera=(), geolocation=(), microphone=(), payment=(), usb=()",
  "Cross-Origin-Opener-Policy": "same-origin"
};

function send(response, status, body = Buffer.alloc(0), headers = {}) {
  response.writeHead(status, {
    ...securityHeaders,
    "Content-Length": body.length,
    ...headers
  });
  response.end(response.req.method === "HEAD" ? undefined : body);
}

const server = createServer((request, response) => {
  response.req = request;
  if (request.method !== "GET" && request.method !== "HEAD") {
    send(response, 405, Buffer.from("Method Not Allowed\n"), { Allow: "GET, HEAD", "Content-Type": "text/plain; charset=utf-8" });
    return;
  }

  let parsed;
  let pathname;
  try {
    parsed = new URL(request.url, `http://${HOST}:${PORT}`);
    pathname = decodeURIComponent(parsed.pathname);
  } catch {
    send(response, 400, Buffer.from("Bad Request\n"), { "Content-Type": "text/plain; charset=utf-8" });
    return;
  }

  if (pathname.includes("\\") || pathname.includes("\u0000") || pathname.includes("//") || pathname.split("/").some((segment) => segment === "." || segment === "..")) {
    send(response, 400, Buffer.from("Bad Request\n"), { "Content-Type": "text/plain; charset=utf-8" });
    return;
  }

  const redirect = pathname === "/" ? "/index.html" : pathname === "/en" || pathname === "/en/" ? "/en/index.html" : null;
  if (redirect) {
    send(response, 301, Buffer.alloc(0), { Location: redirect });
    return;
  }

  const relativePath = pathname.replace(/^\//u, "");
  if (!expected.has(relativePath)) {
    send(response, 404, Buffer.from("Not Found\n"), { "Content-Type": "text/plain; charset=utf-8" });
    return;
  }

  const extension = relativePath.slice(relativePath.lastIndexOf("."));
  const body = readFileSync(join(output, ...relativePath.split("/")));
  send(response, 200, body, { "Content-Type": mimeTypes.get(extension) ?? "application/octet-stream" });
});

server.on("error", (error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});

server.listen(PORT, HOST, () => {
  process.stdout.write(`GlossQuote homepage preview: http://${HOST}:${PORT}/\n`);
});
