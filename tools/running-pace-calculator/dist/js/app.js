// Thin DOM layer for the Running Pace Calculator.
// All logic lives in js/core/; this file only wires events and renders.
// User input is rendered exclusively through textContent / value, never
// through innerHTML.

import { createCalculator } from './core/state.mjs';
import { formatTime } from './core/time.mjs';

const STRINGS = {
  'zh-Hant': {
    errors: {
      time: {
        empty: '此欄不可空白。請輸入總秒數（如 3300）、分：秒（如 55:00）或時：分：秒（如 1:45:29）。',
        malformed:
          '時間格式不正確。請輸入總秒數（如 3300）、分：秒（如 55:00）或時：分：秒（如 1:45:29）；冒號後的數字須為兩位數、00–59。',
        component: (component) =>
          `「${component}」不可大於 59：冒號後的分或秒必須是 00–59。請輸入總秒數、分：秒或時：分：秒。`,
        'too-small': '總時間至少要 1 秒。',
        'too-large': '總時間不可超過 99:59:59。',
      },
      pace: {
        empty: '此欄不可空白。請輸入總秒數（如 330）、分：秒（如 5:30）或時：分：秒；冒號後的數字須為兩位數、00–59。',
        malformed:
          '配速格式不正確。請輸入總秒數（如 330）、分：秒（如 5:30）或時：分：秒（如 1:45:29）；冒號後的數字須為兩位數、00–59。',
        component: (component) =>
          `「${component}」不可大於 59：冒號後的分或秒必須是 00–59。請輸入總秒數、分：秒或時：分：秒。`,
        zero: '配速不可為 0。',
        'too-small': '配速至少要 0:30（每單位）。',
        'too-large': '配速不可超過 59:59（每單位）。',
      },
      distance: {
        empty: '此欄不可空白。請輸入數字，可含小數（如 10 或 21.0975）。',
        malformed: '距離格式不正確。請輸入數字，可含小數（如 10 或 21.0975），不要加單位或其他文字。',
        'too-small': '距離至少要 0.01。',
        'too-large': '距離不可超過 300。',
      },
    },
    suffixDistance: { km: '公里', mi: '英里' },
    suffixPace: { km: '每公里', mi: '每英里' },
    splitUnit: { km: '公里', mi: '英里' },
    finishSuffix: '（終點）',
    targets: ['5 公里', '10 公里', '半程馬拉松（21.0975 公里）', '馬拉松（42.195 公里）'],
    yourInput: '（你的輸入）',
  },
  en: {
    errors: {
      time: {
        empty: 'This field cannot be blank. Enter total seconds (e.g. 3300), minutes:seconds (e.g. 55:00) or hours:minutes:seconds (e.g. 1:45:29).',
        malformed:
          'Invalid time format. Enter total seconds (e.g. 3300), minutes:seconds (e.g. 55:00) or hours:minutes:seconds (e.g. 1:45:29); the parts after a colon must be two digits, 00–59.',
        component: (component) =>
          `"${component}" is above 59: the minutes or seconds after a colon must be 00–59. Enter total seconds, minutes:seconds or hours:minutes:seconds.`,
        'too-small': 'Total time must be at least 1 second.',
        'too-large': 'Total time cannot exceed 99:59:59.',
      },
      pace: {
        empty: 'This field cannot be blank. Enter total seconds (e.g. 330), minutes:seconds (e.g. 5:30) or hours:minutes:seconds; the parts after a colon must be two digits, 00–59.',
        malformed:
          'Invalid pace format. Enter total seconds (e.g. 330), minutes:seconds (e.g. 5:30) or hours:minutes:seconds (e.g. 1:45:29); the parts after a colon must be two digits, 00–59.',
        component: (component) =>
          `"${component}" is above 59: the minutes or seconds after a colon must be 00–59. Enter total seconds, minutes:seconds or hours:minutes:seconds.`,
        zero: 'Pace cannot be 0.',
        'too-small': 'Pace must be at least 0:30 per unit.',
        'too-large': 'Pace cannot exceed 59:59 per unit.',
      },
      distance: {
        empty: 'This field cannot be blank. Enter a number, decimals allowed (e.g. 10 or 21.0975).',
        malformed: 'Invalid distance. Enter a number, decimals allowed (e.g. 10 or 21.0975), with no unit or other text.',
        'too-small': 'Distance must be at least 0.01.',
        'too-large': 'Distance cannot exceed 300.',
      },
    },
    suffixDistance: { km: 'km', mi: 'miles' },
    suffixPace: { km: 'per km', mi: 'per mile' },
    splitUnit: { km: 'km', mi: 'mi' },
    finishSuffix: ' (finish)',
    targets: ['5K', '10K', 'Half marathon (21.0975 km)', 'Marathon (42.195 km)'],
    yourInput: ' (your input)',
  },
};

const lang = document.documentElement.lang.startsWith('en') ? 'en' : 'zh-Hant';
const t = STRINGS[lang];
const calculator = createCalculator();

const fields = ['time', 'distance', 'pace'];
const inputs = {};
const outputs = {};
const errorEls = {};
for (const field of fields) {
  inputs[field] = document.getElementById(`field-${field}`);
  outputs[field] = document.getElementById(`output-${field}`);
  errorEls[field] = document.getElementById(`error-${field}`);
}
const suffixDistance = document.getElementById('suffix-distance');
const suffixPace = document.getElementById('suffix-pace');
const staleNote = document.getElementById('stale-note');
const splitsBody = document.getElementById('splits-body');
const predictionsBody = document.getElementById('predictions-body');

function errorMessage(field, error) {
  const entry = t.errors[field][error.code];
  if (typeof entry === 'function') return entry(error.component);
  return entry ?? t.errors[field].malformed;
}

function renderTableBody(body, rows) {
  const built = rows.map((cells) => {
    const tr = document.createElement('tr');
    if (cells.className) tr.className = cells.className;
    for (const text of cells.texts) {
      const td = document.createElement('td');
      td.textContent = text;
      tr.append(td);
    }
    return tr;
  });
  body.replaceChildren(...built);
}

function render() {
  const state = calculator.getState();
  const { view } = state;

  for (const radio of document.querySelectorAll('input[name="solve-for"]')) {
    radio.checked = radio.value === state.solveFor;
  }
  for (const radio of document.querySelectorAll('input[name="unit"]')) {
    radio.checked = radio.value === state.unit;
  }

  for (const field of fields) {
    const isSolved = field === state.solveFor;
    const input = inputs[field];
    const output = outputs[field];
    input.hidden = isSolved;
    output.hidden = !isSolved;
    if (!isSolved && input.value !== state.texts[field]) {
      input.value = state.texts[field];
    }
    if (isSolved && view !== null) {
      output.textContent =
        field === 'time' ? view.timeText : field === 'distance' ? view.distanceText : view.paceText;
    }
    const error = state.errors[field];
    if (error) {
      errorEls[field].textContent = errorMessage(field, error);
      errorEls[field].hidden = false;
      input.setAttribute('aria-invalid', 'true');
    } else {
      errorEls[field].textContent = '';
      errorEls[field].hidden = true;
      input.removeAttribute('aria-invalid');
    }
  }

  suffixDistance.textContent = t.suffixDistance[state.unit];
  suffixPace.textContent = t.suffixPace[state.unit];
  staleNote.hidden = !state.stale;

  if (view === null) return;

  renderTableBody(
    splitsBody,
    view.splits.rows.map((row) => ({
      className: row.isFinish ? 'finish' : '',
      texts: [
        `${row.label} ${t.splitUnit[state.unit]}${row.isFinish ? t.finishSuffix : ''}`,
        formatTime(row.segmentSeconds),
        formatTime(row.cumulativeSeconds),
      ],
    })),
  );

  renderTableBody(
    predictionsBody,
    view.predictions.map((row, index) => ({
      className: row.isInput ? 'your-input' : '',
      texts: [
        `${t.targets[index]}${row.isInput ? t.yourInput : ''}`,
        row.timeText,
        `${row.paceText} ${t.suffixPace[state.unit]}`,
      ],
    })),
  );
}

for (const field of fields) {
  inputs[field].addEventListener('input', () => {
    calculator.setField(field, inputs[field].value);
    render();
  });
}
for (const radio of document.querySelectorAll('input[name="solve-for"]')) {
  radio.addEventListener('change', () => {
    calculator.setSolveFor(radio.value);
    render();
  });
}
for (const radio of document.querySelectorAll('input[name="unit"]')) {
  radio.addEventListener('change', () => {
    calculator.setUnit(radio.value);
    render();
  });
}

render();
