import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { catalogLimits, validateCatalog } from "../scripts/catalog.mjs";

const baseline = JSON.parse(readFileSync(new URL("../catalog.json", import.meta.url), "utf8"));

function copyBaseline() {
  return JSON.parse(JSON.stringify(baseline));
}

test("accepts the current catalog and retains normalized bilingual entries as tools are added", () => {
  const catalog = validateCatalog(JSON.stringify(baseline));
  assert.equal(catalog.tools.length, baseline.tools.length);
  assert.deepEqual(catalog.tools, baseline.tools);
});

test("accepts a complete draft without inventing live URLs or a publication date", () => {
  const catalog = copyBaseline();
  catalog.tools.push({
    slug: "planned-tool",
    status: "draft",
    publishedAt: null,
    urls: null,
    zh: { name: "規劃中工具", description: "測試草稿。", useCase: "草稿用途。", example: { label: "範例", value: "1", detail: "不會顯示。" } },
    en: { name: "Draft tool", description: "A test draft.", useCase: "Draft use.", example: { label: "Example", value: "1", detail: "It stays hidden." } }
  });
  const draft = validateCatalog(catalog).tools.find((tool) => tool.slug === "planned-tool");
  assert.equal(draft.status, "draft");
  assert.equal(draft.publishedAt, null);
  assert.equal(draft.urls, null);
});

test("rejects unknown schema keys at every level", () => {
  const rootKey = copyBaseline();
  rootKey.extra = true;
  assert.throws(() => validateCatalog(rootKey), /missing or unknown fields/u);

  const toolKey = copyBaseline();
  toolKey.tools[0].extra = true;
  assert.throws(() => validateCatalog(toolKey), /missing or unknown fields/u);

  const languageKey = copyBaseline();
  languageKey.tools[0].en.example.extra = true;
  assert.throws(() => validateCatalog(languageKey), /missing or unknown fields/u);
});

test("rejects invalid hosted URL schemes, hosts, paths, credentials, ports, queries, and fragments", () => {
  const invalidUrls = [
    "http://units.glossquote.com/index.html",
    "https://example.com/index.html",
    "https://glossquote.com/index.html",
    "https://units.glossquote.com/tools/index.html",
    "https://units.glossquote.com/index.html?source=home",
    "https://units.glossquote.com/index.html#section",
    "https://user@units.glossquote.com/index.html",
    "https://units.glossquote.com:8443/index.html",
    "https://units.glossquote.com/en/index.html",
    "https://units.glossquote.com.evil.example/index.html"
  ];
  for (const invalidUrl of invalidUrls) {
    const catalog = copyBaseline();
    catalog.tools[0].urls["zh-Hant"] = invalidUrl;
    assert.throws(() => validateCatalog(catalog), /exact hosted HTTPS page URL/u, invalidUrl);
  }
});

test("rejects different language subdomains and duplicate published hosts", () => {
  const differentLanguageHosts = copyBaseline();
  differentLanguageHosts.tools[0].urls.en = "https://date.glossquote.com/en/index.html";
  assert.throws(() => validateCatalog(differentLanguageHosts), /same tool subdomain/u);

  const duplicateHost = copyBaseline();
  duplicateHost.tools[1].urls = {
    "zh-Hant": "https://units.glossquote.com/index.html",
    en: "https://units.glossquote.com/en/index.html"
  };
  assert.throws(() => validateCatalog(duplicateHost), /reuses a published tool subdomain/u);
});

test("rejects duplicate slugs, invalid calendar dates, and malformed status pairs", () => {
  const duplicate = copyBaseline();
  duplicate.tools[1].slug = duplicate.tools[0].slug;
  assert.throws(() => validateCatalog(duplicate), /duplicate slug/u);

  const badDate = copyBaseline();
  badDate.tools[0].publishedAt = "2026-02-29";
  assert.throws(() => validateCatalog(badDate), /real YYYY-MM-DD date/u);

  const badDraft = copyBaseline();
  badDraft.tools[0].status = "draft";
  assert.throws(() => validateCatalog(badDraft), /drafts must use null/u);
});

test("caps the serialized input and per-field content", () => {
  assert.throws(() => validateCatalog(" ".repeat(catalogLimits.maxBytes + 1)), /size limit/u);

  const oversized = copyBaseline();
  oversized.tools[0].en.description = "x".repeat(261);
  assert.throws(() => validateCatalog(oversized), /at most 260 characters/u);
});
