import { physicalLines } from './core/compare.mjs';
import { createListState, RESULT_KEYS } from './state.mjs';
import { renderRows } from './render.mjs';
import { WORDING } from './wording.mjs';

export function mountApp(document, window) {
  const wording = WORDING[document.documentElement.lang] ?? WORDING.en;
  const get = id => document.getElementById(id);
  const inputs = { aText: get('a-text'), bText: get('b-text') };
  const options = { trimItems: get('trim-items'), ignoreCase: get('ignore-case') };
  let renderedValue;
  let announcedRevision = -1;
  function render(state) {
    for (const [field, input] of Object.entries(inputs)) {
      if (input.value !== state.request[field]) input.value = state.request[field];
      const side = field === 'aText' ? 'a' : 'b';
      get(`${side}-counter`).textContent = wording.inputCount(input.value.length, physicalLines(input.value).length);
      const isInvalid = state.error?.side === side.toUpperCase();
      input.setAttribute('aria-invalid', String(isInvalid));
      const errorNode = get(`${side}-error`);
      errorNode.hidden = !isInvalid;
      errorNode.textContent = isInvalid ? wording.location(state.error) + wording.errors[state.error.code] : '';
    }
    for (const [field, input] of Object.entries(options)) input.checked = state.request[field];
    get('error-notice').hidden = state.phase !== 'error';
    get('error-notice').textContent = state.error
      ? (state.error.side ? wording.location(state.error) : '') + wording.errors[state.error.code]
      : '';
    if (state.revision !== announcedRevision) {
      get('comparison-status').textContent = state.value ? wording.summary(state.value.summary) : '';
      announcedRevision = state.revision;
    }
    if (renderedValue !== state.value) {
      get('input-summary').hidden = !state.value;
      for (const side of ['a', 'b']) {
        for (const key of ['rawLineCount', 'blankLineCount', 'nonEmptyLineCount', 'uniqueCount', 'duplicateCount']) {
          get(`${side}-${key}`).textContent = state.value ? new Intl.NumberFormat(document.documentElement.lang).format(state.value[side][key]) : '';
        }
      }
      for (const section of RESULT_KEYS) {
        const items = state.value?.results[section] ?? [];
        renderRows(document, get(`${section}-rows`), items, section, wording);
        get(`${section}-count`).textContent = state.value ? wording.count(items.length) : '—';
        const empty = get(`${section}-empty`);
        empty.hidden = items.length > 0;
        empty.textContent = state.value ? wording.empty : wording.waiting;
      }
      renderedValue = state.value;
    }
    for (const section of RESULT_KEYS) {
      const hasItems = Boolean(state.value?.results[section].length);
      const button = get(`${section}-copy`);
      button.disabled = !hasItems;
      const copy = state.copies[section];
      button.setAttribute('aria-busy', String(copy?.status === 'pending'));
      get(`${section}-hint`).textContent = hasItems ? wording.ready : wording.nothing;
      get(`${section}-copy-status`).textContent = copy ? wording[copy.status === 'success' ? 'copied' : copy.status] : '';
      const fallback = get(`${section}-fallback`);
      const visible = copy?.status === 'fallback';
      fallback.hidden = !visible;
      get(`${section}-manual`).value = visible ? copy.text : '';
    }
  }
  const state = createListState({
    writeClipboard: text => {
      const clipboard = window.navigator.clipboard;
      if (!clipboard || typeof clipboard.writeText !== 'function') throw new Error('Clipboard unavailable');
      return clipboard.writeText(text);
    },
    onChange: render
  });
  // Clear any browser-restored form values; there is no saved draft.
  render(state.snapshot());
  for (const [field, input] of Object.entries(inputs)) {
    for (const event of ['input', 'change']) input.addEventListener(event, () => state.setInput(field, input.value));
  }
  for (const [field, input] of Object.entries(options)) {
    for (const event of ['input', 'change']) input.addEventListener(event, () => state.setOption(field, input.checked));
  }
  get('compare-form').addEventListener('submit', event => {
    event.preventDefault();
    const result = state.compare();
    if (!result.ok) {
      if (result.error.side) inputs[result.error.side === 'A' ? 'aText' : 'bText'].focus();
      else get('compare').focus();
    }
  });
  get('example').addEventListener('click', () => state.loadExample());
  get('clear').addEventListener('click', () => { state.clear(); inputs.aText.focus(); });
  for (const section of RESULT_KEYS) get(`${section}-copy`).addEventListener('click', () => { void state.copy(section); });
  window.addEventListener('pagehide', () => state.clear());
  window.addEventListener('pageshow', event => { if (event.persisted) state.clear(); });
  return state;
}

if (typeof document !== 'undefined' && typeof window !== 'undefined') mountApp(document, window);
