// Oven Temperature Converter — DOM wiring.
// Uses only safe DOM APIs (textContent / value / properties). User input
// is never treated as markup, a selector, a URL or a file name.

import { createController, DEFAULT_DRAFT } from './controller.mjs';
import { message } from './i18n.mjs';

const lang = document.documentElement.lang === 'zh-Hant' ? 'zh-Hant' : 'en';
const t = (key) => message(lang, key);

const valueInput = document.getElementById('value-input');
const unitSelect = document.getElementById('unit-select');
const basisConventional = document.getElementById('basis-conventional');
const basisFan = document.getElementById('basis-fan');
const basisNote = document.getElementById('basis-note');
const runButton = document.getElementById('run-button');
const exampleButton = document.getElementById('example-button');
const resetButton = document.getElementById('reset-button');
const cancelButton = document.getElementById('cancel-button');
const statusRegion = document.getElementById('status');
const statusText = document.getElementById('status-text');
const errorBox = document.getElementById('error-box');
const errorText = document.getElementById('error-text');
const exampleNote = document.getElementById('example-note');
const resultSection = document.getElementById('result-section');
const resultSummary = document.getElementById('result-summary');
const cells = {
  conventional: {
    celsius: document.getElementById('conv-celsius'),
    fahrenheit: document.getElementById('conv-fahrenheit'),
    gas: document.getElementById('conv-gas'),
  },
  fan: {
    celsius: document.getElementById('fan-celsius'),
    fahrenheit: document.getElementById('fan-fahrenheit'),
    gas: document.getElementById('fan-gas'),
  },
};

function readDraft() {
  return {
    value: valueInput.value,
    unit: unitSelect.value,
    basis: basisFan.checked ? 'fan' : 'conventional',
  };
}

function writeDraft(draft) {
  valueInput.value = draft.value;
  unitSelect.value = draft.unit;
  basisConventional.checked = draft.basis !== 'fan';
  basisFan.checked = draft.basis === 'fan';
}

function syncBasisAvailability() {
  const isGas = unitSelect.value === 'gas';
  basisFan.disabled = isGas;
  basisNote.hidden = !isGas;
  if (isGas && basisFan.checked) {
    basisFan.checked = false;
    basisConventional.checked = true;
  }
}

function gasText(side) {
  if (side.gasMarkRange === 'below') return t('gasBelow');
  if (side.gasMarkRange === 'above') return t('gasAbove');
  return `Gas ${side.gasMark}`;
}

function fillSide(sideCells, side) {
  sideCells.celsius.textContent = `${side.celsius} °C`;
  sideCells.fahrenheit.textContent = `${side.fahrenheit} °F`;
  sideCells.gas.textContent = gasText(side);
}

let previousState = 'empty';

function render(snap) {
  statusRegion.setAttribute('aria-busy', snap.state === 'busy' ? 'true' : 'false');
  cancelButton.hidden = snap.state !== 'busy';

  if (snap.state === 'error' && snap.error !== null) {
    errorText.textContent = t(`error_${snap.error.code}`);
    errorBox.hidden = false;
    statusText.textContent = t(`error_${snap.error.code}`);
    const fieldEl = snap.error.field === 'value'
      ? valueInput
      : snap.error.field === 'basis'
        ? basisConventional
        : snap.error.field === 'unit'
          ? unitSelect
          : null;
    if (fieldEl === valueInput) {
      valueInput.setAttribute('aria-invalid', 'true');
    }
    // Only a failed submission moves focus to the first error field.
    if (previousState === 'busy' && fieldEl !== null) fieldEl.focus();
  } else {
    errorBox.hidden = true;
    valueInput.removeAttribute('aria-invalid');
    if (snap.state === 'empty') statusText.textContent = t('statusEmpty');
    else if (snap.state === 'dirty') statusText.textContent = t('statusDirty');
    else if (snap.state === 'busy') statusText.textContent = t('statusBusy');
    else if (snap.state === 'cancelled') statusText.textContent = t('statusCancelled');
    else if (snap.state === 'success') statusText.textContent = t('statusSuccess');
  }

  if (snap.resultAvailable && snap.result !== null) {
    resultSummary.textContent = t('summaryBoth')
      .replace('{conv}', String(snap.result.conventional.celsius))
      .replace('{fan}', String(snap.result.fan.celsius));
    fillSide(cells.conventional, snap.result.conventional);
    fillSide(cells.fan, snap.result.fan);
    resultSection.hidden = false;
  } else {
    resultSection.hidden = true;
  }
  previousState = snap.state;
}

const controller = createController({ onChange: render });

function onEdit() {
  syncBasisAvailability();
  exampleNote.hidden = true;
  controller.edit(readDraft());
}

valueInput.addEventListener('input', onEdit);
unitSelect.addEventListener('change', onEdit);
basisConventional.addEventListener('change', onEdit);
basisFan.addEventListener('change', onEdit);

runButton.addEventListener('click', () => {
  exampleNote.hidden = true;
  controller.start(readDraft());
});

exampleButton.addEventListener('click', () => {
  const example = { value: '4', unit: 'gas', basis: 'conventional' };
  writeDraft(example);
  syncBasisAvailability();
  controller.edit(example);
  exampleNote.hidden = false;
});

cancelButton.addEventListener('click', () => {
  controller.cancel();
});

resetButton.addEventListener('click', () => {
  controller.reset();
  writeDraft({ ...DEFAULT_DRAFT });
  syncBasisAvailability();
  exampleNote.hidden = true;
  valueInput.focus();
});

window.addEventListener('pagehide', () => {
  controller.dispose();
});

syncBasisAvailability();
render(controller.snapshot());
