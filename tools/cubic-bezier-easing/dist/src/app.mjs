import {FIELDS, TIMES, numeric, percent, decimal} from './core.mjs'; // 呈現只消費純核心的有效資料。
import {createController} from './controller.mjs'; // 播放與複製代數集中管理。
import {messages} from './messages.mjs'; // 靜態語言頁選擇完整固定詞典。
const lang = document.documentElement.lang === 'en' ? 'en' : 'zh'; // 不由網址或外部輸入決定可執行內容。
const words = messages[lang]; // 當頁詞典不跨頁持久化。
const byId = id => document.getElementById(id); // 僅用原始碼中的固定識別碼。
const controls = Object.fromEntries(['generate', 'clear', 'play', 'pause', 'continue', 'stop', 'copy', ...FIELDS].map(id => [id, byId(id)])); // 收集唯一控制節點。
const result = byId('result'), empty = byId('empty'), plot = byId('plot'), samples = byId('samples'); // 固定結果容器不接受任意 HTML。
const radios = [...document.querySelectorAll('input[name=time]')]; // 原生九時刻 radio 保留方向鍵行為。
const motion = typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-reduced-motion: reduce)') : Object.assign(new EventTarget(), {matches: false, unavailable: true}); // 系統減動是不可覆寫的輸入。
const cleanup = []; // 統一追蹤所有註冊的監聽器。
let rendered = null, controller = null; // 首次 render 不依賴尚未完成建立的控制器。
function listen(target, type, handler) { // 每個事件都有對稱清理入口。
  target.addEventListener(type, handler); cleanup.push(() => target.removeEventListener(type, handler)); // 不重複累積事件監聽。
} // 結束監聽登記。
function svg(tag, attributes, text = '') { // 只建立白名單 SVG 元素與屬性。
  if (!['line', 'text', 'polyline'].includes(tag)) throw new Error('SVG tag'); // 禁止可執行或外部引用元素。
  const node = document.createElementNS('http://www.w3.org/2000/svg', tag); // 固定 SVG namespace。
  for (const [name, value] of Object.entries(attributes)) { // 屬性由內部已驗證資料組合。
    if (!['x1', 'y1', 'x2', 'y2', 'x', 'y', 'class', 'text-anchor', 'points'].includes(name)) throw new Error('SVG attribute'); // 不開放 href/style/event 屬性。
    if (typeof value === 'number' && !Number.isFinite(value)) throw new Error('SVG finite'); // 防止非有限幾何進入 DOM。
    node.setAttribute(name, String(value)); // 僅寫入白名單資料。
  } // 結束屬性寫入。
  node.textContent = text; return node; // 文本一律使用安全文字 sink。
} // 結束 SVG 建立。
function draw(snapshot) { // 只在有效快照更換時重建圖表。
  plot.replaceChildren(); samples.replaceChildren(); // 不保留舊圖表內容。
  for (const y of [-1, 0, 1, 2]) { // 固定進度域與零一參考線。
    const screen = 20 + 330 * (2 - y) / 3; // 與規格相同的圖座標映射。
    plot.append(svg('line', {x1: 40, x2: 600, y1: screen, y2: screen, class: y === 0 || y === 1 ? 'reference' : 'grid-line'}), svg('text', {x: 34, y: screen + 5, 'text-anchor': 'end'}, String(y))); // 虛線與數字共同表達參考值。
  } // 結束四個橫向參考。
  for (const x of [0, .25, .5, .75, 1]) { // 固定五個時間軸標籤。
    const screen = 40 + 560 * x; // 時間永遠使用零至一範圍。
    plot.append(svg('line', {x1: screen, x2: screen, y1: 20, y2: 350, class: 'grid-line'}), svg('text', {x: screen, y: 378, 'text-anchor': 'middle'}, String(x))); // 文字標籤避免只靠格線推測。
  } // 結束時間刻度。
  const points = snapshot.points.map(p => { const x = 40 + 560 * numeric(p.x), y = 20 + 330 * (2 - numeric(p.y)) / 3; if (!Number.isFinite(x) || !Number.isFinite(y)) throw new Error('Plot finite'); return `${x},${y}`; }).join(' '); // 有界二百五十七點數值序列。
  plot.append(svg('polyline', {class: 'curve-line', points})); // 單一實線不使用路徑字串注入。
  for (const row of snapshot.samples) { // 表格與曲線共用快照。
    const tr = document.createElement('tr'), time = document.createElement('td'), value = document.createElement('td'), linear = document.createElement('td'); // 建立時間、曲線與線性三個語義表欄。
    time.textContent = `${row.q / 10000}%`; value.textContent = percent(row.y); linear.textContent = percent({n: BigInt(row.q), d: 1000000n}); tr.append(time, value, linear); samples.append(tr); // 進度保留正負及超過百分之百。
  } // 結束九列表格。
  byId('summary').textContent = `${words.snapshot}: ${FIELDS.map(k => `${k}=${decimal(snapshot.values[k])}`).join(' · ')}`; // 摘要使用已解析值而非 raw。
  byId('css').value = snapshot.css; // readonly textarea 保存精確 LF 宣告。
} // 結束有效結果呈現。
function render(state, event) { // 所有呈現由控制器狀態衍生。
  const active = document.activeElement; // 先記錄失效前的焦點位置。
  if (event.invalidate && !event.noFocus && result.contains(active)) controls.generate.focus(); // 撤結果前移出將隱藏的控制。
  if (event.clear) for (const field of FIELDS) controls[field].value = ''; // 清除才改 raw；普通失效不動使用者字串。
  byId('reduced').checked = state.localReduced; // 本地偏好與系統偏好分開呈現。
  byId('reduced-reason').textContent = state.systemReduced ? words.system : state.localReduced ? words.local : words.normal; if (motion.unavailable) byId('reduced-reason').textContent += ` ${words.systemUnavailable}`; // 明示減動原因。
  for (const field of FIELDS) { // 只顯示目前首錯並清除舊錯。
    const invalid = state.error?.field === field; controls[field].setAttribute('aria-invalid', String(invalid)); // 可及性狀態同步。
    byId(`${field}-error`).textContent = invalid ? `${field}: ${words.errors[state.error.code]}` : ''; // 首錯文字不解析成 HTML。
  } // 結束欄位錯誤更新。
  result.hidden = !state.result; empty.hidden = Boolean(state.result); // 無有效快照時整個結果不可互動。
  if (state.result !== rendered) { // 不在每幀重建靜態 DOM。
    rendered = state.result; if (rendered) draw(rendered); else { plot.replaceChildren(); samples.replaceChildren(); byId('css').value = ''; byId('summary').textContent = ''; byId('position').textContent = ''; } // 失效真的清除舊內容。
  } // 結束靜態快照更新。
  const disabled = {play: !state.result || state.reduced || !state.geometry || state.phase === 'playing', pause: state.phase !== 'playing', continue: state.phase !== 'paused' || state.reduced || !state.geometry, stop: !['playing', 'paused', 'finished'].includes(state.phase), copy: !state.result || state.copy === 'pending'}; // 控制可用性與狀態一致。
  let focus = event.focus; // 明確使用者動作才指定焦點。
  if ((event.reducedStop || event.geometryStop) && ['play', 'pause', 'continue', 'stop'].some(id => controls[id] === active)) focus = 'radio'; // 停動態時避免焦點遺落停用按鈕。
  if (event.completed && (active === controls.pause || active === controls.continue)) focus = 'play'; // 自然完成移離即將停用的控制。
  if (event.copy && state.copy === 'pending' && active === controls.copy) focus = 'css'; // 複製待決仍可手動選取輸出。
  if (focus === 'radio') radios.find(r => r.checked)?.focus(); else if (focus) { const target = byId(focus); if (target) { target.disabled = false; target.focus(); } } // 先啟用目標並移焦再停用原控制。
  for (const [id, value] of Object.entries(disabled)) controls[id].disabled = value; // 焦點轉移後才套用停用狀態。
  if (state.result) { // 有效結果才定位兩個軌道標記。
    const progress = numeric(state.y), linear = state.q / 1000000; // 呈現邊界轉成有限浮點值。
    const lx = 12 + (linear + 1) / 3 * 576, cx = 12 + (progress + 1) / 3 * 576; // 軌道共用負一至二域與標記半徑留白。
    if (Number.isFinite(lx) && Number.isFinite(cx)) { byId('linear-marker').setAttribute('cx', String(lx)); byId('curve-marker').setAttribute('points', `${cx},14 ${cx + 10},24 ${cx},34 ${cx - 10},24`); } // 不截斷負值或超越終點。
    byId('position').textContent = `${words.time}: ${state.q / 10000}% · ${words.progress}: ${percent(state.y)}`; // 每幀文字不置於 live region。
    for (const radio of radios) radio.checked = Number(radio.value) === state.q; // 播放起始回零，靜態選取保留對應時刻。
  } // 結束動態位置呈現。
  if (!event.frame && !event.quiet) { // 只宣告有限狀態轉換與明確選取。
    byId('status').textContent = state.error ? `${state.error.field || ''} ${words.errors[state.error.code]}`.trim() : state.message === 'selected' ? `${words.selected}: ${byId('position').textContent}` : words[state.message]; // 錯誤、靜態觀察與生命週期完整雙語。
    byId('copy-status').textContent = words.copy[state.copy]; // 不用額外計時器清成功訊息。
  } // 結束非每幀宣告。
} // 結束安全呈現器。
controller = createController({hidden: () => document.hidden, systemReduced: motion.matches, now: () => performance.now(), frame: cb => requestAnimationFrame(cb), cancelFrame: id => cancelAnimationFrame(id), setTimer: (cb, ms) => setTimeout(cb, ms), clearTimer: id => clearTimeout(id), writeText: typeof navigator.clipboard?.writeText === 'function' ? text => navigator.clipboard.writeText(text) : undefined, render}); // 注入唯一瀏覽器能力，從不讀剪貼簿。
function geometry() { // 正常佈局讀取只檢查軌道可用性。
  if (!controller.get().result || document.hidden) return; // 空結果或隱藏頁面不量測。
  const box = byId('tracks').getBoundingClientRect(); controller.geometry(Number.isFinite(box.width) && Number.isFinite(box.height) && box.width > 0 && box.height > 0); // 非正幾何停止動畫但保留結果。
} // 結束幾何檢查。
listen(byId('form'), 'submit', event => { event.preventDefault(); if (controller.generate(Object.fromEntries(FIELDS.map(k => [k, controls[k].value])))) geometry(); }); // 表單 Enter 與按鈕共用一次產生。
listen(byId('form'), 'keydown', event => { if (event.key === 'Enter' && (event.isComposing || event.keyCode === 229)) event.preventDefault(); }); // 組字 Enter 不觸發隱式提交。
for (const field of FIELDS) { // 四欄使用相同失效契約。
  listen(controls[field], 'input', () => controller.edit()); listen(controls[field], 'compositionstart', () => controller.compositionStart()); listen(controls[field], 'compositionend', () => controller.compositionEnd()); // 組字結束不自動重算。
} // 結束欄位事件。
listen(controls.clear, 'click', () => controller.clear()); // 清除不導航、不確認也不保存。
listen(controls.play, 'click', () => { geometry(); controller.play(); }); // 播放前核正常佈局。
listen(controls.pause, 'click', () => controller.pause()); listen(controls.continue, 'click', () => { geometry(); controller.resume(); }); listen(controls.stop, 'click', () => controller.stop()); // 播放控制各自對應唯一動作。
listen(controls.copy, 'click', () => controller.copy()); // 剪貼簿寫入只有此明確 click 路徑。
for (const radio of radios) listen(radio, 'change', () => { if (radio.checked) controller.select(Number(radio.value)); }); // 保留原生 radio 鍵盤操作。
listen(byId('reduced'), 'change', () => controller.reduced(byId('reduced').checked, motion.matches)); // 本地切換不覆寫系統要求。
listen(motion, 'change', () => controller.reduced(byId('reduced').checked, motion.matches)); // 系統偏好動態更新。
listen(document, 'visibilitychange', () => { if (document.hidden) controller.leave(); else controller.reduced(byId('reduced').checked, motion.matches); }); // 隱藏即撤銷，回來不產生。
listen(window, 'pagehide', () => controller.leave()); listen(window, 'pageshow', () => controller.returnPage()); // BFCache 與一般 pageshow 一律清有效結果。
listen(window, 'resize', geometry); // 正常重排不重啟播放或修改曲線。
export function dispose() { controller.dispose(); for (const remove of cleanup.splice(0)) remove(); } // 明確釋放全部監聽器與非同步權限。
