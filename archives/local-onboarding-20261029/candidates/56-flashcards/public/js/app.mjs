import { createController } from './controller.mjs';
import zh from './locales/zh-Hant.mjs';
import en from './locales/en.mjs';

export function mount(doc = document, host = globalThis, controllerOptions = {}) {
  const copy = doc.documentElement.lang === 'en' ? en : zh, t = copy.ui;
  const get = id => doc.getElementById(id);
  const number = value => new Intl.NumberFormat(copy.locale).format(value);
  const write = (id, value) => { get(id).textContent = value; };
  const show = (id, visible) => { get(id).hidden = !visible; };
  const setValue = (id, value) => { if (get(id).value !== String(value)) get(id).value = String(value); };
  const sourceControls = ['source', 'csvFile', 'header', 'questionColumn', 'answerColumn', 'shuffle', 'seed', 'inspect', 'sample', 'start'];
  const practiceControls = ['reveal', 'assessKnown', 'assessReview', 'previous', 'next', 'restart', 'mode', 'practiceSeed', 'reshuffle', 'reset', 'prepare', 'outputType', 'download'];
  const support = typeof host.TextEncoder === 'function' && typeof host.TextDecoder === 'function' && typeof host.FileReader === 'function' && typeof host.Blob === 'function' && typeof host.URL?.createObjectURL === 'function' && typeof host.URL?.revokeObjectURL === 'function' && typeof host.crypto?.getRandomValues === 'function' && typeof String.prototype.isWellFormed === 'function';
  if (!support) { write('unsupported', t.unsupported); return null; }
  show('unsupported', false);
  function preview(id, cards) {
    const region = get(id); region.replaceChildren();
    for (const card of cards.slice(0, 3)) {
      const question = doc.createElement('dt'), answer = doc.createElement('dd');
      question.textContent = card.question; answer.textContent = card.answer;
      question.dir = 'auto'; answer.dir = 'auto'; region.append(question, answer);
    }
  }
  let columnsKey = '';
  function render(state) {
    const session = state.session, locked = state.phase === 'running' || !!state.pendingImport || !!state.confirmation;
    for (const id of sourceControls) get(id).disabled = !!session || locked;
    for (const id of ['jsonFile', 'jsonText', 'previewImport']) get(id).disabled = state.phase === 'running' || !!state.confirmation;
    for (const id of practiceControls) get(id).disabled = !session || locked;
    for (const id of ['clear', 'cancelRead', 'confirm', 'cancelConfirm', 'confirmImport', 'cancelImport', 'stayLanguage']) get(id).disabled = false;
    get('edit').disabled = !session || locked;
    show('edit', !!session); show('start', !session);
    setValue('source', state.source); get('header').checked = state.settings.header; get('shuffle').checked = state.settings.shuffle;
    setValue('seed', state.settings.seed); setValue('practiceSeed', state.settings.seed);
    const columns = state.columns.length ? state.columns : [{ index: 0, label: '' }, { index: 1, label: '' }];
    const key = JSON.stringify(columns);
    if (columnsKey !== key) {
      for (const id of ['questionColumn', 'answerColumn']) {
        get(id).replaceChildren();
        for (const column of columns) { const option = doc.createElement('option'); option.value = String(column.index); option.textContent = `${t.column} ${number(column.index + 1)}${column.label ? `: ${column.label}` : ''}`; get(id).append(option); }
      }
      columnsKey = key;
    }
    setValue('questionColumn', state.settings.questionColumn); setValue('answerColumn', state.settings.answerColumn);
    get('start').disabled ||= !state.source;
    write('status', copy.messages[state.message] ?? copy.messages.idle);
    show('busy', state.phase === 'running'); get('workspace').setAttribute('aria-busy', String(state.phase === 'running'));
    show('error', !!state.error);
    for (const id of ['source', 'csvFile', 'questionColumn', 'answerColumn', 'seed', 'practiceSeed', 'jsonFile', 'jsonText', 'outputType']) get(id).removeAttribute('aria-invalid');
    if (state.error) {
      const error = state.error;
      write('error', `${t.errorPrefix} ${copy.errors[error.code] ?? copy.errors.UNEXPECTED}${error.record === null ? '' : ` (${t.row} ${number(error.record)})`}`);
      const fields = { source: ['source'], columns: ['questionColumn', 'answerColumn'], seed: [session ? 'practiceSeed' : 'seed'], file: ['csvFile'], json: ['jsonText', 'jsonFile'], output: ['outputType'] };
      for (const id of fields[error.field] ?? ['source']) get(id).setAttribute('aria-invalid', 'true');
    } else write('error', '');
    show('confirmation', !!state.confirmation);
    if (state.confirmation) {
      const reset = state.confirmation === 'reset';
      write('confirmTitle', reset ? t.confirmReset : t.confirmEdit); write('confirmBody', reset ? t.confirmResetBody : t.confirmEditBody); write('confirm', reset ? t.confirmResetButton : t.confirmEditButton);
    }
    show('importPreview', !!state.pendingImport);
    if (state.pendingImport) {
      const incoming = state.pendingImport;
      write('importSource', state.pendingImportSource === 'file' ? t.importFromFile : t.importFromPaste);
      write('incomingCounts', [incoming.cards.length, incoming.known.length, incoming.cards.length - incoming.known.length].map(number).join(' / ')); preview('incomingCards', incoming.cards);
    } else { write('importSource', ''); get('incomingCards').replaceChildren(); }
    show('empty', !session); show('practice', !!session);
    const card = session?.cards.find(item => item.id === session.currentId);
    show('card', !!card); show('recallActions', !!card); show('roundEnd', !!session && !card);
    write('question', card?.question ?? ''); write('answer', card && session.revealed ? card.answer : '');
    show('answerPanel', !!card && session.revealed); show('hiddenAnswer', !!card && !session.revealed);
    show('reveal', !!card && !session.revealed); show('assessment', !!card && session.revealed);
    if (session) {
      write('cardNumber', `${number(Math.min(session.position + 1, session.order.length))} / ${number(session.order.length)}`);
      write('totalCount', number(session.cards.length)); write('knownCount', number(session.known.size)); write('reviewCount', number(session.cards.length - session.known.size)); write('batchCount', number(session.order.length));
      setValue('mode', session.mode);
      const allKnown = session.mode === 'review' && session.cards.length === session.known.size;
      write('roundTitle', allKnown ? t.allKnown : t.roundEnded); write('roundBody', allKnown ? t.allKnownBody : t.roundBody);
      get('previous').disabled ||= !session.order.length || session.position === 0; get('next').disabled ||= !card; get('restart').disabled ||= !session.order.length;
      get('restart').disabled ||= allKnown;
    }
    show('prepared', !!state.prepared); get('download').disabled ||= !state.prepared || !!state.prepared?.downloadDisabled;
    for (const id of ['reveal', 'assessKnown', 'restart']) get(id).setAttribute('class', state.prepared ? '' : 'primary');
    setValue('outputText', state.prepared?.text ?? ''); write('filename', state.prepared?.filename ?? ''); write('fileBytes', state.prepared ? number(state.prepared.bytes) : '');
    show('printPreview', state.prepared?.type === 'html');
    if (state.prepared?.type === 'html') preview('printCards', session.cards); else get('printCards').replaceChildren();
  }
  const controller = createController({ ...controllerOptions, locale: copy.locale, onChange: render });
  function focusAfter(ok, id) { if (ok) get(id).focus(); else if (controller.snapshot().error) get('error').focus(); }
  const click = (id, handler) => get(id).addEventListener('click', handler);
  get('source').addEventListener('input', () => controller.setSource(get('source').value));
  for (const id of ['header', 'shuffle']) get(id).addEventListener('change', () => controller.setSetting(id, get(id).checked));
  for (const id of ['questionColumn', 'answerColumn']) get(id).addEventListener('change', () => controller.setSetting(id, Number(get(id).value)));
  get('seed').addEventListener('input', () => controller.setSetting('seed', get('seed').value));
  get('practiceSeed').addEventListener('input', () => controller.setPracticeSeed(get('practiceSeed').value));
  get('mode').addEventListener('change', () => focusAfter(controller.dispatch({ type: 'setMode', mode: get('mode').value }), 'studyHeading'));
  get('outputType').addEventListener('change', () => controller.invalidateOutput());
  get('jsonText').addEventListener('input', () => controller.invalidateOutput());
  for (const [id, kind] of [['csvFile', 'csv'], ['jsonFile', 'json']]) get(id).addEventListener('change', () => {
    const file = get(id).files?.[0];
    if (file) void controller.loadFile(file, kind);
    get(id).value = '';
  });
  click('inspect', () => focusAfter(controller.inspect(), 'questionColumn'));
  click('start', () => focusAfter(controller.start(), 'studyHeading'));
  click('sample', () => { controller.clear(); controller.setSource(copy.sample); controller.inspect(); get('source').focus(); });
  click('reveal', () => focusAfter(controller.dispatch({ type: 'reveal' }), 'assessKnown'));
  for (const [id, value] of [['assessKnown', 'known'], ['assessReview', 'review']]) click(id, () => { const ok = controller.dispatch({ type: 'assess', value }); focusAfter(ok, controller.snapshot().session?.currentId === null ? 'studyHeading' : 'reveal'); });
  for (const [id, type] of [['previous', 'previous'], ['next', 'next'], ['restart', 'restart']]) click(id, () => focusAfter(controller.dispatch({ type }), 'studyHeading'));
  click('reshuffle', () => focusAfter(controller.reshuffle(), 'studyHeading'));
  for (const [id, type] of [['reset', 'reset'], ['edit', 'edit']]) click(id, () => focusAfter(controller.requestConfirmation(type), 'confirmTitle'));
  click('confirm', () => { const edit = controller.snapshot().confirmation === 'edit'; focusAfter(controller.confirm(), edit ? 'source' : 'studyHeading'); });
  click('cancelConfirm', () => { const edit = controller.snapshot().confirmation === 'edit'; controller.cancel(); get(edit ? 'edit' : 'reset').focus(); });
  click('previewImport', () => focusAfter(controller.previewImport(get('jsonText').value), 'importHeading'));
  click('confirmImport', () => { const ok = controller.confirmImport(); if (ok) get('jsonText').value = ''; focusAfter(ok, 'studyHeading'); });
  click('cancelImport', () => { controller.cancel(); get('previewImport').focus(); });
  click('cancelRead', () => controller.cancel());
  click('prepare', () => focusAfter(controller.prepare(get('outputType').value), 'download'));
  click('download', () => {
    const result = controller.download(); if (!result) return;
    const link = doc.createElement('a'); link.href = result.url; link.download = result.filename;
    doc.body.append(link); link.click(); link.remove();
  });
  click('clear', () => { controller.clear(); get('jsonText').value = ''; get('csvFile').value = ''; get('jsonFile').value = ''; get('outputType').value = 'json'; show('languageConfirm', false); get('source').focus(); });
  get('languageLink').addEventListener('click', event => { event.preventDefault(); controller.invalidateOutput(); show('languageConfirm', true); get('languageHeading').focus(); });
  click('stayLanguage', () => { show('languageConfirm', false); get('languageLink').focus(); });
  host.addEventListener('pagehide', () => { controller.clear(); controller.dispose(); columnsKey = ''; get('jsonText').value = ''; get('csvFile').value = ''; get('jsonFile').value = ''; show('languageConfirm', false); });
  host.addEventListener('pageshow', event => { if (event.persisted) controller.resume(); });
  render(controller.snapshot()); return controller;
}

if (typeof document !== 'undefined') mount();
