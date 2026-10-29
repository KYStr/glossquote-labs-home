// 瀏覽器層只處理目前頁面；使用者資料不寫入網路、儲存或 URL。
import { scheduleTournament, ScheduleError } from './core/schedule.mjs';
import { messages, teamLabel, roundLabel, formatReport } from './i18n.mjs';
const $ = id => document.getElementById(id);
const form = $('scheduler');
// 初始化第一步先阻擋原生表單傳送，最後一步才啟用來源中停用的欄位。
form.addEventListener('submit', event => event.preventDefault());
const language = document.documentElement.lang;
const t = messages[language];
let result = null; // 只有目前成功的一份不可變排程可用於輸出。
let revision = 0; // 輸入、清除及生命週期換代，使舊 Promise 失效。
let copyToken = 0; // 同一結果的新複製也不能由舊 finally 解鎖。
let composing = false;
let downloadURL = null;
let downloadTimer = null;
let clearOpener = null;

function node(tag, text, className = '') {
  const element = document.createElement(tag);
  if (text !== undefined) element.textContent = text; // 不可信隊名僅作文字。
  if (className) element.className = className;
  return element;
}
function clearErrors() {
  $('error-box').hidden = true;
  $('error-text').textContent = '';
  for (const id of ['roster', 'mode']) {
    $(id).removeAttribute('aria-invalid');
    $(id).setAttribute('aria-describedby', `${id}-hint`);
  }
}
function invalidate(announce = true) {
  const hadResult = result !== null;
  revision += 1; copyToken += 1; result = null;
  $('result').hidden = true;
  $('summary').replaceChildren();
  $('rounds').replaceChildren();
  $('team-schedules').replaceChildren();
  $('report').value = '';
  $('copy').disabled = true;
  $('copy').textContent = t.copy;
  $('copy').removeAttribute('aria-busy');
  $('download').disabled = true;
  $('status').textContent = announce && hadResult ? t.changed : t.noResult;
  clearErrors();
  // 已開始的下載有獨立 grace period，不因改輸入提前截斷；新下載已禁用。
}
function revokeDownload() {
  if (downloadTimer !== null) clearTimeout(downloadTimer);
  downloadTimer = null;
  if (downloadURL !== null) URL.revokeObjectURL(downloadURL);
  downloadURL = null;
}
function resetAll(announce = false, discardDownload = false) {
  if (discardDownload) revokeDownload();
  composing = false; invalidate(false);
  $('roster').value = ''; $('mode').value = 'single';
  if ($('clear-dialog').open) $('clear-dialog').close();
  clearOpener = null;
  if (announce) $('status').textContent = t.cleared;
}
function showError(error) {
  const known = error instanceof ScheduleError;
  const code = known ? error.code : 'INTERNAL';
  $('error-text').textContent = (t.errors[code] || t.errors.INTERNAL) + (known && Number.isInteger(error.line) ? ` ${t.line}: ${error.line}.` : '');
  $('error-box').hidden = false;
  const field = known && ['roster', 'mode'].includes(error.field) ? $(error.field) : null;
  if (field) {
    field.setAttribute('aria-invalid', 'true');
    field.setAttribute('aria-describedby', `${error.field}-hint error-text`);
    field.focus();
  } else $('error-box').focus();
}
function render(schedule) {
  for (const [label, value] of [[t.teams, schedule.teams.length], [t.rounds, schedule.rounds.length], [t.matches, schedule.matchCount]]) {
    const metric = node('dl'); metric.append(node('dt', label), node('dd', String(value)));
    $('summary').append(metric);
  }
  for (const round of schedule.rounds) {
    const card = node('article', undefined, 'round-card');
    card.append(node('h4', roundLabel(round.number, language)));
    const list = node('ul');
    for (const pair of round.pairs) list.append(node('li', `${teamLabel(schedule, pair.a)} ${t.versus} ${teamLabel(schedule, pair.b)}`));
    card.append(list);
    if (round.bye !== null) card.append(node('p', `${t.bye}: ${teamLabel(schedule, round.bye)}`, 'bye'));
    $('rounds').append(card);
  }
  for (const team of schedule.teamSchedules) {
    const detail = node('details');
    detail.append(node('summary', teamLabel(schedule, team.id)));
    const fixtures = node('ol');
    for (const fixture of team.fixtures) fixtures.append(node('li', `${roundLabel(fixture.round, language)}: ${fixture.opponent === null ? t.bye : `${t.versus} ${teamLabel(schedule, fixture.opponent)}`}`));
    detail.append(fixtures); $('team-schedules').append(detail);
  }
  $('report').value = formatReport(schedule, language);
  $('result').hidden = false;
  $('copy').disabled = false;
  $('download').disabled = downloadURL !== null;
  $('status').textContent = `${t.ready} ${t.ignored}: ${schedule.ignored}.`;
}
function manualCopy() {
  $('report').focus(); $('report').select();
  $('status').textContent = t.manual;
}
async function copyReport() {
  if (!result || $('copy').disabled) return;
  const snapshot = $('report').value; const generation = revision; const token = ++copyToken;
  const current = () => generation === revision && token === copyToken && result !== null;
  $('copy').disabled = true; $('copy').textContent = t.copying; $('copy').setAttribute('aria-busy', 'true');
  try {
    if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
    await navigator.clipboard.writeText(snapshot); // 僅明確按鈕手勢寫入，不讀原有剪貼簿。
    if (!current()) return;
    $('status').textContent = t.copied;
  } catch {
    if (!current()) return;
    manualCopy(); // 不回顯瀏覽器原始例外。
  } finally {
    if (current()) { $('copy').disabled = false; $('copy').textContent = t.copy; $('copy').removeAttribute('aria-busy'); }
  }
}
function downloadReport() {
  if (!result || $('download').disabled || downloadURL !== null) return;
  let anchor = null;
  try {
    const blob = new Blob([$('report').value], { type: 'text/plain;charset=utf-8' });
    downloadURL = URL.createObjectURL(blob);
    const heldURL = downloadURL;
    anchor = node('a'); anchor.href = heldURL; anchor.download = 'glossquote-tournament-schedule.txt';
    document.body.append(anchor); anchor.click(); anchor.remove(); anchor = null;
    $('download').disabled = true; $('status').textContent = t.downloadStarted;
    downloadTimer = setTimeout(() => {
      if (downloadURL !== heldURL) return; // 已離頁或回收的 callback 完全不碰畫面。
      revokeDownload(); $('download').disabled = result === null;
    }, 60_000);
  } catch {
    anchor?.remove(); revokeDownload(); $('download').disabled = result === null;
    $('status').textContent = t.downloadFailed;
  }
}
function cancelClear() {
  const opener = clearOpener; $('clear-dialog').close(); clearOpener = null;
  opener?.focus(); // 取消保留整份輸入、結果與下載狀態。
}
form.addEventListener('input', () => invalidate());
form.addEventListener('change', () => invalidate());
$('roster').addEventListener('compositionstart', () => { composing = true; invalidate(); });
$('roster').addEventListener('compositionend', () => { composing = false; invalidate(); });
form.addEventListener('submit', () => {
  invalidate(false);
  if (composing) { $('status').textContent = t.compose; $('roster').focus(); return; }
  try {
    result = scheduleTournament({ roster: $('roster').value, mode: $('mode').value });
    render(result);
  } catch (error) { invalidate(false); showError(error); }
});
$('example').addEventListener('click', () => {
  composing = false; invalidate(false); $('roster').value = t.example; $('mode').value = 'single';
  $('status').textContent = t.sampleLoaded; $('roster').focus();
});
$('clear').addEventListener('click', () => {
  if (!$('roster').value && $('mode').value === 'single' && !result) { resetAll(true); $('roster').focus(); return; }
  clearOpener = $('clear');
  if (typeof $('clear-dialog').showModal === 'function') { $('clear-dialog').showModal(); $('cancel-clear').focus(); }
  else if (window.confirm(t.clearPrompt)) { resetAll(true); $('roster').focus(); }
  else { clearOpener.focus(); clearOpener = null; }
});
$('cancel-clear').addEventListener('click', cancelClear);
$('clear-dialog').addEventListener('cancel', event => { event.preventDefault(); cancelClear(); });
$('confirm-clear').addEventListener('click', () => { resetAll(true); $('roster').focus(); });
$('copy').addEventListener('click', copyReport);
$('download').addEventListener('click', downloadReport);
$('language-link').addEventListener('click', () => resetAll(false, true));
window.addEventListener('pagehide', () => { resetAll(false, true); $('status').textContent = ''; });
window.addEventListener('pageshow', event => { if (event.persisted) resetAll(false, true); });
resetAll();
$('init-status').hidden = true;
$('editor').disabled = false;
$('calculate').disabled = false;
