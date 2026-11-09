// BMI / TDEE Calculator — DOM wiring.
// All user text is rendered with textContent/value only; nothing the user
// types is ever inserted as HTML. No network, no storage (SPEC §5).
import {
  ACTIVITY_LEVELS,
  compute,
  formatDecimal,
  heightToImperial,
  kgToLb,
  validateAge,
  validateHeightImperial,
  validateHeightMetric,
  validateWeightImperial,
  validateWeightMetric,
} from './core/bmi.mjs';

const lang = document.documentElement.lang === 'en' ? 'en' : 'zh';

const STRINGS = {
  zh: {
    categories: {
      underweight: '過輕',
      normal: '正常',
      overweight: '過重',
      'obese-1': '肥胖第一級',
      'obese-2': '肥胖第二級',
      'obese-3': '肥胖第三級',
    },
    errors: {
      empty: '請輸入數值。',
      'not-a-number': '請輸入數字。',
      'not-integer': '請輸入整數。',
      'out-of-range': '超出接受範圍。',
      'inches-too-large': '英吋需小於 12；請把滿 12 的部分換算進英呎。',
    },
    rangeAge: '接受範圍：10–120 歲（整數）。',
    rangeHeightMetric: '接受範圍：50–272 公分。',
    rangeHeightImperial: '接受範圍：換算後 50–272 公分。',
    rangeWeightMetric: '接受範圍：10–635 公斤。',
    rangeWeightImperial: '接受範圍：換算後 10–635 公斤。',
    stale: '有欄位尚未修正，下方結果為上次有效輸入的計算結果（已過時）。',
    healthyMetric: (low, high) => `從 ${low} kg 起、低於 ${high} kg`,
    healthyImperial: (low, high) => `從 ${low} lb 起、低於 ${high} lb`,
    bmiUnit: '',
    kcalPerDay: 'kcal／日',
  },
  en: {
    categories: {
      underweight: 'Underweight',
      normal: 'Normal',
      overweight: 'Overweight',
      'obese-1': 'Obese class I',
      'obese-2': 'Obese class II',
      'obese-3': 'Obese class III',
    },
    errors: {
      empty: 'Please enter a value.',
      'not-a-number': 'Please enter a number.',
      'not-integer': 'Please enter a whole number.',
      'out-of-range': 'Outside the accepted range.',
      'inches-too-large': 'Inches must be under 12; fold full feet into the feet field.',
    },
    rangeAge: 'Accepted range: 10–120 years (whole number).',
    rangeHeightMetric: 'Accepted range: 50–272 cm.',
    rangeHeightImperial: 'Accepted range: 50–272 cm after conversion.',
    rangeWeightMetric: 'Accepted range: 10–635 kg.',
    rangeWeightImperial: 'Accepted range: 10–635 kg after conversion.',
    stale: 'A field needs fixing; the results below are from the last valid inputs (out of date).',
    healthyMetric: (low, high) => `from ${low} kg, stay below ${high} kg`,
    healthyImperial: (low, high) => `from ${low} lb, stay below ${high} lb`,
    bmiUnit: '',
    kcalPerDay: 'kcal/day',
  },
};
const S = STRINGS[lang];

const $ = (id) => document.getElementById(id);
const els = {
  sexInputs: [...document.querySelectorAll('input[name="sex"]')],
  age: $('age'),
  ageError: $('age-error'),
  systemInputs: [...document.querySelectorAll('input[name="system"]')],
  metricHeight: $('height-metric'),
  imperialHeight: $('height-imperial'),
  heightCm: $('height-cm'),
  heightFt: $('height-ft'),
  heightIn: $('height-in'),
  heightError: $('height-error'),
  metricWeight: $('weight-metric'),
  imperialWeight: $('weight-imperial'),
  weightKg: $('weight-kg'),
  weightLb: $('weight-lb'),
  weightError: $('weight-error'),
  activity: $('activity'),
  results: $('results'),
  staleNote: $('stale-note'),
  under18Note: $('under18-note'),
  bmiValue: $('bmi-value'),
  bmiCategory: $('bmi-category'),
  healthyRange: $('healthy-range'),
  bmrValue: $('bmr-value'),
  tdeeBody: $('tdee-body'),
};

// The unrounded metric store is the single source of truth (SPEC §4).
// Initial state per SPEC §3: metric, female, 30 y, 175 cm, 70 kg, moderate.
const state = {
  system: 'metric',
  lastValid: { sex: 'female', ageYears: 30, heightCm: 175, weightKg: 70 },
  activity: 'moderate',
};

function errorText(result, rangeHint) {
  let text = S.errors[result.error] || S.errors['not-a-number'];
  if (result.error === 'out-of-range' && rangeHint) text += ` ${rangeHint}`;
  return text;
}

function setError(inputEl, errorEl, message) {
  errorEl.textContent = message || '';
  if (inputEl) {
    if (message) inputEl.setAttribute('aria-invalid', 'true');
    else inputEl.removeAttribute('aria-invalid');
  }
}

function readInputs() {
  const sex = state.sexInputs.find((el) => el.checked)?.value || 'female';
  const age = validateAge(els.age.value);
  let height;
  let weight;
  if (state.system === 'metric') {
    height = validateHeightMetric(els.heightCm.value);
    weight = validateWeightMetric(els.weightKg.value);
  } else {
    height = validateHeightImperial(els.heightFt.value, els.heightIn.value);
    weight = validateWeightImperial(els.weightLb.value);
  }
  return { sex, age, height, weight };
}

function showErrors({ age, height, weight }) {
  setError(els.age, els.ageError, age.ok ? '' : errorText(age, S.rangeAge));
  if (height.ok) {
    setError(els.heightCm, els.heightError, '');
    setError(els.heightFt, els.heightError, '');
    setError(els.heightIn, els.heightError, '');
  } else {
    const hint = state.system === 'metric' ? S.rangeHeightMetric : S.rangeHeightImperial;
    const target =
      height.field === 'feet' ? els.heightFt : height.field === 'inches' ? els.heightIn : els.heightCm;
    setError(target, els.heightError, errorText(height, hint));
  }
  if (weight.ok) {
    setError(els.weightKg, els.weightError, '');
    setError(els.weightLb, els.weightError, '');
  } else {
    const hint = state.system === 'metric' ? S.rangeWeightMetric : S.rangeWeightImperial;
    setError(state.system === 'metric' ? els.weightKg : els.weightLb, els.weightError, errorText(weight, hint));
  }
}

function render(result) {
  els.bmiValue.textContent = result.bmiText;
  els.bmiCategory.textContent = S.categories[result.categoryId];
  if (state.system === 'metric') {
    els.healthyRange.textContent = S.healthyMetric(
      formatDecimal(result.healthyRangeKg.low, 1),
      formatDecimal(result.healthyRangeKg.highExclusive, 1),
    );
  } else {
    els.healthyRange.textContent = S.healthyImperial(
      formatDecimal(result.healthyRangeLb.low, 1),
      formatDecimal(result.healthyRangeLb.highExclusive, 1),
    );
  }
  els.bmrValue.textContent = `${result.bmrText} ${S.kcalPerDay}`;
  const rows = els.tdeeBody.querySelectorAll('tr');
  result.tdee.forEach((row, i) => {
    const tr = rows[i];
    if (!tr) return;
    tr.querySelector('.tdee-kcal').textContent = row.kcalText;
    const selected = row.id === state.activity;
    tr.classList.toggle('selected', selected);
    if (selected) tr.setAttribute('aria-current', 'true');
    else tr.removeAttribute('aria-current');
  });
  els.under18Note.hidden = !result.under18;
}

function update() {
  const parsed = readInputs();
  showErrors(parsed);
  const allOk = parsed.age.ok && parsed.height.ok && parsed.weight.ok;
  if (allOk) {
    state.lastValid = {
      sex: parsed.sex,
      ageYears: parsed.age.value,
      heightCm: parsed.height.value,
      weightKg: parsed.weight.value,
    };
    render(compute({ ...state.lastValid, activity: state.activity }));
    els.results.classList.remove('stale');
    els.staleNote.hidden = true;
  } else {
    // Freeze at the last valid state and mark it out of date (SPEC §3):
    // displayed numbers must never describe inputs they were not computed from.
    els.results.classList.add('stale');
    els.staleNote.hidden = false;
    els.staleNote.textContent = S.stale;
  }
}

function applySystemVisibility() {
  const metric = state.system === 'metric';
  els.metricHeight.hidden = !metric;
  els.imperialHeight.hidden = metric;
  els.metricWeight.hidden = !metric;
  els.imperialWeight.hidden = metric;
}

// Switching the unit toggle converts the current values from the unrounded
// metric store instead of clearing them (SPEC §3/§4).
function convertDisplayedValues() {
  const { heightCm, weightKg } = state.lastValid;
  if (state.system === 'imperial') {
    const imp = heightToImperial(heightCm);
    els.heightFt.value = String(imp.feet);
    els.heightIn.value = String(imp.inches);
    els.weightLb.value = formatDecimal(kgToLb(weightKg), 1);
  } else {
    els.heightCm.value = formatDecimal(heightCm, 1);
    els.weightKg.value = formatDecimal(weightKg, 1);
  }
}

for (const el of els.sexInputs) el.addEventListener('change', update);
for (const el of els.systemInputs) {
  el.addEventListener('change', () => {
    if (!el.checked) return;
    state.system = el.value;
    applySystemVisibility();
    convertDisplayedValues();
    update();
  });
}
for (const el of [els.age, els.heightCm, els.heightFt, els.heightIn, els.weightKg, els.weightLb]) {
  el.addEventListener('input', update);
}
els.activity.addEventListener('change', () => {
  state.activity = els.activity.value;
  update();
});

// Build the TDEE rows' static cells are in HTML; ensure order matches core.
void ACTIVITY_LEVELS;
applySystemVisibility();
update();
