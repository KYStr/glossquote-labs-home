// DOM wiring for the WCAG Contrast Checker. All computation lives in the
// pure core (js/core/color.mjs). User input is only ever written to the page
// via textContent / value; preview colours are set exclusively from core-
// validated hex values, never from raw field text (SPEC section 5).

import {
  parseColor, effectiveColors, contrastRatio, verdicts, toHex,
  formatRatio, suggest, TARGETS,
} from './core/color.mjs';

const LANG = document.documentElement.lang.startsWith('zh') ? 'zh' : 'en';

const STRINGS = {
  zh: {
    pass: '通過',
    fail: '未通過',
    stale: '輸入有誤：以下結果是上一個有效組合的結果，已過期，僅供參考。',
    effective: (fg, bg) => `實際計算用色（透明混合後，四捨五入顯示）：前景 ${fg}、背景 ${bg}`,
    dirName: { black: '黑色', white: '白色' },
    already: (t) => `目前的前景色已達到目標 ${t}:1，不需要修正。`,
    found: (hex, dir, pct, ratio, t) => `建議改為 ${hex}：朝${dir}混合 ${pct}%，對比 ${ratio}:1（目標 ${t}:1）。`,
    otherDirection: (dir, other) => `朝${dir}方向找不到能達到目標的修正；改朝${other}方向則有解。切換方向後就會顯示建議顏色。`,
    none: '只調整前景色無法達到這個目標，建議改背景色再試。',
    errors: {
      empty: () => '請輸入顏色。',
      format: () => '格式無法辨識，請用 #RGB、#RRGGBB、#RRGGBBAA 或 rgb()/rgba()。',
      'hex-length': (e) => `十六進位需為 3、6 或 8 位數（目前 ${e.actual} 位）。`,
      'hex-digit': () => '十六進位含 0–9、A–F 以外的字元。',
      'channel-range': (e) => `${e.channel.toUpperCase()} 通道需在 0–255 之間（目前 ${e.value}）。`,
      'channel-integer': (e) => `${e.channel.toUpperCase()} 通道需為整數（目前「${e.token}」）。`,
      'channel-percent': (e) => `${e.channel.toUpperCase()} 通道不接受百分比，請用 0–255 整數。`,
      'alpha-range': (e) => `透明度需在 0–1 之間（目前 ${e.value}）。`,
      'alpha-format': () => '透明度需為 0–1 的數字（可寫 .5）。',
    },
  },
  en: {
    pass: 'PASS',
    fail: 'FAIL',
    stale: 'Input error: the results below are from the last valid pair and are out of date.',
    effective: (fg, bg) => `Effective colours used for the calculation (after alpha compositing, shown rounded): foreground ${fg}, background ${bg}`,
    dirName: { black: 'black', white: 'white' },
    already: (t) => `The current foreground already meets the ${t}:1 target; no correction is needed.`,
    found: (hex, dir, pct, ratio, t) => `Suggested foreground ${hex}: blended ${pct}% toward ${dir}, contrast ${ratio}:1 (target ${t}:1).`,
    otherDirection: (dir, other) => `No correction in the ${dir} direction reaches the target; a fix exists toward ${other}. Switch direction to see the suggested colour.`,
    none: 'No foreground-only change reaches this target against this background. Try changing the background instead.',
    errors: {
      empty: () => 'Enter a colour.',
      format: () => 'Unrecognised format. Use #RGB, #RRGGBB, #RRGGBBAA or rgb()/rgba().',
      'hex-length': (e) => `Hex must have 3, 6 or 8 digits (currently ${e.actual}).`,
      'hex-digit': () => 'Hex contains characters outside 0–9 and A–F.',
      'channel-range': (e) => `The ${e.channel.toUpperCase()} channel must be between 0 and 255 (currently ${e.value}).`,
      'channel-integer': (e) => `The ${e.channel.toUpperCase()} channel must be an integer (currently "${e.token}").`,
      'channel-percent': (e) => `The ${e.channel.toUpperCase()} channel does not accept percentages; use an integer 0–255.`,
      'alpha-range': (e) => `Alpha must be between 0 and 1 (currently ${e.value}).`,
      'alpha-format': () => 'Alpha must be a number between 0 and 1 (you may write .5).',
    },
  },
};
const S = STRINGS[LANG];

const $ = (id) => document.getElementById(id);
const els = {
  fgInput: $('fg-input'), fgPicker: $('fg-picker'), fgError: $('fg-error'),
  bgInput: $('bg-input'), bgPicker: $('bg-picker'), bgError: $('bg-error'),
  swap: $('swap'), direction: $('direction'), target: $('target'),
  results: $('results'), stale: $('stale-note'), ratio: $('ratio-value'),
  effective: $('effective-line'),
  previewNormal: $('preview-normal'), previewLarge: $('preview-large'),
  previewGlyph: $('preview-glyph'), previewBorder: $('preview-border'),
  suggestText: $('suggest-text'), apply: $('apply-suggestion'),
};

let lastValid = null; // last successfully computed render model
let currentSuggestion = null;
els.stale.textContent = S.stale;

function errorMessage(error) {
  const make = S.errors[error.code] || S.errors.format;
  return make(error);
}

function render(model, stale) {
  els.ratio.textContent = `${formatRatio(model.ratio)} : 1`;
  if (model.eff.hasAlpha) {
    els.effective.textContent = S.effective(toHex(model.eff.foreground), toHex(model.eff.background));
    els.effective.hidden = false;
  } else {
    els.effective.hidden = true;
  }
  for (const row of verdicts(model.ratio)) {
    const cell = document.querySelector(`[data-verdict="${row.id}"]`);
    if (cell) cell.textContent = row.pass ? S.pass : S.fail;
  }
  const fgHex = toHex(model.eff.foreground);
  const bgHex = toHex(model.eff.background);
  els.previewNormal.style.color = fgHex;
  els.previewNormal.style.backgroundColor = bgHex;
  els.previewLarge.style.color = fgHex;
  els.previewLarge.style.backgroundColor = bgHex;
  els.previewGlyph.style.color = fgHex;
  els.previewGlyph.style.backgroundColor = bgHex;
  els.previewBorder.style.borderColor = fgHex;
  els.previewBorder.style.backgroundColor = bgHex;

  const sug = model.suggestion;
  currentSuggestion = sug.state === 'found' ? sug : null;
  if (sug.state === 'already') {
    els.suggestText.textContent = S.already(model.target);
  } else if (sug.state === 'found') {
    els.suggestText.textContent = S.found(
      sug.hex, S.dirName[sug.direction], String(Math.round(sug.t * 100)),
      formatRatio(sug.ratio), model.target,
    );
  } else if (sug.state === 'other-direction') {
    els.suggestText.textContent = S.otherDirection(S.dirName[sug.direction], S.dirName[sug.otherDirection]);
  } else {
    els.suggestText.textContent = S.none;
  }
  els.apply.disabled = stale || !currentSuggestion;
  els.stale.hidden = !stale;
  els.results.classList.toggle('is-stale', stale);
}

function recompute() {
  const fgParsed = parseColor(els.fgInput.value);
  const bgParsed = parseColor(els.bgInput.value);
  els.fgError.textContent = fgParsed.ok ? '' : errorMessage(fgParsed.error);
  els.bgError.textContent = bgParsed.ok ? '' : errorMessage(bgParsed.error);
  if (!fgParsed.ok || !bgParsed.ok) {
    if (lastValid) render(lastValid, true);
    els.apply.disabled = true;
    return;
  }
  if (fgParsed.color.a === 1) els.fgPicker.value = toHex(fgParsed.color).toLowerCase();
  if (bgParsed.color.a === 1) els.bgPicker.value = toHex(bgParsed.color).toLowerCase();
  const eff = effectiveColors(fgParsed.color, bgParsed.color);
  const ratio = contrastRatio(eff.foreground, eff.background);
  const target = TARGETS.find((t) => t.id === els.target.value)?.value ?? 4.5;
  const suggestion = suggest(eff.foreground, eff.background, target, els.direction.value);
  lastValid = { eff, ratio, target, suggestion };
  render(lastValid, false);
}

for (const el of [els.fgInput, els.bgInput]) el.addEventListener('input', recompute);
els.fgPicker.addEventListener('input', () => { els.fgInput.value = els.fgPicker.value.toUpperCase(); recompute(); });
els.bgPicker.addEventListener('input', () => { els.bgInput.value = els.bgPicker.value.toUpperCase(); recompute(); });
els.swap.addEventListener('click', () => {
  const tmp = els.fgInput.value;
  els.fgInput.value = els.bgInput.value;
  els.bgInput.value = tmp;
  recompute();
});
els.direction.addEventListener('change', recompute);
els.target.addEventListener('change', recompute);
els.apply.addEventListener('click', () => {
  if (!currentSuggestion) return;
  els.fgInput.value = currentSuggestion.hex;
  recompute();
});

recompute();
