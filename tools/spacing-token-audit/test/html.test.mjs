// Static HTML / package tests for the Spacing Token Audit.
// Checks the exact SPEC strings, structure, and the absence of remote
// assets or dangerous sinks in the shipped pages and scripts.
import { equal, ok } from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { test } from "node:test";

const root = new URL("..", import.meta.url);
const read = (rel) => readFileSync(new URL(rel, root), "utf8");
const zh = read("public/index.html");
const en = read("public/en/index.html");
const appJs = read("public/js/app.js");
const controllerJs = read("public/js/controller.mjs");
const coreJs = read("public/js/core/audit.mjs");
const css = read("public/styles/app.css");
const pkg = JSON.parse(read("package.json"));

test("package contract", () => {
  equal(pkg.type, "module");
  ok(pkg.engines.node.includes("24"));
  for (const script of ["test", "check", "build:preview", "check:generated:preview"]) {
    ok(typeof pkg.scripts[script] === "string", script);
  }
  equal(pkg.dependencies, undefined);
  equal(pkg.devDependencies, undefined);
});

test("exact SPEC strings on both pages", () => {
  ok(zh.includes('lang="zh-Hant"'));
  ok(zh.includes("<title>設計間距 Token 對照｜Gloss Tools</title>"));
  ok(zh.includes("<h1>設計間距 Token 對照</h1>"));
  ok(
    zh.includes(
      "設計或前端同事拿到版面標註值，想知道每筆量測最接近哪個設計間距 token，並交付超出可接受偏差的列。",
    ),
  );
  ok(en.includes('lang="en"'));
  ok(en.includes("<title>Design Spacing Token Audit | Gloss Tools</title>"));
  ok(en.includes("<h1>Design Spacing Token Audit</h1>"));
  ok(
    en.includes(
      "Match measured pixel spacing to the nearest design token and check which differences exceed your tolerance.",
    ),
  );
  ok(zh.includes("等距時會選哪個 Token？"));
  ok(zh.includes("取 px 較小的，數值仍相同時依輸入先後。"));
  ok(zh.includes("會把量測改成 Token 值嗎？"));
  ok(zh.includes("報告只顯示匹配及偏差，原值仍可查看。"));
  ok(en.includes("Which token wins a tie?"));
  ok(en.includes("It picks the smaller pixel value, then the earlier listed token."));
  ok(en.includes("Does this edit measurements?"));
  ok(en.includes("The report shows matches and deviations alongside the original values."));
});

test("preview metadata: noindex, canonical, hreflang, home links", () => {
  for (const html of [zh, en]) {
    ok(html.includes('<meta name="robots" content="noindex,nofollow">'));
    ok(html.includes('rel="canonical"'));
    ok(html.includes('hreflang="zh-Hant"'));
    ok(html.includes('hreflang="en"'));
    ok(!html.includes("x-default"), "no x-default in the candidate");
    ok(!html.includes("glossquote.com"), "no production origin in the candidate");
  }
  ok(zh.includes('href="../../"'));
  ok(en.includes('href="../../en/"'));
  ok(zh.includes('href="en/"'));
  ok(en.includes('href="../"'));
});

test("CSP and security meta on both pages", () => {
  for (const html of [zh, en]) {
    ok(html.includes("default-src 'none'"));
    ok(html.includes("script-src 'self'"));
    ok(html.includes("style-src 'self'"));
    ok(html.includes("worker-src 'blob:'"));
    ok(html.includes("connect-src 'none'"));
    ok(html.includes("object-src 'none'"));
    ok(html.includes("base-uri 'none'"));
    ok(html.includes("form-action 'none'"));
    ok(html.includes("frame-ancestors 'none'"));
    ok(html.includes('name="referrer" content="no-referrer"'));
    ok(html.includes('camera=(), microphone=(), geolocation=()'));
  }
});

test("no remote assets, no inline handlers, no inline scripts", () => {
  for (const html of [zh, en]) {
    ok(!/https?:\/\//.test(html), "no remote URL");
    ok(!/(?:\s|^)on[a-z]+\s*=/.test(html), "no inline event handler");
    ok(!html.includes("<script>"), "no inline script block");
    ok(html.includes('<script type="module"'), "one module script");
  }
  for (const source of [appJs, controllerJs, coreJs, css]) {
    ok(!/https?:\/\//.test(source), "no remote URL in shipped sources");
  }
});

test("labels, aria wiring, and required ids", () => {
  for (const html of [zh, en]) {
    for (const field of ["tokens", "measurements", "tolerance"]) {
      ok(html.includes(`<label for="${field}">`), `label for ${field}`);
    }
    ok(html.includes('role="status"'), "status region");
    ok(html.includes('aria-live="polite"'), "polite live region");
    ok(html.includes('aria-busy='), "aria-busy present");
    ok(html.includes('role="alert"'), "error alert region");
    for (const id of [
      "audit-form", "run", "example", "cancel", "reset", "status", "error",
      "results", "summary", "results-body", "pager", "prev", "next",
      "page-label", "download",
    ]) {
      ok(html.includes(`id="${id}"`), `id ${id}`);
    }
    ok(html.includes("切換語言或離開頁面會遺失草稿。") || html.includes("discards your draft"), "draft-loss note");
  }
});

test("app wiring uses safe DOM APIs only", () => {
  ok(appJs.includes("textContent"));
  ok(appJs.includes("/*__WORKER_SOURCE__*/ null"), "build placeholder present");
  ok(appJs.includes("new Worker("), "Blob module Worker");
  ok(appJs.includes("createSyncWorker"), "synchronous fallback worker");
  ok(appJs.includes("pagehide"), "pagehide cleanup");
  ok(appJs.includes("pageshow"), "bfcache reset");
  ok(appJs.includes("URL.revokeObjectURL"), "Blob URLs are revoked");
  ok(appJs.includes("30000"), "download URL revoked within 30 seconds");
  for (const sink of ["innerHTML", "outerHTML", "document.write", "eval(", "fetch(", "localStorage"]) {
    ok(!appJs.includes(sink), `app.js has no ${sink}`);
  }
});

test("core is pure and worker handler is a fragment", () => {
  for (const name of ["document", "window", "navigator", "localStorage", "fetch("]) {
    ok(!coreJs.includes(name), `core has no ${name}`);
  }
  ok(coreJs.includes("BigInt"));
  const handler = read("scripts/worker-handler.mjs");
  ok(handler.includes("self.onmessage"));
  ok(handler.includes("run(snapshot)"));
  ok(!handler.includes("import "), "handler fragment has no imports");
});

test("file inventory matches the file contract", () => {
  const walk = (dir) => {
    const out = [];
    for (const entry of readdirSync(new URL(dir, root), { withFileTypes: true })) {
      if (entry.isDirectory()) out.push(...walk(`${dir}${entry.name}/`));
      else out.push(`${dir}${entry.name}`);
    }
    return out;
  };
  const files = walk("public/");
  for (const expected of [
    "public/index.html",
    "public/en/index.html",
    "public/js/core/audit.mjs",
    "public/js/controller.mjs",
    "public/js/app.js",
    "public/styles/app.css",
  ]) {
    ok(files.includes(expected), expected);
  }
  ok(css.includes("--gq-color-paper"), "shared design tokens in use");
  ok(css.includes(":focus-visible"), "visible focus styles");
});
