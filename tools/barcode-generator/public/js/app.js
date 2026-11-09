// Barcode Generator UI wiring. All rendering goes through the pure core in
// js/core/barcode.mjs; the module string is the single source of truth for
// the preview, the facts and both downloads. User input is only ever placed
// via textContent/value or SVG text nodes - never as HTML.
import {
  DEFAULT_BAR_HEIGHT_MM,
  FILE_SLUGS,
  SAMPLES,
  barRuns,
  buildSvg,
  encode,
  pngHeightPx,
  pngWidthPx,
  totalWidthMm,
} from "./core/barcode.mjs";

const STRINGS = {
  "zh-Hant": {
    symbologyNames: { code128: "Code 128", ean13: "EAN-13", upca: "UPC-A" },
    errors: {
      empty: () => "請輸入內容。",
      "too-long": (e) => `內容太長：最多 ${e.max} 個字元，目前 ${e.actual} 個字元。`,
      "invalid-character": (e) =>
        `第 ${e.position} 個字元 ${describeChar(e)} 不在可用範圍內：Code 128 只接受 ASCII 32–126 的可列印字元。`,
      "non-digit": (e) => `第 ${e.position} 個字元「${e.char}」不是數字，這個條碼格式只能輸入數字。`,
      "wrong-length": (e) => `數字位數不對：需要 ${e.expected.join(" 或 ")} 位，目前 ${e.actual} 位。`,
      "check-digit-mismatch": (e) => `檢查碼不對：正確的檢查碼是 ${e.expected}，你輸入的是 ${e.actual}。`,
    },
    switchNote: (name, reason) => `剛才的內容不適用於 ${name}（${reason}），已換成這個格式上次有效的內容或範例，原因如上。`,
    stale: "已過期",
    ariaLabel: (name, payload) => `${name} 條碼，內容 ${payload}`,
    facts: { checkDigit: (d) => String(d) },
  },
  en: {
    symbologyNames: { code128: "Code 128", ean13: "EAN-13", upca: "UPC-A" },
    errors: {
      empty: () => "Enter a payload first.",
      "too-long": (e) => `Payload too long: at most ${e.max} characters, currently ${e.actual}.`,
      "invalid-character": (e) =>
        `Character ${e.position} ${describeChar(e)} is not allowed: Code 128 accepts printable ASCII 32-126 only.`,
      "non-digit": (e) => `Character ${e.position} "${e.char}" is not a digit; this symbology takes digits only.`,
      "wrong-length": (e) => `Wrong digit count: expected ${e.expected.join(" or ")}, currently ${e.actual}.`,
      "check-digit-mismatch": (e) => `Check digit mismatch: the correct check digit is ${e.expected}, you entered ${e.actual}.`,
    },
    switchNote: (name, reason) => `The previous content does not work for ${name} (${reason}), so the field now shows that symbology's last valid value or sample.`,
    stale: "Out of date",
    ariaLabel: (name, payload) => `${name} barcode, payload ${payload}`,
    facts: { checkDigit: (d) => String(d) },
  },
};

function describeChar(e) {
  if (e.codePoint !== undefined && (e.codePoint < 32 || e.codePoint === 127)) {
    return `(U+${e.codePoint.toString(16).toUpperCase().padStart(4, "0")})`;
  }
  return `「${e.char}」`;
}

const lang = document.documentElement.lang === "en" ? "en" : "zh-Hant";
const t = STRINGS[lang];
const SVG_NS = "http://www.w3.org/2000/svg";

const els = {
  payload: document.getElementById("payload"),
  error: document.getElementById("payload-error"),
  switchNote: document.getElementById("switch-note"),
  moduleWidth: document.getElementById("module-width"),
  barHeight: document.getElementById("bar-height"),
  showText: document.getElementById("show-text"),
  pngScale: document.getElementById("png-scale"),
  svgHost: document.getElementById("svg-host"),
  staleBadge: document.getElementById("stale-badge"),
  previewWrap: document.getElementById("preview-wrap"),
  factSymbology: document.getElementById("fact-symbology"),
  factSymbols: document.getElementById("fact-symbols"),
  factModules: document.getElementById("fact-modules"),
  factWidth: document.getElementById("fact-width"),
  factCheckRow: document.getElementById("fact-check-row"),
  factCheck: document.getElementById("fact-check"),
  downloadSvg: document.getElementById("download-svg"),
  downloadPng: document.getElementById("download-png"),
  symbologyRadios: [...document.querySelectorAll('input[name="symbology"]')],
};

let symbology = "code128";
let heightTouched = false;
const lastValidBySymbology = { code128: SAMPLES.code128 };
let current = null; // { result, options } - the exact snapshot on display

function readOptions() {
  const xHundredths = Math.round(Number(els.moduleWidth.value) * 100);
  const barHeightMm = Math.round(Number(els.barHeight.value));
  const scale = Number(els.pngScale.value);
  if (!(xHundredths >= 25 && xHundredths <= 100)) return null;
  if (!(barHeightMm >= 10 && barHeightMm <= 60)) return null;
  if (!(scale >= 1 && scale <= 10)) return null;
  return { xHundredths, barHeightMm, scale, showText: els.showText.checked };
}

function buildPreviewSvg(result, options) {
  const barHeightModules = (options.barHeightMm * 100) / options.xHundredths;
  const textBand = options.showText ? 10 : 0;
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", `0 0 ${result.totalModules} ${barHeightModules + textBand}`);
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", t.ariaLabel(t.symbologyNames[result.symbology], result.payload));
  const bg = document.createElementNS(SVG_NS, "rect");
  bg.setAttribute("x", "0");
  bg.setAttribute("y", "0");
  bg.setAttribute("width", String(result.totalModules));
  bg.setAttribute("height", String(barHeightModules + textBand));
  bg.setAttribute("fill", "#ffffff");
  svg.appendChild(bg);
  for (const run of barRuns(result.modules)) {
    const rect = document.createElementNS(SVG_NS, "rect");
    rect.setAttribute("x", String(run.x));
    rect.setAttribute("y", "0");
    rect.setAttribute("width", String(run.width));
    rect.setAttribute("height", String(barHeightModules));
    rect.setAttribute("fill", "#000000");
    svg.appendChild(rect);
  }
  if (options.showText) {
    for (const segment of result.humanText) {
      const text = document.createElementNS(SVG_NS, "text");
      text.setAttribute("x", String(segment.centerModules));
      text.setAttribute("y", String(barHeightModules + 8.5));
      text.setAttribute("font-family", "monospace");
      text.setAttribute("font-size", "8");
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("fill", "#000000");
      text.textContent = segment.text;
      svg.appendChild(text);
    }
  }
  return svg;
}

function render() {
  const options = readOptions();
  const result = encode(symbology, els.payload.value);
  if (!result.ok || !options) {
    // Error state (SPEC section 3): keep the last valid barcode on screen,
    // greyed and labelled out of date, and disable downloads.
    if (result.error) {
      els.error.textContent = t.errors[result.error.code](result.error);
    } else {
      els.error.textContent = "";
    }
    els.payload.setAttribute("aria-invalid", "true");
    els.previewWrap.classList.add("is-stale");
    els.staleBadge.hidden = false;
    els.staleBadge.textContent = t.stale;
    els.downloadSvg.disabled = true;
    els.downloadPng.disabled = true;
    return;
  }
  els.error.textContent = "";
  els.payload.removeAttribute("aria-invalid");
  els.previewWrap.classList.remove("is-stale");
  els.staleBadge.hidden = true;
  lastValidBySymbology[symbology] = els.payload.value;
  current = { result, options };
  els.svgHost.replaceChildren(buildPreviewSvg(result, options));
  els.factSymbology.textContent = t.symbologyNames[result.symbology];
  els.factSymbols.textContent = String(result.symbolCount);
  els.factModules.textContent = String(result.totalModules);
  els.factWidth.textContent = `${totalWidthMm(result.totalModules, options.xHundredths)} mm`;
  if (result.checkDigit === null) {
    els.factCheckRow.hidden = true;
  } else {
    els.factCheckRow.hidden = false;
    els.factCheck.textContent = t.facts.checkDigit(result.checkDigit);
  }
  els.downloadSvg.disabled = false;
  els.downloadPng.disabled = false;
}

function onSymbologyChange(event) {
  const target = event.target.value;
  if (target === symbology) return;
  symbology = target;
  const probe = encode(symbology, els.payload.value);
  if (!probe.ok) {
    const replacement = lastValidBySymbology[symbology] ?? SAMPLES[symbology];
    const reason = probe.error ? t.errors[probe.error.code](probe.error) : "";
    els.payload.value = replacement;
    els.switchNote.textContent = t.switchNote(t.symbologyNames[symbology], reason);
  } else {
    els.switchNote.textContent = "";
  }
  if (!heightTouched) {
    els.barHeight.value = String(DEFAULT_BAR_HEIGHT_MM[symbology]);
  }
  render();
}

function download(filename, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

els.downloadSvg.addEventListener("click", () => {
  if (!current) return;
  const { result, options } = current;
  const svg = buildSvg(result, options);
  download(`barcode-${FILE_SLUGS[result.symbology]}.svg`, new Blob([svg], { type: "image/svg+xml" }));
});

els.downloadPng.addEventListener("click", () => {
  if (!current) return;
  const { result, options } = current;
  const canvas = document.createElement("canvas");
  canvas.width = pngWidthPx(result.totalModules, options.scale);
  canvas.height = pngHeightPx(options.barHeightMm, options.xHundredths, options.scale);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#000000";
  for (const run of barRuns(result.modules)) {
    ctx.fillRect(run.x * options.scale, 0, run.width * options.scale, canvas.height);
  }
  canvas.toBlob((blob) => {
    if (blob) download(`barcode-${FILE_SLUGS[result.symbology]}.png`, blob);
  }, "image/png");
});

els.payload.addEventListener("input", () => {
  els.switchNote.textContent = "";
  render();
});
for (const radio of els.symbologyRadios) radio.addEventListener("change", onSymbologyChange);
for (const control of [els.moduleWidth, els.pngScale, els.showText]) {
  control.addEventListener("input", render);
  control.addEventListener("change", render);
}
els.barHeight.addEventListener("input", () => {
  heightTouched = true;
  render();
});
els.barHeight.addEventListener("change", () => {
  heightTouched = true;
  render();
});
els.moduleWidth.addEventListener("change", () => {
  const v = Math.round(Number(els.moduleWidth.value) * 100);
  if (Number.isFinite(v)) {
    els.moduleWidth.value = (Math.min(100, Math.max(25, v)) / 100).toFixed(2);
    render();
  }
});

render();
