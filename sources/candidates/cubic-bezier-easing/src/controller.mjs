import {parse, snapshot, solve, TIMES} from './core.mjs'; // 純核心不接觸瀏覽器權限。
export function createController(io) { // 所有時間與外部能力皆由轉接器注入。
  let state = {phase: 'draft', result: null, error: null, q: 0, y: null, elapsed: 0, localReduced: false, systemReduced: Boolean(io.systemReduced), copy: 'idle', message: 'initial', geometry: true}; // 初始不自動產生結果。
  let resultEpoch = 0, playEpoch = 0, copyEpoch = 0; // 三組單調代數隔離各類舊回呼。
  let raf = null, timer = null, segmentStart = 0, accumulated = 0, disposed = false, composing = false; // 最多保存一個 RAF 與一個期限計時器。
  const available = () => !disposed && !io.hidden(); // 每個操作先拒絕隱藏或已銷毀頁面。
  const reduced = () => state.localReduced || state.systemReduced; // 系統減動不能被本地覆寫。
  const view = () => Object.freeze({...state, reduced: reduced(), resultEpoch, playEpoch, copyEpoch}); // 對外提供唯讀狀態淺快照。
  const emit = (event = {}) => io.render(view(), event); // 呈現器自行處理安全 DOM 與焦點。
  function cancelPlay() { // 先失效代數再取消排程。
    playEpoch += 1; // 已排入執行佇列的舊回呼也會失效。
    if (raf !== null) io.cancelFrame(raf); // 只取消目前唯一 RAF。
    raf = null; // 釋放排程識別。
  } // 結束播放取消。
  function cancelCopy() { // 清除複製提示的非同步權限，不能撤回 OS 寫入。
    copyEpoch += 1; // 舊 promise 不得更新新結果。
    if (timer !== null) io.clearTimer(timer); // 清除唯一期限計時器。
    timer = null; state.copy = 'idle'; // 恢復可再次明確操作的狀態。
  } // 結束複製取消。
  function invalidate(message, event = {}) { // 所有失效入口共用同一取消順序。
    resultEpoch += 1; cancelPlay(); cancelCopy(); // 必須先取消後清結果。
    accumulated = 0; // 丟棄前一段播放時間。
    state = {...state, phase: 'draft', result: null, error: null, q: 0, y: null, elapsed: 0, message}; // 不保留圖表或 CSS。
    emit({invalidate: true, ...event}); // 呈現器只在結果內持焦時移回產生。
  } // 結束失效處理。
  function position(q) { // 更新觀察位置而不修改有效快照。
    state.q = q; state.y = solve(state.result.values, q); // 曲線進度不截斷超界值。
  } // 結束位置更新。
  function updateTime() { // 使用單調鐘計算有效累積時間。
    state.elapsed = Math.max(0, Math.min(2000, accumulated + io.now() - segmentStart)); // 暫停間隔不納入累積。
    position(state.elapsed >= 2000 ? 1000000 : Math.floor(state.elapsed / 2000 * 1000000)); // 完成端點固定為一百萬。
  } // 結束時間換算。
  function schedule() { // 捕捉目前播放與結果代數。
    const pe = playEpoch, re = resultEpoch, result = state.result; // 舊曲線或舊播放不能復活。
    raf = io.frame(() => { // 不依賴回呼參數與注入鐘混用。
      if (!available() || pe !== playEpoch || re !== resultEpoch || result !== state.result || state.phase !== 'playing') return; // 回呼入口驗證全部有效條件。
      raf = null; updateTime(); // 消費本次 RAF 後才安排下一個。
      if (state.elapsed === 2000) { state.phase = 'finished'; state.message = 'finished'; emit({announce: true, completed: true}); } // 完成精確定位並只宣告一次。
      else { emit({frame: true}); schedule(); } // 每幀不更新 aria-live 或焦點。
    }); // 結束唯一 RAF 回呼。
  } // 結束排程。
  function begin() { // 從已設定的累積時間啟動單段播放。
    cancelPlay(); segmentStart = io.now(); state.phase = 'playing'; state.message = 'playing'; // 播放前取消任何舊回呼。
    emit({focus: 'pause', announce: true}); schedule(); // 焦點先移至即將可用的暫停控制。
  } // 結束播放起始。
  const api = { // 公開控制器僅暴露有界使用者操作。
    get: view, // 測試與轉接器讀狀態不取得可變內部物件。
    generate(raw) { // 明確產生才解析四欄。
      if (!available() || composing) return false; // 隱藏或組字時不接受產生。
      invalidate('changed', {quiet: true}); const parsed = parse(raw); // 先撤銷舊非同步工作。
      if (parsed.error) { state.phase = 'invalid'; state.error = parsed.error; state.message = 'invalid'; emit({focus: parsed.error.field || 'generate', announce: true}); return false; } // 首錯關聯與移焦交給安全呈現器。
      state.result = snapshot(parsed.values); state.phase = 'valid-idle'; state.message = 'generated'; position(0); // 建立唯一凍結結果。
      emit({focus: 'generate', announce: true}); return true; // 成功保持產生按鈕焦點。
    }, // 結束產生。
    edit() { if (available()) invalidate('changed'); }, // 輸入變動立即撤結果並清舊錯。
    compositionStart() { if (available()) { composing = true; invalidate('changed'); } }, // 組字開始即失效。
    compositionEnd() { composing = false; }, // 組字結束本身不產生。
    clear() { if (available()) { composing = false; state.localReduced = false; invalidate('cleared', {clear: true, focus: 'x1', announce: true}); } }, // 清除不需要確認並保留系統偏好。
    play() { // 明確播放永遠從零開始。
      if (!available() || !state.result || reduced() || !state.geometry || state.phase === 'playing') return; // 動態不可用時拒絕啟動。
      accumulated = 0; state.elapsed = 0; position(0); begin(); // 不沿用靜態 radio 的位置。
    }, // 結束播放。
    pause() { // 暫停保存當下單調鐘位置。
      if (!available() || state.phase !== 'playing') return; // 不接受重複暫停。
      updateTime(); accumulated = state.elapsed; cancelPlay(); // 先計入本段再取消 RAF。
      state.phase = state.elapsed === 2000 ? 'finished' : 'paused'; state.message = state.phase; // 到期不留下假暫停狀態。
      emit({focus: state.phase === 'paused' ? 'continue' : 'play', announce: true}); // 避免焦點留在即將 disabled 的按鈕。
    }, // 結束暫停。
    resume() { if (available() && state.result && state.phase === 'paused' && !reduced() && state.geometry) begin(); }, // 繼續只跑剩餘時間。
    stop() { // 停止保留快照並歸零。
      if (!available() || !state.result) return; // 無有效結果時沒有動作。
      cancelPlay(); accumulated = 0; state.elapsed = 0; position(0); state.phase = 'valid-idle'; state.message = 'stopped'; emit({focus: 'play', announce: true}); // 回到靜態零位置。
    }, // 結束停止。
    select(q) { // 原生 radio 提供固定九個觀察點。
      if (!available() || !state.result || !TIMES.includes(q)) return; // 拒絕未宣告時間。
      cancelPlay(); accumulated = 0; state.elapsed = 0; position(q); state.phase = 'valid-idle'; state.message = 'selected'; emit({announce: true}); // 靜態選擇不改 CSS。
    }, // 結束時刻選取。
    reduced(local, system = state.systemReduced) { // 本地與系統狀態各自保留。
      if (!available()) return; state.localReduced = Boolean(local); state.systemReduced = Boolean(system); // 不寫持久化設定。
      if (reduced() && state.result) { cancelPlay(); accumulated = 0; state.elapsed = 0; position(0); state.phase = 'valid-idle'; state.message = 'reduced'; emit({reducedStop: true, announce: true}); } // 減動只停止播放而不取消複製。
      else emit({announce: true}); // 解除減動不自動播放。
    }, // 結束減動切換。
    geometry(valid) { // 無有效幾何時禁止動畫而保留數字與 CSS。
      if (!available()) return; state.geometry = Boolean(valid); // 只接收呈現器已檢查的布林值。
      if (!valid && state.result) { cancelPlay(); state.phase = 'valid-idle'; state.message = 'geometry'; emit({geometryStop: true, announce: true}); } // 不靠縮放自動重啟。
      else emit({geometry: true}); // 正常重排不改數學或時間。
    }, // 結束幾何狀態。
    copy() { // 只能由明確 click 轉接器呼叫。
      if (!available() || !state.result || state.copy === 'pending') return; // 防止隱藏或重複寫入。
      cancelCopy(); const ce = copyEpoch, re = resultEpoch, result = state.result, started = io.now(); // 本次複製固定同一快照與起點。
      const current = () => available() && ce === copyEpoch && re === resultEpoch && result === state.result && state.copy === 'pending'; // 所有非同步結算使用同一守衛。
      const settle = success => { if (!current()) return; if (timer !== null) io.clearTimer(timer); timer = null; state.copy = success && io.now() - started < 3000 ? 'success' : 'fallback'; emit({copy: true, announce: true}); }; // 到期瞬間不可判成功。
      state.copy = 'pending'; emit({copy: true, announce: true}); // 先禁用重複操作。
      if (typeof io.writeText !== 'function') { settle(false); return; } // 缺能力只給手動備援。
      timer = io.setTimer(() => settle(false), 3000); // 唯一固定三秒期限計時器。
      try { Promise.resolve(io.writeText(result.css)).then(() => settle(true), () => settle(false)); } catch { settle(false); } // 同步拒絕與 promise 拒絕都不冒成功。
    }, // 結束複製。
    leave() { if (!disposed) invalidate('returned'); }, // hidden/pagehide 保留 raw 但撤所有結果。
    returnPage() { if (!disposed) { composing = false; invalidate('returned', {noFocus: true}); } }, // 每次 pageshow 都要求重新產生。
    dispose() { if (!disposed) { invalidate('returned', {noFocus: true}); disposed = true; } }, // 取消全部工作後永久關閉入口。
  }; // 結束公開介面。
  emit({initial: true}); return Object.freeze(api); // 首次呈現空結果並返回唯讀介面。
} // 結束控制器建立。
