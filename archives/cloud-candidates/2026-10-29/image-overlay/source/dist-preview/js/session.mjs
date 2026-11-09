// 將像素核心與非同步狀態隔離，測試可以注入可控解碼器。
import { LIMITS, inspectImage, checkDimensions, checkPair, checkSettings, renderPixels } from './core/images.mjs';
// 僅將已知錯誤代碼送往雙語介面。
const codes = new Set(['EMPTY', 'FILE_SIZE', 'DIMENSIONS', 'CORRUPT', 'FORMAT', 'COUNT', 'MISMATCH', 'NEED_TWO', 'SETTINGS', 'CANCELLED', 'DECODE', 'RENDER']);
export function createSession({ decode, render = renderPixels, onChange = () => {} }) {
  let sources = [null, null], result = null, settings = { mode: 'overlay', opacity: 50 };
  let status = 'idle', code = null, active = null, pending = null, pumping = false, disposed = false, settingsValid = true;
  // 工作使用物件身分而不是可溢位的序號；最新工作才有提交權。
  let owner = null;
  const current = job => !disposed && owner === job && !job.cancelled;
  const snapshot = () => ({ status, code, settings: { ...settings }, sources: sources.map(source => source ? { name: source.name, width: source.width, height: source.height, size: source.size } : null), result });
  const emit = () => { if (!disposed) onChange(snapshot()); };
  const pairCode = () => { try { checkPair(...sources); return null; } catch (error) { return error.message; } };
  // 取消立即解決呼叫端承諾，原生解碼仍在同一條工作列完成並釋放。
  function invalidate() {
    for (const job of [active, pending]) if (job) { job.cancelled = true; job.finish({ ok: false, code: 'CANCELLED' }); }
    pending = null; owner = null; result = null;
  }
  function settleReady() {
    code = sources.every(Boolean) ? pairCode() : null;
    status = code ? 'error' : sources.some(Boolean) ? 'ready' : 'idle';
  }
  async function execute(job) {
    if (job.kind === 'load') {
      // 讀取後再次核對大小，禁止假的 File 介面繞過前置限制。
      const buffer = await job.file.arrayBuffer();
      if (!current(job)) return;
      if (!(buffer instanceof ArrayBuffer) || buffer.byteLength !== job.file.size) throw Error('CORRUPT');
      const bytes = new Uint8Array(buffer), header = inspectImage(bytes);
      const frame = await decode(bytes, header, () => current(job));
      if (!current(job)) return;
      checkDimensions(frame?.width, frame?.height);
      // EXIF 可以交換寬高，但不得改變像素總量或任意變換尺寸。
      if (!(frame.width === header.width && frame.height === header.height || frame.width === header.height && frame.height === header.width)) throw Error('CORRUPT');
      if (!(frame.data instanceof Uint8ClampedArray) || frame.data.length !== frame.width * frame.height * 4) throw Error('CORRUPT');
      sources[job.slot] = { ...frame, name: typeof job.file.name === 'string' ? job.file.name : '', size: job.file.size };
      settleReady();
    } else {
      // 工作開始時擷取目前來源與設定；中途更改只會取消，不會混合版本。
      const frame = await render(sources[0], sources[1], { ...settings }, () => current(job));
      if (!current(job)) return;
      const shape = checkPair(...sources);
      if (!frame || frame.width !== shape.width || frame.height !== shape.height || !(frame.data instanceof Uint8ClampedArray) || frame.data.length !== shape.width * shape.height * 4) throw Error('RENDER');
      result = frame; status = 'success'; code = null;
    }
    if (current(job)) { job.finish({ ok: !code, code }); emit(); }
  }
  // 同時最多一個原生工作及一個待執行工作；反覆取消不會堆積解碼器。
  async function pump() {
    if (pumping) return;
    pumping = true;
    try {
      while (pending) {
        const job = pending; pending = null; active = job;
        try { if (current(job)) await execute(job); }
        catch (error) {
          if (current(job)) {
            result = null; status = 'error'; code = codes.has(error?.message) ? error.message : job.kind === 'load' ? 'DECODE' : 'RENDER';
            job.finish({ ok: false, code }); emit();
          }
        } finally { if (active === job) active = null; }
      }
    } finally { pumping = false; }
  }
  function enqueue(details) {
    let finish;
    const promise = new Promise(resolve => { finish = resolve; });
    const job = { ...details, finish, cancelled: false };
    owner = job; pending = job; status = job.kind === 'load' ? 'loading' : 'rendering'; code = null;
    emit(); void pump(); return promise;
  }
  async function select(slot, files) {
    if (disposed) return { ok: false, code: 'CANCELLED' };
    if (![0, 1].includes(slot)) return { ok: false, code: 'SETTINGS' };
    invalidate(); sources[slot] = null;
    const file = files?.length === 1 ? files[0] : null;
    code = !file ? 'COUNT' : !Number.isSafeInteger(file.size) || file.size < 0 || typeof file.arrayBuffer !== 'function' ? 'FORMAT' : file.size === 0 ? 'EMPTY' : file.size > LIMITS.bytes ? 'FILE_SIZE' : null;
    if (code) { status = 'error'; emit(); return { ok: false, code }; }
    return enqueue({ kind: 'load', slot, file });
  }
  function update(changes) {
    if (disposed) return false;
    invalidate();
    try {
      if (!changes || Object.keys(changes).some(key => !['mode', 'opacity'].includes(key))) throw Error('SETTINGS');
      settings = checkSettings({ ...settings, ...changes }); settingsValid = true; settleReady(); emit(); return true;
    } catch { settingsValid = false; code = 'SETTINGS'; status = 'error'; emit(); return false; }
  }
  async function generate() {
    if (disposed) return { ok: false, code: 'CANCELLED' };
    invalidate(); code = settingsValid ? pairCode() : 'SETTINGS';
    if (code) { status = 'error'; emit(); return { ok: false, code }; }
    return enqueue({ kind: 'render' });
  }
  function cancel() { if (disposed) return; invalidate(); settleReady(); code = 'CANCELLED'; emit(); }
  function clear() { if (disposed) return; invalidate(); sources = [null, null]; settings = { mode: 'overlay', opacity: 50 }; settingsValid = true; status = 'idle'; code = null; emit(); }
  // 離開頁面時不再接受新工作，也不保留已完成的大型像素陣列。
  function dispose() { clear(); disposed = true; }
  return { select, update, generate, cancel, clear, dispose, snapshot };
}
