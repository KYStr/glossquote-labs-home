// Course-row list state (SPEC sections 2-3): 1..50 rows, minimum one row,
// initial state is three empty rows on the 4.0 scale.
export const MAX_ROWS = 50;
export const MIN_ROWS = 1;
export const INITIAL_ROWS = 3;

export function emptyRow() {
  return { label: "", grade: null, creditsRaw: "", excluded: false };
}

export function createInitialState() {
  return { scaleId: "4.0", rows: [emptyRow(), emptyRow(), emptyRow()] };
}

export function canAddRow(rows) { return rows.length < MAX_ROWS; }

export function addRow(state) {
  if (!canAddRow(state.rows)) return { state, added: false, code: "row-limit" };
  return { state: { ...state, rows: [...state.rows, emptyRow()] }, added: true };
}

export function removeRow(state, index) {
  if (state.rows.length <= MIN_ROWS) return { state, removed: false, code: "row-minimum" };
  if (index < 0 || index >= state.rows.length) return { state, removed: false, code: "no-such-row" };
  const rows = state.rows.slice();
  rows.splice(index, 1);
  return { state: { ...state, rows }, removed: true };
}

// Switching scale preserves labels, credits and grade letters; a letter that
// does not exist on the new scale (A+ on 4.0) stays on the row and surfaces
// as an error state via assessRow — never a silent remap.
export function setScale(state, scaleId) {
  return { ...state, scaleId, rows: state.rows.map((r) => ({ ...r })) };
}

export function clearAll() { return createInitialState(); }
