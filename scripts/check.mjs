import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validateCatalog } from "./catalog.mjs";
import { generateSiteFiles } from "./site.mjs";

try {
  const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  assert.equal(packageJson.type, "module");
  assert.equal(packageJson.private, true);
  assert.equal(packageJson.engines.node, ">=24");
  assert.equal(Object.hasOwn(packageJson, "dependencies"), false);
  assert.equal(Object.hasOwn(packageJson, "devDependencies"), false);

  const config = JSON.parse(readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8"));
  assert.equal(config.name, "glossquote-home");
  assert.equal(config.compatibility_date, "2026-10-06");
  assert.equal(config.workers_dev, false);
  assert.equal(config.preview_urls, false);
  assert.equal(config.send_metrics, false);
  assert.equal(config.main, undefined);
  assert.deepEqual(config.build, { command: "node scripts/release.mjs" });
  assert.deepEqual(config.routes, [{ pattern: "glossquote.com", custom_domain: true }]);
  assert.deepEqual(config.assets, {
    directory: "./dist-production",
    run_worker_first: false,
    html_handling: "none",
    not_found_handling: "none"
  });
  assert.equal(config.observability.enabled, false);
  assert.equal(config.observability.logs.enabled, false);
  assert.equal(config.observability.logs.invocation_logs, false);
  assert.equal(config.observability.traces.enabled, false);

  const catalogText = readFileSync(new URL("../catalog.json", import.meta.url), "utf8");
  const catalog = validateCatalog(catalogText);
  const css = readFileSync(new URL("../public/styles/site.css", import.meta.url), "utf8");
  assert.doesNotMatch(css, /@import\b|url\s*\(|@font-face\b/iu, "stylesheet must not load external or embedded assets");

  for (const mode of ["preview", "production"]) {
    const files = generateSiteFiles({ catalogInput: catalog, mode, cssText: css });
    assert.deepEqual([...files.keys()].filter((name) => name.endsWith(".html")).sort(), ["en/index.html", "index.html"]);
    for (const name of ["index.html", "en/index.html"]) {
      const html = files.get(name).toString("utf8");
      assert.doesNotMatch(html, /<script\b|<form\b|<iframe\b|\son[a-z]+\s*=|javascript:/iu);
      assert.match(html, /<meta name="description"/u);
      assert.match(html, /<h1\b/u);
    }
    const redirects = files.get("_redirects").toString("utf8");
    assert.equal(redirects, "/ /index.html 301\n/en /en/index.html 301\n/en/ /en/index.html 301\n");
    const robots = files.get("robots.txt").toString("utf8");
    if (mode === "preview") {
      assert.match(robots, /Disallow: \/\n/u);
      assert.equal(files.has("sitemap.xml"), false);
    } else {
      assert.match(robots, /Sitemap: https:\/\/glossquote\.com\/sitemap\.xml/u);
      assert.match(files.get("index.html").toString("utf8"), /<link rel="canonical" href="https:\/\/glossquote\.com\/index\.html">/u);
      assert.match(files.get("en/index.html").toString("utf8"), /hreflang="x-default" href="https:\/\/glossquote\.com\/index\.html"/u);
      assert.match(files.get("sitemap.xml").toString("utf8"), /https:\/\/glossquote\.com\/en\/index\.html/u);
    }
  }

  const permittedExternalUrls = new Set([
    "https://glossquote.com/index.html",
    "https://glossquote.com/en/index.html",
    ...catalog.tools.filter((tool) => tool.status === "published").flatMap((tool) => Object.values(tool.urls))
  ]);
  for (const mode of ["preview", "production"]) {
    const files = generateSiteFiles({ catalogInput: catalog, mode, cssText: css });
    for (const name of ["index.html", "en/index.html"]) {
      const html = files.get(name).toString("utf8");
      const hrefs = [...html.matchAll(/\shref="([^"]+)"/gu)].map((match) => match[1]);
      for (const href of hrefs) {
        if (/^https?:/u.test(href)) assert.equal(permittedExternalUrls.has(href), true, `unexpected external URL in ${name}`);
      }
    }
  }

  process.stdout.write("Homepage source, static output rules, SEO variants, and hosting configuration pass.\n");
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
}
