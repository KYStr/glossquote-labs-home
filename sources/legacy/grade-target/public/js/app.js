import { calculateTarget } from './core/calculate-target.js';
import { buildReport } from './core/build-report.js';
import { decimalPattern, parseHundredths, formatHundredths } from './core/exact.js';
import { createEffects } from './lifecycle.js';

const form = document.getElementById('calculator');
let ready = false;
let submitCalculation;
// This must be the first registered listener; cancellation precedes all guards.
form.addEventListener('submit', event => {
  event.preventDefault();
  if (!ready) return;
  submitCalculation(event);
}, { capture: true });

const translations = {
  'zh-Hant': {
    row: '項目', name: '項目名稱', weight: '權重（%）', score: '成績（0–100）', remove: '移除', decimal: '插入小數點',
    blank: '尚未評分（留白）', graded: '已評分：', scoreInvalid: '成績格式待修正',
    target: '目標分數', earned: '已取得的總成績貢獻', required: '剩餘項目需達的加權平均', remaining: '剩餘權重', maximum: '最高可能總成績', final: '全部項目已評分；最終總成績',
    statuses: { target_feasible: '✓ 仍可達成', target_already_met: '✓ 已達成目標；仍有項目尚未評分', target_unreachable: '！目標目前無法達到', complete_met: '✓ 全部項目已評分，已達成目標', complete_missed: '！全部項目已評分，未達成目標' },
    errors: {
      invalid_schema: '表單結構不正確，請清除表單後重試。', invalid_rows_count: '請保留 1–40 個評分項目。',
      invalid_target_format: '請輸入目標，使用半形數字與句點，最多兩位小數；不要輸入空白或逗號。', target_out_of_range: '目標分數必須介於 0 與 100。',
      raw_too_long: '數字最多 32 個字元，請縮短輸入。', invalid_id: '項目身分無效，請移除此列並新增。', duplicate_id: '項目身分重複，請移除此列並新增。',
      invalid_name: '請輸入 1–80 個字元的名稱（不含兩端空白），原始名稱最多 160 個字元；不可含控制或不完整字元。',
      invalid_weight_format: '請輸入權重，使用半形數字與句點，最多兩位小數；不要輸入空白或逗號。', weight_out_of_range: '每項權重必須介於 0.01% 與 100%。',
      invalid_score_format: '成績請留白，或使用半形數字與句點輸入，最多兩位小數；不要輸入空白或逗號。', score_out_of_range: '成績必須介於 0 與 100。',
      weight_total_mismatch: '請調整各項權重，合計必須恰為 100.00%。'
    },
    correct: '請修正：', total: '權重合計', invalidTotal: '請修正權重格式', limit: '最多 40 項；如需新增，請先移除一項。',
    example: '範例（假資料）：目標 70；項目 A 權重 40、成績 80；項目 B 權重 60、尚未評分。按「試算」查看結果。',
    exampleA: '項目 A', exampleB: '項目 B',
    unreachable: value => `即使所有剩餘項目都是 100，最高總成績也只有 ${value}。`,
    empty: '填好目標和評分項目後，按「試算」查看結果。',
    stale: '表單已變更，請重新試算。', copy: '複製結果', copying: '正在複製…', copied: '已複製目前結果。', copyFailed: '無法複製。請展開下方純文字報告並選取文字，手動複製。',
    downloadFailed: '無法建立下載，請使用可選取的純文字報告。', capacity: '已有 8 個有效下載連結。請等候連結到期後再下載（每個連結各自 30 秒）。', activeDownloads: count => `有效下載連結：${count} / 8；每個連結各自保留 30 秒。清除表單可撤銷連結，已下載檔案由瀏覽器管理。`,
    clearConfirm: '清除會移除目前表單、結果和下載連結。要清除嗎？', clear: '清除表單', cancel: '取消', switch: '清除並切換', stay: '留在此頁',
    fail: '表單未能啟用。請重新載入此頁。 / The form could not start. Reload this page.'
  },
  en: {
    row: 'Component', name: 'Component name', weight: 'Weight (%)', score: 'Score (0–100)', remove: 'Remove', decimal: 'Insert decimal point',
    blank: 'Not graded (leave blank)', graded: 'Graded: ', scoreInvalid: 'Check score format',
    target: 'Target grade', earned: 'Earned contribution to final grade', required: 'Weighted average needed across remaining components', remaining: 'Remaining weight', maximum: 'Maximum possible final grade', final: 'All components are graded; final grade',
    statuses: { target_feasible: '✓ Target is reachable', target_already_met: '✓ Target already met; some components are still ungraded', target_unreachable: '！This target is not currently reachable', complete_met: '✓ All components are graded; target met', complete_missed: '！All components are graded; target not met' },
    errors: {
      invalid_schema: 'The form structure is invalid. Clear the form and try again.', invalid_rows_count: 'Keep between 1 and 40 grading components.',
      invalid_target_format: 'Enter a target using ASCII digits and a period, with up to two decimal places. Do not enter spaces or commas.', target_out_of_range: 'The target grade must be between 0 and 100.',
      raw_too_long: 'A number can have at most 32 characters. Shorten the entry.', invalid_id: 'This component has an invalid ID. Remove it and add a new component.', duplicate_id: 'This component has a duplicate ID. Remove it and add a new component.',
      invalid_name: 'Enter a name with 1–80 characters after trimming end spaces, at most 160 before trimming, and no control or incomplete characters.',
      invalid_weight_format: 'Enter a weight using ASCII digits and a period, with up to two decimal places. Do not enter spaces or commas.', weight_out_of_range: 'Each weight must be between 0.01% and 100%.',
      invalid_score_format: 'Leave the score blank, or use ASCII digits and a period with up to two decimal places. Do not enter spaces or commas.', score_out_of_range: 'The score must be between 0 and 100.',
      weight_total_mismatch: 'Adjust the component weights to total exactly 100.00%.'
    },
    correct: 'Please correct: ', total: 'Total weight', invalidTotal: 'Check weight format', limit: '40 components maximum. Remove one before adding another.',
    example: 'Example (fictional data): target 70; Component A has weight 40 and score 80; Component B has weight 60 and is not graded. Select Calculate to see the result.',
    exampleA: 'Component A', exampleB: 'Component B',
    unreachable: value => `Even with 100 on every remaining component, the maximum final grade is ${value}.`,
    empty: 'Enter a target and grading components, then select Calculate to see the result.',
    stale: 'The form has changed. Calculate again to see a current result.', copy: 'Copy result', copying: 'Copying…', copied: 'Current result copied.', copyFailed: 'Copy failed. Open the plain text report below, select the text and copy it manually.',
    downloadFailed: 'The download could not be created. Use the selectable plain text report.', capacity: '8 download links are active. Wait for a link to expire before downloading again (each lasts 30 seconds).', activeDownloads: count => `Active download links: ${count} / 8. Each lasts 30 seconds. Clearing the form revokes links; downloaded files are managed by your browser.`,
    clearConfirm: 'Clearing removes the current form, result and download links. Clear them now?', clear: 'Clear form', cancel: 'Cancel', switch: 'Clear and switch', stay: 'Stay here',
    fail: '表單未能啟用。請重新載入此頁。 / The form could not start. Reload this page.'
  }
};

try {
  const language = document.documentElement.lang;
  if (language !== 'zh-Hant' && language !== 'en') throw new Error('language');
  const t = translations[language];
  const byId = id => document.getElementById(id);
  const work = byId('work'), rows = byId('rows'), target = byId('target');
  const copyButton = byId('copy'), downloadButton = byId('download');
  const template = rows.firstElementChild.cloneNode(true);
  let result = null, report = null, composing = false, rowSequence = 1, confirmation = null, previousFocus = null;
  const effects = createEffects({
    clipboard: navigator.clipboard,
    createURL: blob => URL.createObjectURL(blob), revokeURL: url => URL.revokeObjectURL(url),
    setTimer: (callback, delay) => window.setTimeout(callback, delay), clearTimer: timer => window.clearTimeout(timer), now: () => Date.now(),
    onChange: state => {
      copyButton.disabled = !ready || !report || state.copyState === 'pending';
      downloadButton.disabled = !ready || !report || state.activeDownloads >= 8;
      copyButton.textContent = state.copyState === 'pending' ? t.copying : t.copy;
      byId('copy-note').textContent = state.copyState === 'pending' ? t.copying : state.copyState === 'success' ? t.copied : state.copyState === 'failed' ? t.copyFailed : '';
      if (state.copyState === 'failed') byId('report-details').open = true;
      byId('download-note').textContent = state.activeDownloads >= 8 ? t.capacity : state.activeDownloads ? t.activeDownloads(state.activeDownloads) : '';
    }
  });
  function clearErrors() {
    byId('error-summary').hidden = true;
    byId('error-summary').textContent = '';
    for (const error of form.querySelectorAll('.field-error')) { error.hidden = true; error.textContent = ''; }
    for (const input of form.querySelectorAll('input')) input.removeAttribute('aria-invalid');
  }
  function invalidate(changed = true) {
    result = null; report = null;
    effects.invalidate(); clearErrors();
    byId('result').hidden = true;
    byId('result-values').replaceChildren(); byId('result-status').textContent = '';
    byId('unreachable-note').textContent = '';
    byId('report-text').value = ''; byId('report-details').open = false;
    byId('select-report').disabled = true;
    byId('result-empty').hidden = false; byId('result-empty').textContent = changed ? t.stale : t.empty;
  }
  function totalWeight() {
    let total = 0n;
    for (const input of rows.querySelectorAll('[data-field="weightRaw"]')) {
      if (input.value === '') continue;
      if (input.value.length > 32 || !decimalPattern.test(input.value) || parseHundredths(input.value) > 10000n) { byId('weight-total').textContent = t.invalidTotal; return; }
      total += parseHundredths(input.value);
    }
    byId('weight-total').textContent = `${formatHundredths(total)} / 100.00%`;
  }
  function updateRows() {
    const list = [...rows.children];
    list.forEach((row, index) => {
      const title = row.querySelector('h3');
      title.textContent = `${t.row} ${index + 1}`;
      row.querySelector('[data-remove]').disabled = !ready || list.length <= 1;
      row.querySelector('[data-remove]').setAttribute('aria-label', `${t.remove} ${t.row} ${index + 1}`);
      const raw = row.querySelector('[data-field="scoreRaw"]').value;
      row.querySelector('.score-status').textContent = raw === '' ? t.blank : raw.length <= 32 && decimalPattern.test(raw) && parseHundredths(raw) <= 10000n ? `${t.graded}${formatHundredths(parseHundredths(raw))} / 100` : t.scoreInvalid;
    });
    byId('row-count').textContent = `${list.length} / 40 ${language === 'en' ? 'components' : '項'}`;
    byId('add').disabled = !ready || list.length >= 40;
    byId('row-limit').textContent = list.length >= 40 ? t.limit : '';
    totalWeight();
  }
  function appendRow(values = {}) {
    const row = template.cloneNode(true);
    const id = `row-${++rowSequence}`;
    row.dataset.rowId = id;
    row.querySelector('h3').id = `${id}-title`; row.setAttribute('aria-labelledby', `${id}-title`);
    for (const input of row.querySelectorAll('input')) {
      const field = input.dataset.field;
      input.id = `${id}-${field}`; input.value = values[field] ?? ''; input.removeAttribute('aria-invalid');
      input.setAttribute('aria-describedby', `${field === 'scoreRaw' ? 'score-rule ' : ''}${input.id}-error`);
      const cell = input.closest('.field');
      cell.querySelector('label').htmlFor = input.id;
      const error = cell.querySelector('.field-error'); error.id = `${input.id}-error`; error.hidden = true; error.textContent = '';
      const decimal = cell.querySelector('[data-decimal]');
      if (decimal) { decimal.dataset.decimal = input.id; decimal.disabled = !ready; }
    }
    rows.append(row); updateRows(); return row;
  }
  function blank() {
    invalidate(false); effects.reset();
    target.value = ''; rows.replaceChildren(); appendRow();
    byId('example-note').hidden = true; byId('example-note').textContent = '';
    byId('confirmation').close(); confirmation = null; composing = false;
    totalWeight();
  }
  function requestData() {
    return { targetRaw: target.value, rows: [...rows.children].map(row => ({ id: row.dataset.rowId, nameRaw: row.querySelector('[data-field="nameRaw"]').value, weightRaw: row.querySelector('[data-field="weightRaw"]').value, scoreRaw: row.querySelector('[data-field="scoreRaw"]').value })) };
  }
  function showError(error) {
    const text = t.errors[error.code];
    let label = t.total, input = null, errorElement = byId('rows-error');
    if (error.field === 'targetRaw') { label = t.target; input = target; errorElement = byId('target-error'); }
    else {
      const match = /^rows\.([0-9]+)\.(id|nameRaw|weightRaw|scoreRaw)$/u.exec(error.field);
      if (match) {
        const row = rows.children[Number(match[1])];
        const key = match[2] === 'id' ? 'nameRaw' : match[2];
        input = row.querySelector(`[data-field="${key}"]`); errorElement = byId(`${input.id}-error`);
        label = `${t.row} ${Number(match[1]) + 1} — ${key === 'nameRaw' ? t.name : key === 'weightRaw' ? t.weight : t.score}`;
      }
    }
    errorElement.hidden = false; errorElement.textContent = text;
    if (input) input.setAttribute('aria-invalid', 'true');
    const summary = byId('error-summary'); summary.textContent = `${t.correct}${label}. ${text} (${error.code})`; summary.hidden = false;
    if (input) input.focus(); else summary.focus();
  }
  function measure(label, value) {
    const group = document.createElement('div'); group.className = 'measure';
    const term = document.createElement('dt'), detail = document.createElement('dd');
    term.textContent = label; detail.textContent = value; group.append(term, detail); byId('result-values').append(group);
  }
  submitCalculation = event => {
    if (composing || event.isComposing) return;
    invalidate(false);
    const calculated = calculateTarget(requestData());
    if (!calculated.ok) { showError(calculated.error); return; }
    const built = buildReport(calculated.result, language);
    if (!built.ok) { showError({ code: 'invalid_schema', field: 'request' }); return; }
    result = calculated.result; report = built;
    measure(t.earned, `${result.earnedDisplay} / 100`);
    measure(t.remaining, `${formatHundredths(BigInt(result.remainingWeightBp))}%`);
    if (result.remainingWeightBp === '0') measure(t.final, `${result.earnedDisplay} / 100`);
    else if (result.status === 'target_unreachable') { measure(t.maximum, `${result.maximumPossibleDisplay} / 100`); byId('unreachable-note').textContent = t.unreachable(result.maximumPossibleDisplay); }
    else measure(t.required, `${formatHundredths(BigInt(result.requiredAverageHundredths))} / 100`);
    const status = byId('result-status'); status.textContent = t.statuses[result.status]; status.dataset.tone = result.status === 'target_unreachable' ? 'warning' : result.status === 'complete_missed' ? 'danger' : 'success';
    byId('report-text').value = built.text;
    byId('result').hidden = false; byId('result-empty').hidden = true;
    byId('select-report').disabled = false;
    copyButton.disabled = false; downloadButton.disabled = effects.snapshot().activeDownloads >= 8;
  };
  form.addEventListener('input', event => {
    if (!ready || !(event.target instanceof HTMLInputElement)) return;
    invalidate(); byId('example-note').hidden = true; updateRows();
  });
  form.addEventListener('compositionstart', () => { composing = true; });
  form.addEventListener('compositionend', () => { composing = false; });
  form.addEventListener('click', event => {
    if (!ready) return;
    const decimal = event.target.closest('[data-decimal]');
    if (decimal) {
      const input = byId(decimal.dataset.decimal);
      input.focus();
      const start = input.selectionStart ?? input.value.length, end = input.selectionEnd ?? start;
      input.setRangeText('.', start, end, 'end');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
    const remove = event.target.closest('[data-remove]');
    if (remove && rows.children.length > 1) {
      const row = remove.closest('.grade-row');
      const next = row.nextElementSibling ?? row.previousElementSibling;
      invalidate(); row.remove(); updateRows(); next.querySelector('input').focus();
    }
  });
  byId('add').addEventListener('click', () => { if (rows.children.length >= 40) return; invalidate(); appendRow().querySelector('input').focus(); });
  byId('example').addEventListener('click', () => {
    invalidate(false); target.value = '70'; rows.replaceChildren();
    appendRow({ nameRaw: t.exampleA, weightRaw: '40', scoreRaw: '80' }); appendRow({ nameRaw: t.exampleB, weightRaw: '60', scoreRaw: '' });
    byId('example-note').textContent = t.example; byId('example-note').hidden = false; target.focus();
  });
  function openConfirmation(kind) {
    confirmation = kind; previousFocus = document.activeElement;
    byId('confirmation-text').textContent = kind === 'language' ? '切換語言會清除目前表單和結果。要繼續嗎？ / Changing language clears the current form and result. Continue?' : t.clearConfirm;
    byId('confirmation-cancel').textContent = kind === 'language' ? t.stay : t.cancel;
    byId('confirmation-accept').textContent = kind === 'language' ? t.switch : t.clear;
    byId('confirmation').showModal();
  }
  byId('clear').addEventListener('click', () => {
    const active = effects.snapshot();
    if (result || [...form.querySelectorAll('input')].some(input => input.value !== '') || active.copyState === 'pending' || active.activeDownloads > 0) openConfirmation('clear');
    else { blank(); target.focus(); }
  });
  byId('language').addEventListener('click', () => openConfirmation('language'));
  function cancelConfirmation() { confirmation = null; byId('confirmation').close(); previousFocus?.focus(); }
  byId('confirmation-cancel').addEventListener('click', cancelConfirmation);
  byId('confirmation').addEventListener('cancel', event => { event.preventDefault(); cancelConfirmation(); });
  byId('confirmation-accept').addEventListener('click', () => {
    const kind = confirmation; blank();
    if (kind === 'language') window.location.assign(language === 'en' ? '/index.html' : '/en/index.html');
    else target.focus();
  });
  copyButton.addEventListener('click', () => { if (report) void effects.copy(report.text); });
  byId('select-report').addEventListener('click', () => { byId('report-text').focus(); byId('report-text').select(); });
  downloadButton.addEventListener('click', () => {
    if (!report) return;
    const download = effects.download(new Blob([new TextEncoder().encode(report.text)], { type: report.mimeType }));
    if (!download.ok) { byId('download-note').textContent = download.code === 'capacity' ? t.capacity : t.downloadFailed; return; }
    const anchor = document.createElement('a'); anchor.href = download.url; anchor.download = report.filename;
    document.body.append(anchor); anchor.click(); anchor.remove();
  });
  window.addEventListener('pagehide', blank);
  window.addEventListener('pageshow', event => { if (event.persisted) blank(); });
  // Every listener is registered before any working control is enabled.
  ready = true; work.disabled = false;
  for (const button of document.querySelectorAll('button')) button.disabled = false;
  byId('initialization').hidden = true;
  blank();
} catch {
  ready = false;
  for (const control of document.querySelectorAll('fieldset, button, input, textarea')) control.disabled = true;
  const notice = document.getElementById('initialization'); notice.hidden = false;
  notice.textContent = '表單未能啟用。請重新載入此頁。 / The form could not start. Reload this page.';
}
