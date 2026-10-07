import assert from "node:assert/strict";
import { copyFileSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, renameSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { buildProject, expectedFilesForProject, verifyGeneratedTree } from "../scripts/generated.mjs";

const originalCatalog = JSON.parse(readFileSync(new URL("../catalog.json", import.meta.url), "utf8"));
const testDirectory = resolve(fileURLToPath(new URL(".", import.meta.url)));
const temporaryDirectory = join(testDirectory, ".tmp");

function assertRegularDirectory(path) {
  const absolute = resolve(path);
  const details = lstatSync(absolute);
  if (!details.isDirectory() || details.isSymbolicLink() || realpathSync(absolute) !== absolute) {
    throw new Error("Test path must be a regular directory");
  }
}

function assertTreeHasNoLinks(path) {
  const details = lstatSync(path);
  if (details.isSymbolicLink()) throw new Error("Test cleanup refused a linked path");
  if (details.isDirectory()) {
    for (const name of readdirSync(path)) assertTreeHasNoLinks(join(path, name));
  } else if (!details.isFile()) {
    throw new Error("Test cleanup refused an unsupported filesystem entry");
  }
}

function safeRemoveFixtureArea(path) {
  const absolute = resolve(path);
  const rel = relative(temporaryDirectory, absolute);
  if (dirname(absolute) !== temporaryDirectory || rel === "" || rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel)) {
    throw new Error("Test cleanup target escaped test/.tmp");
  }
  assertRegularDirectory(temporaryDirectory);
  assertRegularDirectory(absolute);
  assertTreeHasNoLinks(absolute);
  rmSync(absolute, { recursive: true, force: false });
}

function createFixtureProject(t) {
  assertRegularDirectory(testDirectory);
  if (!existsSync(temporaryDirectory)) mkdirSync(temporaryDirectory, { recursive: false });
  assertRegularDirectory(temporaryDirectory);
  const area = mkdtempSync(join(temporaryDirectory, "fixture-"));
  t.after(() => safeRemoveFixtureArea(area));
  const root = join(area, "project");
  mkdirSync(root, { recursive: false });
  mkdirSync(join(root, "public", "styles"), { recursive: true });
  copyFileSync(new URL("../public/styles/site.css", import.meta.url), join(root, "public", "styles", "site.css"));

  const catalog = JSON.parse(JSON.stringify(originalCatalog));
  catalog.tools.push({
    slug: "third-fixture-tool",
    status: "published",
    // This fake tool must remain recent as the real catalog grows.
    publishedAt: "9999-12-31",
    urls: {
      "zh-Hant": "https://fixture.glossquote.com/index.html",
      en: "https://fixture.glossquote.com/en/index.html"
    },
    zh: {
      name: "第三個測試工具",
      description: "只用於驗證目錄更新的假資料。",
      useCase: "測試建置是否同步更新首頁。",
      example: { label: "測試範例", value: "<mark>安全文字</mark>", detail: "HTML 必須被轉義。" }
    },
    en: {
      name: "Third fixture tool",
      description: "Fake data used only to verify catalog updates.",
      useCase: "Check that a rebuild updates the homepage.",
      example: { label: "Test example", value: "<mark>safe text</mark>", detail: "HTML must be escaped." }
    }
  });
  catalog.tools.push({
    slug: "draft-fixture-tool",
    status: "draft",
    publishedAt: null,
    urls: null,
    zh: {
      name: "不可顯示的草稿",
      description: "測試草稿不會出現在公開頁面。",
      useCase: "只供離線 fixture 使用。",
      example: { label: "草稿範例", value: "999", detail: "不應輸出。" }
    },
    en: {
      name: "Hidden draft fixture",
      description: "The draft must not appear on the public page.",
      useCase: "Offline fixture only.",
      example: { label: "Draft example", value: "999", detail: "It must not be emitted." }
    }
  });

  writeFileSync(join(root, "catalog.json"), JSON.stringify(catalog), "utf8");
  return { root, area };
}

function occurrences(text, fragment) {
  return text.split(fragment).length - 1;
}

test("a real fixture rebuild adds a published third tool to both languages and excludes drafts", (t) => {
  const { root } = createFixtureProject(t);
  buildProject(root, "preview");
  const expected = expectedFilesForProject(root, "preview");
  verifyGeneratedTree(root, "preview", expected);

  for (const page of ["dist/index.html", "dist/en/index.html"]) {
    const html = readFileSync(join(root, page), "utf8");
    const fixtureName = page.includes("/en/") ? "Third fixture tool" : "第三個測試工具";
    assert.ok(occurrences(html, fixtureName) >= 2, `${fixtureName} should appear in the all-tools and recent sections`);
    assert.doesNotMatch(html, /Hidden draft fixture|不可顯示的草稿/u);
    assert.match(html, /&lt;mark&gt;safe text&lt;\/mark&gt;|&lt;mark&gt;安全文字&lt;\/mark&gt;/u);
  }
});

test("production build creates exact canonical, language, robots, sitemap, redirect, and header files", (t) => {
  const { root } = createFixtureProject(t);
  buildProject(root, "production");
  const expected = expectedFilesForProject(root, "production");
  verifyGeneratedTree(root, "production", expected);

  const zh = readFileSync(join(root, "dist-production", "index.html"), "utf8");
  const en = readFileSync(join(root, "dist-production", "en", "index.html"), "utf8");
  assert.match(zh, /rel="canonical" href="https:\/\/glossquote\.com\/index\.html"/u);
  assert.match(en, /rel="canonical" href="https:\/\/glossquote\.com\/en\/index\.html"/u);
  assert.match(zh, /hreflang="x-default" href="https:\/\/glossquote\.com\/index\.html"/u);
  assert.match(en, /hreflang="zh-Hant" href="https:\/\/glossquote\.com\/index\.html"/u);
  assert.match(zh, /name="robots" content="index, follow"/u);
  assert.match(readFileSync(join(root, "dist-production", "robots.txt"), "utf8"), /Sitemap: https:\/\/glossquote\.com\/sitemap\.xml/u);
  assert.match(readFileSync(join(root, "dist-production", "sitemap.xml"), "utf8"), /https:\/\/glossquote\.com\/en\/index\.html/u);
  assert.match(readFileSync(join(root, "dist-production", "_headers"), "utf8"), /connect-src 'none'/u);
  assert.equal(readFileSync(join(root, "dist-production", "_redirects"), "utf8"), "/ /index.html 301\n/en /en/index.html 301\n/en/ /en/index.html 301\n");
});

test("generated-output verification rejects missing, unexpected, and byte-tampered files", (t) => {
  const { root } = createFixtureProject(t);
  buildProject(root, "preview");
  const expected = expectedFilesForProject(root, "preview");
  verifyGeneratedTree(root, "preview", expected);

  writeFileSync(join(root, "dist", "index.html"), "tampered", "utf8");
  assert.throws(() => verifyGeneratedTree(root, "preview", expected), /Generated file differs: index\.html/u);

  buildProject(root, "preview");
  writeFileSync(join(root, "dist", "unexpected.txt"), "unexpected", "utf8");
  assert.throws(() => verifyGeneratedTree(root, "preview", expected), /unexpected: unexpected\.txt/u);

  buildProject(root, "preview");
  rmSync(join(root, "dist", "en", "index.html"));
  assert.throws(() => verifyGeneratedTree(root, "preview", expected), /missing: en\/index\.html/u);
});

test("preview stays noindex and uses local language links while production owns the public canonical URLs", (t) => {
  const { root } = createFixtureProject(t);
  buildProject(root, "preview");
  const preview = readFileSync(join(root, "dist", "index.html"), "utf8");
  assert.match(preview, /name="robots" content="noindex, nofollow"/u);
  assert.match(preview, /hreflang="en" href="\/en\/index\.html"/u);
  assert.doesNotMatch(preview, /rel="canonical"/u);
  assert.equal(readFileSync(join(root, "dist", "robots.txt"), "utf8"), "User-agent: *\nDisallow: /\n");
  assert.equal(expectedFilesForProject(root, "preview").has("sitemap.xml"), false);
});

test("linked catalog and stylesheet paths, plus remote CSS, fail before either output tree is replaced", (t) => {
  const { root, area } = createFixtureProject(t);
  const originalCatalogText = readFileSync(join(root, "catalog.json"), "utf8");
  const originalCssText = readFileSync(join(root, "public", "styles", "site.css"), "utf8");
  const expectedByMode = new Map();
  for (const mode of ["preview", "production"]) {
    buildProject(root, mode);
    expectedByMode.set(mode, expectedFilesForProject(root, mode));
  }

  const externalDirectory = join(area, "external-source");
  mkdirSync(externalDirectory, { recursive: false });
  writeFileSync(join(externalDirectory, "placeholder.txt"), "fixture", "utf8");

  const catalogPath = join(root, "catalog.json");
  rmSync(catalogPath);
  try {
    symlinkSync(externalDirectory, catalogPath, "junction");
    assert.throws(() => buildProject(root, "production"), /Linked source path is not allowed: catalog\.json/u);
    for (const mode of ["preview", "production"]) verifyGeneratedTree(root, mode, expectedByMode.get(mode));
  } finally {
    if (existsSync(catalogPath)) {
      const details = lstatSync(catalogPath);
      if (!details.isSymbolicLink()) throw new Error("Catalog junction cleanup refused an unexpected file");
      rmSync(catalogPath, { recursive: false, force: false });
    }
    writeFileSync(catalogPath, originalCatalogText, "utf8");
  }

  const publicPath = join(root, "public");
  const preservedPublicPath = join(root, "public-source");
  const externalPublicPath = join(area, "external-public");
  mkdirSync(join(externalPublicPath, "styles"), { recursive: true });
  writeFileSync(join(externalPublicPath, "styles", "site.css"), "body { color: black; }", "utf8");
  renameSync(publicPath, preservedPublicPath);
  try {
    symlinkSync(externalPublicPath, publicPath, "junction");
    assert.throws(() => buildProject(root, "production"), /Linked source path is not allowed: public\/styles\/site\.css/u);
    for (const mode of ["preview", "production"]) verifyGeneratedTree(root, mode, expectedByMode.get(mode));
  } finally {
    if (existsSync(publicPath)) {
      const details = lstatSync(publicPath);
      if (!details.isSymbolicLink()) throw new Error("Stylesheet junction cleanup refused an unexpected directory");
      rmSync(publicPath, { recursive: false, force: false });
    }
    renameSync(preservedPublicPath, publicPath);
  }

  const stylesheetPath = join(root, "public", "styles", "site.css");
  writeFileSync(stylesheetPath, "body { background-image: url(https://example.invalid/pixel.png); }", "utf8");
  assert.throws(() => buildProject(root, "production"), /Stylesheet asset references are not allowed/u);
  for (const mode of ["preview", "production"]) verifyGeneratedTree(root, mode, expectedByMode.get(mode));
  writeFileSync(stylesheetPath, originalCssText, "utf8");
});
