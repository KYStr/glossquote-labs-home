// Static page tests: both shipped pages carry the SPEC-pinned
// bilingual metadata, the health disclaimer, the five FAQ pairs, the
// formula rows and sources, the candidate noindex/no-canonical rules,
// the relative language and same-language home links, and every element
// id the app wires to. No browser is involved.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const PROJECT_ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));

const PAGE_IDS = [
  "ideal-weight-form",
  "field-heightCm",
  "field-sex-male",
  "field-sex-female",
  "error-heightCm",
  "error-sex",
  "error-general",
  "status",
  "example-note",
  "run-btn",
  "example-btn",
  "reset-btn",
  "cancel-btn",
  "download-btn",
  "health-disclaimer",
  "results",
  "results-heading",
  "summary",
  "result-rows",
];

const PAGES = [
  {
    path: "public/index.html",
    lang: "zh-Hant",
    title: "理想體重計算｜Gloss Tools",
    description:
      "輸入身高與性別，查 WHO 健康體重範圍、BMI 22 參考體重，以及 Devine、Robinson、Miller、Hamwi 四個已發表公式的理想體重估算，常數全數標明出處。",
    h1: "理想體重計算",
    langLink: 'href="./en/index.html"',
    home: 'href="../../"',
    assets: ['href="./styles/app.css"', 'src="./js/app.js"'],
    texts: [
      "身高（公分）",
      "性別（公式用）",
      "計算理想體重",
      "載入範例",
      "重設",
      "取消",
      "下載報告",
      "BMI 22 參考體重",
      "Devine（1974）",
      "Robinson（1983）",
      "Miller（1983）",
      "Hamwi（1964）",
      "這些數字是依身高與性別推算的族群統計參考值，不是個人醫療建議，也不是診斷或減重目標。",
      "為什麼四個公式的數字都不同？",
      "這裡的健康範圍和台灣國健署的標準一樣嗎？",
      "身高不到 5 英尺時公式怎麼算？",
      "為什麼沒有骨架大小的調整？",
      "可以把這些數字當減重目標嗎？",
      "1 磅 = 0.45359237 公斤",
      "ideal-weight-report.json",
      "切換語言或離開頁面會失去目前草稿。",
      "全部計算都在這個頁面本機進行，不上傳、不儲存、不記錄你的輸入。",
    ],
  },
  {
    path: "public/en/index.html",
    lang: "en",
    title: "Ideal Weight Calculator | Gloss Tools",
    description:
      "From height and sex, see the WHO healthy weight range, the BMI-22 reference weight, and ideal weight estimates from the four published Devine, Robinson, Miller and Hamwi formulas, with every constant cited.",
    h1: "Ideal Weight Calculator",
    langLink: 'href="../index.html"',
    home: 'href="../../en/"',
    assets: ['href="../styles/app.css"', 'src="../js/app.js"'],
    texts: [
      "Height (cm)",
      "Sex (used by the formulas)",
      "Calculate ideal weight",
      "Load example",
      "Reset",
      "Cancel",
      "Download report",
      "BMI-22 reference weight",
      "Devine (1974)",
      "Robinson (1983)",
      "Miller (1983)",
      "Hamwi (1964)",
      "These figures are population-level statistical references estimated from height and sex only. They are not personal medical advice, a diagnosis, or a weight-loss target.",
      "Why do the four formulas give different numbers?",
      "Is this range the same as Taiwan's HPA standard?",
      "What if I am shorter than 5 feet?",
      "Why is there no frame-size adjustment?",
      "Can I use these numbers as a weight-loss target?",
      "1 lb = 0.45359237 kg",
      "ideal-weight-report.json",
      "Switching language or leaving the page discards the current draft.",
      "All calculation happens locally on this page. Nothing is uploaded, stored, or logged.",
    ],
  },
];

for (const page of PAGES) {
  test(`${page.path}: pinned metadata and content`, async () => {
    const html = await readFile(resolve(PROJECT_ROOT, page.path), "utf8");
    assert.ok(html.includes(`<html lang="${page.lang}">`), "lang");
    assert.ok(html.includes(`<title>${page.title}</title>`), "title");
    assert.ok(html.includes(`<meta name="description" content="${page.description}">`), "description");
    assert.ok(html.includes(`<h1>${page.h1}</h1>`), "h1");
    assert.ok(html.includes('content="noindex, nofollow"'), "preview noindex");
    assert.ok(!html.includes("canonical"), "no canonical in candidate");
    assert.ok(!html.includes("hreflang"), "no hreflang in candidate");
    assert.ok(html.includes(page.langLink), "relative language link");
    assert.ok(html.includes(page.home), "same-language home link");
    for (const asset of page.assets) {
      assert.ok(html.includes(asset), `asset ${asset}`);
    }
    for (const text of page.texts) {
      assert.ok(html.includes(text), `pinned text: ${text}`);
    }
    for (const id of PAGE_IDS) {
      assert.ok(html.includes(`id="${id}"`), `element id ${id}`);
    }
  });
}

test("both pages expose the same element ids", async () => {
  const zh = await readFile(resolve(PROJECT_ROOT, "public/index.html"), "utf8");
  const en = await readFile(resolve(PROJECT_ROOT, "public/en/index.html"), "utf8");
  assert.notEqual(zh, en);
  for (const id of PAGE_IDS) {
    assert.ok(zh.includes(`id="${id}"`), `zh id ${id}`);
    assert.ok(en.includes(`id="${id}"`), `en id ${id}`);
  }
});

test("stylesheet carries the design tokens and the disclaimer/radio rules", async () => {
  const css = await readFile(resolve(PROJECT_ROOT, "public/styles/app.css"), "utf8");
  for (const token of ["--gq-color-ink", "--gq-color-paper", "--gq-color-acid", ".disclaimer", ".radio-row"]) {
    assert.ok(css.includes(token), `css token ${token}`);
  }
});

test("worker handler posts the generation back with the core outcome", async () => {
  const handler = await readFile(resolve(PROJECT_ROOT, "public/js/worker-handler.mjs"), "utf8");
  assert.ok(handler.includes("self.onmessage"), "handler wires onmessage");
  assert.ok(handler.includes("self.postMessage({ generation: data.generation, ...payload })"));
  assert.ok(handler.includes('code: "INTERNAL"'), "handler falls back to INTERNAL");
});

test("result row labels rendered by app.js match the SPEC order and wording", async () => {
  const app = await readFile(resolve(PROJECT_ROOT, "public/js/app.js"), "utf8");
  for (const label of [
    "健康體重範圍（WHO)",
    "BMI 22 參考體重",
    "Devine（1974）",
    "Robinson（1983）",
    "Miller（1983）",
    "Hamwi（1964）",
    "身高換算",
    "Healthy weight range (WHO)",
    "Reference weight at BMI 22",
    "Devine (1974)",
    "Robinson (1983)",
    "Miller (1983)",
    "Hamwi (1964)",
  ]) {
    assert.ok(app.includes(label), `app row label: ${label}`);
  }
  // Fixed result order: range, BMI 22, Devine, Robinson, Miller, Hamwi,
  // height — in that order in the render table.
  const order = ["range:", "bmi22:", "devine:", "robinson:", "miller:", "hamwi:", "height:"];
  const positions = order.map((key) => app.indexOf(key));
  assert.ok(positions.every((position) => position !== -1), "all result rows present");
  assert.deepEqual([...positions].sort((a, b) => a - b), positions);
});
