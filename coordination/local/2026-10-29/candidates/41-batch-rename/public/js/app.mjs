import { planRenames, inspectItems, parseDecimal, LIMITS } from './core/filename-planner.mjs';
import { buildStoreZip } from './core/zip-store.mjs';
import { messages, errorText, formatBytes } from './i18n.mjs';

export const candidateVersion = '0.1.0';
const defaultRule = () => ({ mode: 'sequence', base: 'file', start: 1, width: 3 });

// This controller has no implicit browser side effects. Node tests inject URL and
// reader fixtures; these tests do not claim browser acceptance.
export class RenameWorkspace {
  constructor({ onChange = () => {}, createUrl = blob => URL.createObjectURL(blob), revokeUrl = url => URL.revokeObjectURL(url), writer = buildStoreZip } = {}) {
    this.onChange = onChange; this.createUrl = createUrl; this.revokeUrl = revokeUrl; this.writer = writer;
    this.generation = 0; this.nextId = 1; this.items = []; this.rule = defaultRule();
    this.job = null; this.url = null; this.blob = null; this.status = 'empty'; this.errors = []; this.selectionErrors = [];
    this.progress = null; this.plan = planRenames([], this.rule);
  }
  state() {
    return { generation: this.generation, items: this.items.map(({ id, name, size }) => ({ id, name, size })),
      plan: this.plan, status: this.status, errors: this.errors, selectionErrors: this.selectionErrors, progress: this.progress, url: this.url };
  }
  emit() { this.onChange(this.state()); }
  invalidate() {
    this.generation++;
    const previous = this.job; this.job = null;
    if (previous) { previous.abort.abort(); previous.entries.length = 0; previous.reader = null; }
    if (this.url) this.revokeUrl(this.url);
    this.url = null; this.blob = null; this.progress = null;
    this.plan = { rows: [], errors: [], canBuild: false };
    this.errors = []; this.selectionErrors = []; this.status = 'empty';
    this.emit(); // Synchronous removal of the old href before any future await.
  }
  recompute() {
    this.plan = planRenames(this.items.map(({ name, size }) => ({ name, size })), this.rule);
    this.status = !this.items.length ? 'empty' : this.plan.canBuild ? 'valid' : 'invalid';
  }
  addFiles(files) {
    this.invalidate();
    if (!files || !Number.isSafeInteger(files.length) || files.length < 0 || files.length + this.items.length > LIMITS.count) {
      this.selectionErrors = [{ code: 'COUNT' }]; this.recompute(); this.emit(); return false;
    }
    const batch = Array.from(files);
    const candidates = [...this.items, ...batch.map(file => ({ name: file.name, size: file.size, file }))];
    const metadata = candidates.map(({ name, size }) => ({ name, size }));
    const errors = inspectItems(metadata).errors;
    for (let index = 0; index < batch.length; index++) if (typeof batch[index].stream !== 'function') errors.push({ code: 'UNSUPPORTED', index: this.items.length + index });
    if (errors.length) {
      this.selectionErrors = errors.map(error => ({ ...error, ...(error.index === undefined ? {} : { index: error.index - this.items.length }) }));
      this.recompute(); this.emit(); return false;
    }
    this.items.push(...batch.map(file => ({ id: this.nextId++, name: file.name, size: file.size, file })));
    this.recompute(); this.emit(); return true;
  }
  setRule(rule) { this.invalidate(); this.rule = { ...rule }; this.recompute(); this.emit(); }
  move(id, delta) {
    const from = this.items.findIndex(item => item.id === id); const to = from + delta;
    if ((delta !== -1 && delta !== 1) || from < 0 || to < 0 || to >= this.items.length) return false;
    this.invalidate(); [this.items[from], this.items[to]] = [this.items[to], this.items[from]];
    this.recompute(); this.emit(); return true;
  }
  remove(id) {
    this.invalidate(); this.items = this.items.filter(item => item.id !== id); this.recompute(); this.emit();
  }
  cancel() { this.invalidate(); this.recompute(); this.status = this.items.length ? 'cancelled' : 'empty'; this.emit(); }
  clear() { this.invalidate(); this.items.length = 0; this.rule = defaultRule(); this.nextId = 1; this.recompute(); this.emit(); }
  async build() {
    if (!this.plan.canBuild || this.status === 'building') return false;
    this.invalidate(); this.recompute();
    const generation = this.generation;
    const entries = this.plan.rows.map((row, index) => {
      const file = this.items[index].file;
      return { name: row.outputName, size: row.size, stream: () => file.stream() };
    });
    const job = { generation, abort: new AbortController(), entries, reader: null };
    this.job = job; this.status = 'building'; this.progress = { current: 1, completed: 0, total: entries.length }; this.emit();
    const current = () => this.generation === generation && this.job === job;
    try {
      const blob = await this.writer(entries, { generation, signal: job.abort.signal, isCurrent: current,
        onReader: reader => { if (current()) job.reader = reader; },
        onProgress: progress => { if (current()) { this.progress = progress; this.emit(); } } });
      if (!current()) return false;
      let url;
      try { url = this.createUrl(blob); } catch { throw { code: 'ZIP_FAILED' }; }
      if (!current()) { this.revokeUrl(url); return false; }
      this.blob = blob; this.url = url; this.status = 'ready'; this.job = null; this.progress = null;
      entries.length = 0; this.emit(); return true;
    } catch (error) {
      if (!current()) return false;
      this.job = null; entries.length = 0; this.progress = null; this.status = 'failed';
      this.errors = [{ code: Object.hasOwn(messages.en.errors, error?.code) ? error.code : 'ZIP_FAILED' }];
      this.emit(); return false;
    } finally { entries.length = 0; job.reader = null; }
  }
}

export function bindApp(doc, lifecycle = globalThis) {
  const language = doc.documentElement.lang === 'en' ? 'en' : 'zh-Hant'; const t = messages[language];
  const $ = id => doc.getElementById(id);
  const list = $('file-list'); const input = $('files');
  const fields = ['base', 'start', 'width', 'find', 'replacement', 'prefix'];
  const associated = { BASE: 'base', START: 'start', WIDTH: 'width', SEQUENCE_END: 'start', FIND: 'find', REPLACEMENT: 'replacement', PREFIX: 'prefix' };
  let workspace;
  function node(tag, text, className) {
    const element = doc.createElement(tag); if (text !== undefined) element.textContent = text; if (className) element.className = className; return element;
  }
  function errorsInto(container, errors, selected = false) {
    container.replaceChildren();
    for (const error of errors) container.append(node('p', `⚠ ${selected && error.index !== undefined ? `${t.selected(error.index)}: ` : ''}${errorText(language, error.code)}`));
    container.hidden = errors.length === 0;
  }
  function render(state) {
    const focused = doc.activeElement;
    const focusedRow = focused?.closest?.('[data-id]');
    const restoreFocus = focusedRow && list.contains(focused) ? { id: focusedRow.dataset.id, action: focused.dataset.action } : null;
    $('summary').textContent = t.count(new Intl.NumberFormat(language).format(state.items.length), formatBytes(state.items.reduce((sum, item) => sum + item.size, 0), language));
    $('empty').hidden = state.items.length !== 0;
    const fragment = doc.createDocumentFragment();
    for (let index = 0; index < state.items.length; index++) {
      const item = state.items[index]; const row = state.plan.rows[index];
      const li = node('li'); li.dataset.id = String(item.id);
      li.append(node('span', String(index + 1), 'order'));
      const names = node('div', undefined, 'names');
      for (const [label, value] of [[t.original, item.name], [t.output, row?.outputName ?? t.unavailable]]) {
        const cell = node('div'); cell.append(node('span', label, 'column-label')); const name = node('bdi', value, 'filename'); cell.append(name); names.append(cell);
      }
      const check = node('p', row ? (row.errors.length ? `⚠ ${row.errors.map(code => errorText(language, code)).join(' ')}` : t.good) : t.unavailable, row?.errors.length ? 'row-error' : 'row-status'); names.append(check); li.append(names);
      li.append(node('span', formatBytes(item.size, language), 'file-size'));
      const controls = node('div', undefined, 'row-actions');
      for (const [action, label, disabled] of [['up', t.up, index === 0], ['down', t.down, index === state.items.length - 1], ['remove', t.remove, false]]) {
        const button = node('button', label); button.type = 'button'; button.dataset.action = action;
        button.setAttribute('aria-label', `${label}, ${t.row} ${index + 1}: ${item.name}`);
        if (disabled) button.setAttribute('aria-disabled', 'true');
        button.addEventListener('click', () => {
          if (disabled) return;
          if (action === 'remove') {
            workspace.remove(item.id);
            const next = list.children[Math.min(index, list.children.length - 1)];
            (next?.querySelector('[data-action="remove"]') ?? input).focus();
          } else if (workspace.move(item.id, action === 'up' ? -1 : 1)) {
            list.querySelector(`[data-id="${item.id}"] [data-action="${action}"]`)?.focus();
          }
        });
        controls.append(button);
      }
      li.append(controls); fragment.append(li);
    }
    list.replaceChildren(fragment);
    if (restoreFocus?.action) list.querySelector(`[data-id="${restoreFocus.id}"] [data-action="${restoreFocus.action}"]`)?.focus();
    errorsInto($('selection-errors'), state.selectionErrors, true);
    errorsInto($('rule-errors'), state.plan.errors.filter(error => error.index === undefined));
    errorsInto($('build-errors'), state.errors);
    for (const field of fields) $(field).setAttribute('aria-invalid', 'false');
    for (const error of state.plan.errors) if (associated[error.code]) $(associated[error.code]).setAttribute('aria-invalid', 'true');
    if (state.plan.errors.some(error => error.code === 'UNICODE')) for (const field of fields) if (!$(field).disabled) $(field).setAttribute('aria-invalid', 'true');
    const status = state.status === 'building' ? t.building(state.progress.current, state.progress.total) : state.status === 'ready' ? t.success : state.status === 'cancelled' ? t.cancelled : state.status === 'invalid' ? t.invalid : state.status === 'failed' ? `⚠ ${errorText(language, state.errors[0]?.code)}` : state.status === 'empty' ? t.empty : t.ready;
    if ($('status').textContent !== status) $('status').textContent = status;
    $('status').dataset.state = state.status;
    $('progress').hidden = state.status !== 'building';
    if (state.progress) { $('progress').max = state.progress.total; $('progress').value = state.progress.completed; $('progress').setAttribute('aria-label', t.completed(state.progress.completed)); }
    $('build').disabled = !state.plan.canBuild || state.status === 'building';
    $('build').className = state.url ? '' : 'primary';
    $('cancel').hidden = state.status !== 'building'; $('clear').disabled = false;
    $('download').hidden = !state.url;
    if (state.url) $('download').href = state.url; else $('download').removeAttribute('href');
    $('download-note').hidden = !state.url;
    list.setAttribute('aria-busy', String(state.status === 'building'));
  }
  workspace = new RenameWorkspace({ onChange: render });
  function decimal(id, max) { try { return parseDecimal($(id).value, 1, max, id === 'start' ? 'START' : 'WIDTH'); } catch { return NaN; } }
  function readRule() {
    if ($('mode-sequence').checked) return { mode: 'sequence', base: $('base').value, start: decimal('start', LIMITS.sequence), width: decimal('width', 9) };
    return { mode: 'replace', find: $('find').value, replacement: $('replacement').value, prefix: $('prefix').value };
  }
  function modes() {
    const sequence = $('mode-sequence').checked;
    $('sequence-fields').hidden = !sequence; $('sequence-fields').disabled = !sequence;
    $('replace-fields').hidden = sequence; $('replace-fields').disabled = sequence;
  }
  function reset() { $('rules').reset(); input.value = ''; modes(); }
  input.addEventListener('change', () => { workspace.addFiles(input.files); input.value = ''; });
  $('rules').addEventListener('submit', event => event.preventDefault());
  $('rules').addEventListener('input', () => { modes(); workspace.setRule(readRule()); });
  $('build').addEventListener('click', () => { void workspace.build(); });
  $('cancel').addEventListener('click', () => workspace.cancel());
  $('clear').addEventListener('click', () => { reset(); workspace.clear(); });
  $('language-link').addEventListener('click', () => { reset(); workspace.clear(); });
  lifecycle.addEventListener('pagehide', () => { reset(); workspace.clear(); });
  lifecycle.addEventListener('pageshow', event => { if (event.persisted) { reset(); workspace.clear(); } });
  reset(); workspace.emit();
  if (typeof Blob !== 'function' || typeof URL.createObjectURL !== 'function' || typeof AbortController !== 'function') {
    input.disabled = true; errorsInto($('selection-errors'), [{ code: 'UNSUPPORTED' }]);
  }
  return workspace;
}
if (typeof document !== 'undefined') bindApp(document);
