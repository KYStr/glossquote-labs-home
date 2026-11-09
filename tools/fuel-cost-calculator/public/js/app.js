// Fuel Cost Calculator — DOM wiring.
//
// All computation and validation live in ./core/fuel-cost.mjs (pure, exact
// rational arithmetic). This layer only reads field values, renders results
// and per-field errors with textContent/value, and freezes the outputs at
// the last valid state (marked "out of date") while any field is invalid,
// exactly as SPEC section 3 requires. Nothing is stored or transmitted.

import { computeFuelCost, BOUNDS } from './core/fuel-cost.mjs';

const STRINGS = {
  'zh-Hant': {
    required: '必填，不能空白。',
    notNumber: '請輸入數字。',
    tooManyDecimals: '最多只能有兩位小數。',
    distanceRange: '距離需大於 0，且不超過 100000（以所選單位計）。',
    consumptionRange: (min, max) => `油耗需在 ${min} 到 ${max} 之間（以所選單位計）。`,
    priceRange: '油價需大於 0，且不超過 10000（以所選計價單位計）。',
    peopleNotWhole: '人數必須是整數。',
    peopleRange: '人數需在 1 到 12 之間。',
  },
  en: {
    required: 'Required — this field cannot be empty.',
    notNumber: 'Enter a number.',
    tooManyDecimals: 'At most two decimal places.',
    distanceRange: 'Distance must be more than 0 and at most 100000, in the selected unit.',
    consumptionRange: (min, max) => `Consumption must be between ${min} and ${max}, in the selected unit.`,
    priceRange: 'Price must be more than 0 and at most 10000, per the selected unit.',
    peopleNotWhole: 'People must be a whole number.',
    peopleRange: 'People must be between 1 and 12.',
  },
};

const lang = document.documentElement.lang.startsWith('en') ? 'en' : 'zh-Hant';
const t = STRINGS[lang];

const els = {
  distance: document.getElementById('distance-value'),
  distanceUnit: document.getElementById('distance-unit'),
  consumption: document.getElementById('consumption-value'),
  consumptionUnit: document.getElementById('consumption-unit'),
  price: document.getElementById('price-value'),
  priceUnit: document.getElementById('price-unit'),
  currency: document.getElementById('price-currency'),
  splitToggle: document.getElementById('split-toggle'),
  peopleField: document.getElementById('people-field'),
  people: document.getElementById('people-value'),
  stale: document.getElementById('stale-badge'),
  outFuel: document.getElementById('out-fuel'),
  outTotal: document.getElementById('out-total'),
  shareRow: document.getElementById('share-row'),
  outShare: document.getElementById('out-share'),
  outEcho: document.getElementById('out-echo'),
  splitNote: document.getElementById('split-note'),
  reset: document.getElementById('reset-button'),
};

const errorEls = {
  distance: document.getElementById('distance-error'),
  consumption: document.getElementById('consumption-error'),
  price: document.getElementById('price-error'),
  people: document.getElementById('people-error'),
};

function errorMessage(field, code) {
  if (code === 'required') return t.required;
  if (code === 'not-a-number') return t.notNumber;
  if (code === 'too-many-decimals') return t.tooManyDecimals;
  if (field === 'distance') return t.distanceRange;
  if (field === 'price') return t.priceRange;
  if (field === 'people') return code === 'not-whole' ? t.peopleNotWhole : t.peopleRange;
  const bound = BOUNDS.consumption[els.consumptionUnit.value];
  return t.consumptionRange(bound.minText, bound.maxText);
}

function setFieldError(field, code) {
  const input = els[field];
  const errorEl = errorEls[field];
  if (code) {
    errorEl.textContent = errorMessage(field, code);
    errorEl.hidden = false;
    input.setAttribute('aria-invalid', 'true');
  } else {
    errorEl.textContent = '';
    errorEl.hidden = true;
    input.removeAttribute('aria-invalid');
  }
}

function currentInput() {
  return {
    distance: els.distance.value,
    distanceUnit: els.distanceUnit.value,
    consumption: els.consumption.value,
    consumptionUnit: els.consumptionUnit.value,
    price: els.price.value,
    priceUnit: els.priceUnit.value,
    currency: els.currency.value,
    splitOn: els.splitToggle.checked,
    people: els.people.value,
  };
}

// The last successfully computed display values; outputs freeze on these
// while any field is invalid (SPEC section 3 stale state).
let lastValidDisplay = null;

function recompute() {
  const splitOn = els.splitToggle.checked;
  els.peopleField.hidden = !splitOn;
  els.splitNote.hidden = !splitOn;

  const outcome = computeFuelCost(currentInput());
  if (outcome.ok) {
    lastValidDisplay = outcome.results.display;
    for (const field of Object.keys(errorEls)) setFieldError(field, null);
    els.stale.hidden = true;
  } else {
    for (const field of Object.keys(errorEls)) {
      setFieldError(field, outcome.errors[field] ?? null);
    }
    els.stale.hidden = false;
  }

  if (lastValidDisplay) {
    els.outFuel.textContent = lastValidDisplay.fuel;
    els.outTotal.textContent = lastValidDisplay.total;
    els.outEcho.textContent = lastValidDisplay.echo;
    if (splitOn && lastValidDisplay.share !== null) {
      els.outShare.textContent = lastValidDisplay.share;
      els.shareRow.hidden = false;
    } else {
      els.shareRow.hidden = true;
    }
  }
}

const form = document.getElementById('fuel-form');
form.addEventListener('input', recompute);
form.addEventListener('change', recompute);
form.addEventListener('submit', (event) => event.preventDefault());

els.reset.addEventListener('click', () => {
  els.distance.value = '250';
  els.distanceUnit.value = 'km';
  els.consumption.value = '6.5';
  els.consumptionUnit.value = 'l100km';
  els.price.value = '1.80';
  els.priceUnit.value = 'litre';
  els.currency.value = 'USD';
  els.splitToggle.checked = false;
  els.people.value = '4';
  recompute();
});

recompute();
