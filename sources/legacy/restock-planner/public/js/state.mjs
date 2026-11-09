import { calculateRestockPlan } from './core/calculate.mjs';
import { formatRestockReport } from './core/report.mjs';
import { DAY_KEYS, ROW_KEYS } from './core/schema.mjs';

export function createPlanner(language) {
  if (!['zh-Hant', 'en'].includes(language)) throw new TypeError('Unsupported language');
  let nextId = 0;
  const blankRow = () => ({ id: `item-${++nextId}`, nameRaw: '', unitRaw: '', usedRaw: '', stockRaw: '', reserveRaw: '', packSizeRaw: '' });
  const defaults = () => ({ observationDaysRaw: '30', leadDaysRaw: '7', coverageDaysRaw: '30', items: [blankRow()] });
  const state = { draft: defaults(), result: null, report: '', pending: null, error: null, status: 'initial', busy: false, composing: false, active: true };
  function invalidate() { state.result = null; state.report = ''; state.error = null; state.status = 'changed'; }
  function wipeDraft() {
    for (const key of DAY_KEYS) state.draft[key] = '';
    for (const row of state.draft.items) for (const key of ROW_KEYS) row[key] = '';
    state.draft.items.length = 0;
  }
  function reset() {
    wipeDraft();
    state.draft = defaults(); state.result = null; state.report = ''; state.pending = null; state.error = null;
    state.status = 'initial'; state.busy = false; state.composing = false; state.active = true;
  }
  function isInitial() {
    const d = state.draft;
    return state.active && d.observationDaysRaw === '30' && d.leadDaysRaw === '7' && d.coverageDaysRaw === '30' && d.items.length === 1 && ROW_KEYS.slice(1).every(key => d.items[0][key] === '') && !state.result && state.report === '';
  }
  const editable = () => state.active && !state.busy && !state.pending;
  function request(kind) {
    if (!editable() || state.composing || !['normal', 'shortage', 'clear', 'language'].includes(kind)) return null;
    if (kind === 'language' && isInitial()) return language === 'en' ? '/index.html' : '/en/index.html';
    if (kind === 'clear' && isInitial()) { reset(); return null; }
    state.pending = kind; return null;
  }
  function dispose() {
    wipeDraft(); state.result = null; state.report = ''; state.pending = null; state.error = null;
    state.status = 'initial'; state.composing = false; state.busy = false; state.active = false;
  }
  function confirmPending() {
    if (!state.pending || state.composing) return null;
    const kind = state.pending;
    if (kind === 'language') { dispose(); return language === 'en' ? '/index.html' : '/en/index.html'; }
    reset();
    if (kind === 'normal' || kind === 'shortage') {
      Object.assign(state.draft.items[0], { nameRaw: language === 'en' ? 'Supplies' : '耗材', unitRaw: language === 'en' ? 'units' : '個', usedRaw: '30', stockRaw: kind === 'shortage' ? '2' : '10', reserveRaw: '3', packSizeRaw: '12' });
      state.status = 'example';
    }
    return null;
  }
  return {
    state, isInitial, reset, dispose, request, confirm: confirmPending,
    cancel() { state.pending = null; },
    editDay(key, value) { if (!editable() || !DAY_KEYS.includes(key) || typeof value !== 'string') return false; state.draft[key] = value; invalidate(); return true; },
    editRow(id, key, value) {
      if (!editable() || !ROW_KEYS.slice(1).includes(key) || typeof value !== 'string') return false;
      const row = state.draft.items.find(row => row.id === id); if (!row) return false;
      row[key] = value; invalidate(); return true;
    },
    addRow() { if (!editable() || state.composing || state.draft.items.length >= 30) return false; state.draft.items.push(blankRow()); invalidate(); return true; },
    removeRow(id) {
      if (!editable() || state.composing || state.draft.items.length <= 1) return false;
      const index = state.draft.items.findIndex(row => row.id === id); if (index < 0) return false;
      const row = state.draft.items[index]; for (const key of ROW_KEYS) row[key] = '';
      state.draft.items.splice(index, 1); invalidate(); return true;
    },
    beginComposition() { if (!editable()) return; state.composing = true; invalidate(); },
    endComposition() { state.composing = false; },
    calculate() {
      if (!editable() || state.composing) return false;
      state.busy = true; invalidate(); state.status = 'running';
      try {
        const outcome = calculateRestockPlan(state.draft);
        if (!outcome.ok) { state.error = outcome.error; state.status = 'error'; return false; }
        const formatted = formatRestockReport(outcome.result, language);
        if (!formatted.ok) { state.status = 'blocked'; return false; }
        state.result = outcome.result; state.report = formatted.text;
        state.status = outcome.result.items.every(row => row.packsToOrder === 0) ? 'noOrder' : 'success';
        return true;
      } catch { state.result = null; state.report = ''; state.error = null; state.status = 'blocked'; return false; }
      finally { state.busy = false; }
    },
  };
}
