// DOM wiring for the Paint Coverage Calculator. All math and validation
// live in ./core/paint-core.mjs; this file only reads field values, shows
// per-field errors as text, and renders results with textContent — user
// input is never inserted as HTML.

import {
  INITIAL_INPUTS,
  validateDecimalField,
  validateWholeField,
  validateCanSize,
  computePaint,
  display2,
  displayCans,
} from './core/paint-core.mjs';

const lang = document.documentElement.lang.startsWith('zh') ? 'zh' : 'en';

const STRINGS = {
  zh: {
    errors: {
      empty: '此欄必填。',
      'not-a-number': '請輸入數字。',
      'too-many-decimals': '最多只能輸入兩位小數。',
      'not-whole': '請輸入整數。',
      'out-of-range': (range) => `請輸入 ${range} 之間的數值。`,
    },
    ranges: {
      length: '0.1–100',
      width: '0.1–100',
      height: '0.1–10',
      customOpenings: '0–1000',
      coverage: '1–30',
      doors: '0–20',
      windows: '0–20',
      coats: '1–4',
    },
    areaUnit: ' 平方公尺',
    litreUnit: ' 公升',
    cansUnit: () => ' 罐',
  },
  en: {
    errors: {
      empty: 'This field is required.',
      'not-a-number': 'Enter a number.',
      'too-many-decimals': 'At most two decimal places.',
      'not-whole': 'Enter a whole number.',
      'out-of-range': (range) => `Enter a value between ${range}.`,
    },
    ranges: {
      length: '0.1 and 100',
      width: '0.1 and 100',
      height: '0.1 and 10',
      customOpenings: '0 and 1000',
      coverage: '1 and 30',
      doors: '0 and 20',
      windows: '0 and 20',
      coats: '1 and 4',
    },
    areaUnit: ' m²',
    litreUnit: ' L',
    cansUnit: (cans) => (cans === 1n ? ' can' : ' cans'),
  },
}[lang];

const DECIMAL_NAMES = ['length', 'width', 'height', 'customOpenings', 'coverage'];
const WHOLE_NAMES = ['doors', 'windows', 'coats'];

const el = {};
for (const id of [
  ...DECIMAL_NAMES,
  ...WHOLE_NAMES,
  'ceiling',
  'canSize',
  'reset',
  'stale',
  'compute-error',
  'results-body',
  'r-gross',
  'r-deductions',
  'r-ceiling-row',
  'r-ceiling',
  'r-paintable',
  'r-litres',
  'r-cans',
  'r-purchased',
  'r-leftover',
]) {
  el[id] = document.getElementById(id);
}
const errEl = {};
for (const name of [...DECIMAL_NAMES, ...WHOLE_NAMES]) {
  errEl[name] = document.getElementById(`err-${name}`);
}

let hasValidResult = false;

function showFieldError(name, code) {
  const box = errEl[name];
  if (!code) {
    box.hidden = true;
    box.textContent = '';
    el[name].removeAttribute('aria-invalid');
    return;
  }
  const template = STRINGS.errors[code];
  box.textContent =
    typeof template === 'function' ? template(STRINGS.ranges[name]) : template;
  box.hidden = false;
  el[name].setAttribute('aria-invalid', 'true');
}

function render(result) {
  el['r-gross'].textContent = display2(result.gross) + STRINGS.areaUnit;
  el['r-deductions'].textContent = '− ' + display2(result.deductions) + STRINGS.areaUnit;
  el['r-ceiling-row'].hidden = result.ceilingArea.n === 0n;
  el['r-ceiling'].textContent = '+ ' + display2(result.ceilingArea) + STRINGS.areaUnit;
  el['r-paintable'].textContent = display2(result.paintable) + STRINGS.areaUnit;
  el['r-litres'].textContent = display2(result.litres) + STRINGS.litreUnit;
  el['r-cans'].textContent = displayCans(result.cans) + STRINGS.cansUnit(result.cans);
  el['r-purchased'].textContent = display2(result.purchased) + STRINGS.litreUnit;
  el['r-leftover'].textContent = display2(result.leftover) + STRINGS.litreUnit;
}

function update() {
  const values = {};
  let allValid = true;

  for (const name of DECIMAL_NAMES) {
    const r = validateDecimalField(name, el[name].value);
    showFieldError(name, r.ok ? null : r.code);
    if (r.ok) values[`${name}H`] = r.hundredths;
    else allValid = false;
  }
  for (const name of WHOLE_NAMES) {
    const r = validateWholeField(name, el[name].value);
    showFieldError(name, r.ok ? null : r.code);
    if (r.ok) values[name] = r.value;
    else allValid = false;
  }
  const can = validateCanSize(el.canSize.value);
  if (can.ok) values.canSizeH = can.hundredths;
  else allValid = false;
  values.ceiling = el.ceiling.checked;

  if (!allValid) {
    // Freeze the last valid outputs and mark them out of date (SPEC s.3).
    el.stale.hidden = !hasValidResult;
    return;
  }

  const result = computePaint({
    lengthH: values.lengthH,
    widthH: values.widthH,
    heightH: values.heightH,
    doors: values.doors,
    windows: values.windows,
    customH: values.customOpeningsH,
    ceiling: values.ceiling,
    coats: values.coats,
    coverageH: values.coverageH,
    canSizeH: values.canSizeH,
  });

  el.stale.hidden = true;
  if (!result.ok) {
    // Computation-level error replaces the outputs (SPEC s.3).
    el['compute-error'].hidden = false;
    el['results-body'].hidden = true;
    return;
  }
  el['compute-error'].hidden = true;
  el['results-body'].hidden = false;
  render(result);
  hasValidResult = true;
}

for (const name of [...DECIMAL_NAMES, ...WHOLE_NAMES]) {
  el[name].addEventListener('input', update);
  el[name].addEventListener('change', update);
}
el.ceiling.addEventListener('change', update);
el.canSize.addEventListener('change', update);

el.reset.addEventListener('click', () => {
  for (const name of [...DECIMAL_NAMES, ...WHOLE_NAMES]) {
    el[name].value = INITIAL_INPUTS[name];
  }
  el.ceiling.checked = INITIAL_INPUTS.ceiling;
  el.canSize.value = INITIAL_INPUTS.canSize;
  update();
});

update();
