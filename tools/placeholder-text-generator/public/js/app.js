// DOM wiring for the Placeholder Text Generator. All generation lives in
// js/core/; this file only reads controls, renders results as text
// (textContent only — never through HTML parsing) and handles copy buttons, which act
// solely on explicit user clicks.
import {
  generate,
  validateSettings,
  COUNT_RANGES,
} from "./core/generate.mjs";
import { incrementSeed } from "./core/prng.mjs";
import { LATIN_WORDS, ZH_SENTENCES } from "./core/pools.mjs";

const LANG = document.documentElement.lang === "en" ? "en" : "zh";

const STRINGS = {
  zh: {
    range: (min, max) => `可填 ${min} 到 ${max}。`,
    countNotInteger: "數量必須是整數。",
    countBelow: (min) => `數量太小，最小是 ${min}。`,
    countAbove: (max) => `數量太大，最大是 ${max}。`,
    seedInvalid: "種子必須是 0 到 4294967295 之間的整數。",
    facts: (f, truncated, n) => {
      const parts = [`段落 ${f.paragraphs}`, `句子 ${f.sentences}`];
      if (f.words !== null) parts.push(`字詞 ${f.words}`);
      parts.push(`字元（碼點） ${f.codePoints}`);
      if (truncated) {
        parts.push(`已截斷為 ${n} 字元，最後一個字元可能落在句子中間`);
      }
      return parts.join(" · ");
    },
    copiedPlain: "已複製純文字。",
    copiedHtml: "已複製 HTML。",
    copyFailed: "複製失敗，請改用純文字檢視手動選取。",
  },
  en: {
    range: (min, max) => `Allowed range: ${min} to ${max}.`,
    countNotInteger: "Count must be a whole number.",
    countBelow: (min) => `Count is too small; the minimum is ${min}.`,
    countAbove: (max) => `Count is too large; the maximum is ${max}.`,
    seedInvalid: "Seed must be an integer from 0 to 4294967295.",
    facts: (f, truncated, n) => {
      const parts = [
        `Paragraphs ${f.paragraphs}`,
        `Sentences ${f.sentences}`,
      ];
      if (f.words !== null) parts.push(`Words ${f.words}`);
      parts.push(`Characters (code points) ${f.codePoints}`);
      if (truncated) {
        parts.push(
          `Truncated to ${n} characters; the final character may be mid-sentence`,
        );
      }
      return parts.join(" · ");
    },
    copiedPlain: "Plain text copied.",
    copiedHtml: "HTML copied.",
    copyFailed: "Copy failed; switch to the raw text view and select manually.",
  },
};
const S = STRINGS[LANG];

const $ = (id) => document.getElementById(id);
const els = {
  form: $("controls"),
  unit: $("unit"),
  unitWords: $("unit-words"),
  wordsNote: $("words-note"),
  count: $("count"),
  countRange: $("count-range"),
  countError: $("count-error"),
  seed: $("seed"),
  seedError: $("seed-error"),
  newSeed: $("new-seed"),
  opening: $("opening"),
  openingField: $("opening-field"),
  zhNote: $("zh-note"),
  stale: $("stale"),
  facts: $("facts"),
  viewRendered: $("view-rendered"),
  viewRaw: $("view-raw"),
  rendered: $("output-rendered"),
  raw: $("output-raw"),
  copyPlain: $("copy-plain"),
  copyHtml: $("copy-html"),
  copyStatus: $("copy-status"),
  latinPool: $("latin-pool"),
  zhPool: $("zh-pool"),
};

// Print both pools in full in the help section (SPEC section 4).
els.latinPool.textContent = LATIN_WORDS.join(" ");
for (const sentence of ZH_SENTENCES) {
  const li = document.createElement("li");
  li.textContent = sentence;
  els.zhPool.appendChild(li);
}

let lastValid = null; // { result, settings } of the last valid generation

function readRawSettings() {
  const langRadio = els.form.querySelector(
    'input[name="content-lang"]:checked',
  );
  return {
    contentLang: langRadio ? langRadio.value : "latin",
    unit: els.unit.value,
    count: els.count.value === "" ? NaN : Number(els.count.value),
    seed: els.seed.value === "" ? NaN : Number(els.seed.value),
    opening: els.opening.checked,
  };
}

function showError(el, message) {
  el.textContent = message || "";
  el.hidden = !message;
}

function render(result) {
  els.rendered.replaceChildren();
  for (const paragraph of result.paragraphs) {
    const p = document.createElement("p");
    p.textContent = paragraph;
    els.rendered.appendChild(p);
  }
  els.raw.textContent = result.plainText;
}

function update() {
  const raw = readRawSettings();
  const range = COUNT_RANGES[raw.unit];
  els.countRange.textContent = range ? S.range(range.min, range.max) : "";

  // zh disables the words unit; if it was selected, fall back to paragraphs.
  const isZh = raw.contentLang === "zh";
  els.unitWords.disabled = isZh;
  els.wordsNote.hidden = !isZh;
  els.zhNote.hidden = !isZh;
  els.openingField.hidden = raw.contentLang !== "latin";
  if (isZh && raw.unit === "words") {
    els.unit.value = "paragraphs";
    raw.unit = "paragraphs";
  }

  const validated = validateSettings(raw);
  if (!validated.ok) {
    const e = validated.errors;
    showError(
      els.countError,
      e.count === "not_integer"
        ? S.countNotInteger
        : e.count === "below_min"
          ? S.countBelow(COUNT_RANGES[raw.unit].min)
          : e.count === "above_max"
            ? S.countAbove(COUNT_RANGES[raw.unit].max)
            : "",
    );
    showError(els.seedError, e.seed ? S.seedInvalid : "");
    // Freeze the output at the last valid generation, marked out of date,
    // and disable copying stale filler (SPEC section 3).
    els.stale.hidden = false;
    els.copyPlain.disabled = true;
    els.copyHtml.disabled = true;
    return;
  }

  showError(els.countError, "");
  showError(els.seedError, "");
  els.stale.hidden = true;
  els.copyPlain.disabled = false;
  els.copyHtml.disabled = false;
  els.copyStatus.textContent = "";

  const result = generate(validated.value);
  lastValid = { result, settings: validated.value };
  render(result);
  els.facts.textContent = S.facts(
    result.facts,
    result.truncated,
    validated.value.count,
  );
}

els.form.addEventListener("input", update);
els.form.addEventListener("change", update);

els.newSeed.addEventListener("click", () => {
  const current = Number(els.seed.value);
  if (Number.isInteger(current) && current >= 0 && current <= 4294967295) {
    els.seed.value = String(incrementSeed(current));
  } else {
    els.seed.value = "0";
  }
  update();
});

function setView(rawView) {
  els.rendered.hidden = rawView;
  els.raw.hidden = !rawView;
  els.viewRendered.setAttribute("aria-pressed", String(!rawView));
  els.viewRaw.setAttribute("aria-pressed", String(rawView));
}
els.viewRendered.addEventListener("click", () => setView(false));
els.viewRaw.addEventListener("click", () => setView(true));

async function copyText(text, doneMessage) {
  try {
    await navigator.clipboard.writeText(text);
    els.copyStatus.textContent = doneMessage;
  } catch {
    els.copyStatus.textContent = S.copyFailed;
  }
}
els.copyPlain.addEventListener("click", () => {
  if (lastValid) copyText(lastValid.result.plainText, S.copiedPlain);
});
els.copyHtml.addEventListener("click", () => {
  if (lastValid) copyText(lastValid.result.htmlText, S.copiedHtml);
});

// Initial state (SPEC section 3): Latin, paragraphs, count 3, seed 42,
// classic opening on, already generated and shown.
update();
