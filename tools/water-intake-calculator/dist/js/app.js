// DOM wiring for the Daily Water Intake Calculator.
// All dynamic text goes through textContent/value only; user input is never
// inserted as HTML. Nothing is stored, sent or tracked (SPEC section 5).

import { createCalculator, formatMl, formatCupsTenths } from './core/model.mjs';
import { STRINGS, modelStatement } from './core/strings.mjs';

const locale = document.documentElement.lang === 'en' ? 'en' : 'zh-Hant';
const s = STRINGS[locale];

const weightInput = document.getElementById('weight');
const weightError = document.getElementById('weight-error');
const activitySelect = document.getElementById('activity');
const climateSelect = document.getElementById('climate');
const resultSection = document.getElementById('result');
const resultMl = document.getElementById('result-ml');
const resultCups = document.getElementById('result-cups');
const staleNote = document.getElementById('result-stale');

document.getElementById('model-statement').textContent = modelStatement(locale);

const calculator = createCalculator();

function render() {
  const { status, reason, result } = calculator.update({
    weightRaw: weightInput.value,
    activity: activitySelect.value,
    climate: climateSelect.value,
  });
  if (result) {
    resultMl.textContent = formatMl(result.lowMl) + '–' + formatMl(result.highMl) + ' ' + s.mlPerDay;
    resultCups.textContent = formatCupsTenths(result.lowCupsTenths) + '–' +
      formatCupsTenths(result.highCupsTenths) + ' ' + s.cupsSuffix;
  }
  if (status === 'ok') {
    weightError.hidden = true;
    weightError.textContent = '';
    weightInput.removeAttribute('aria-invalid');
    staleNote.hidden = true;
    resultSection.removeAttribute('data-stale');
  } else {
    // SPEC section 3: freeze at the last valid state, marked out of date,
    // with the field error and its bound stated.
    weightError.textContent = s.errors[reason];
    weightError.hidden = false;
    weightInput.setAttribute('aria-invalid', 'true');
    staleNote.hidden = false;
    resultSection.setAttribute('data-stale', 'true');
  }
}

for (const el of [weightInput, activitySelect, climateSelect]) {
  el.addEventListener('input', render);
  el.addEventListener('change', render);
}
render();
