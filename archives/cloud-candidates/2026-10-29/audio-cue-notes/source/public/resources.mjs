// 資源層以注入式介面測試競態，不在核心中依賴原生瀏覽器。
import { durationToMs, validateFile } from './core.mjs';
// 最多保留目前音檔與一個候選；新候選成功前不銷毀舊工作。
export function createAudioSession(env, onReady, onError) {
  let current = null;
  let pending = null;
  let generation = 0;
  // 清理順序先隔離事件，再停止播放及釋放 object URL。
  const release = item => {
    if (!item) return;
    item.active = false;
    env.clearTimeout(item.timer);
    item.audio.removeEventListener('loadedmetadata', item.ready);
    item.audio.removeEventListener('error', item.error);
    item.audio.pause();
    item.audio.removeAttribute('src');
    item.audio.load();
    if (item.url !== null) env.revokeObjectURL(item.url);
  };
  const api = {
    load(file) {
      // 驗證失敗不碰既有或待載音檔。
      validateFile({ size: file.size, type: file.type, name: file.name });
      generation += 1;
      release(pending);
      pending = null;
      const epoch = generation;
      const audio = env.createAudio();
      const item = { audio, url: null, timer: null, active: true, ready: null, error: null };
      const isPending = () => item.active && generation === epoch && pending === item;
      const failed = code => {
        if (!isPending()) return;
        pending = null;
        release(item);
        onError(code);
      };
      item.error = () => {
        // 成功載入後的解碼錯誤也須回報，但不刪除使用者筆記。
        if (current === item && item.active) { audio.pause(); onError('PLAYBACK'); return; }
        failed('AUDIO');
      };
      item.ready = () => {
        if (!isPending()) return;
        let durationMs;
        try { durationMs = durationToMs(audio.duration); } catch { failed('DURATION'); return; }
        env.clearTimeout(item.timer);
        release(current);
        current = item;
        pending = null;
        onReady(audio, durationMs);
      };
      pending = item;
      try {
        item.url = env.createObjectURL(file);
        audio.addEventListener('loadedmetadata', item.ready);
        audio.addEventListener('error', item.error);
        audio.preload = 'metadata';
        audio.src = item.url;
        item.timer = env.setTimeout(() => failed('TIMEOUT'), 15000);
        audio.load();
      } catch { failed('AUDIO'); }
    },
    // 離頁、清除、BFCache 還原均使所有舊 callback 失效。
    cancelPending() { generation += 1; release(pending); pending = null; },
    clear() { generation += 1; release(pending); release(current); pending = null; current = null; },
    get audio() { return current?.audio ?? null; },
    get loading() { return pending !== null; },
  };
  return api;
}
// 下載資源延後回收，最多八個並行，避免過早撤銷或無界累積。
export function createDownloads(env) {
  const entries = new Map();
  const release = url => {
    if (!entries.has(url)) return;
    env.clearTimeout(entries.get(url));
    entries.delete(url);
    env.revokeObjectURL(url);
  };
  return {
    start(text, kind) {
      if (!['txt', 'json'].includes(kind) || typeof text !== 'string') throw new Error('EXPORT');
      if (entries.size >= 8) throw new Error('DOWNLOAD_LIMIT');
      let url;
      try {
        url = env.createObjectURL(new Blob([text], { type: kind === 'txt' ? 'text/plain;charset=utf-8' : 'application/json;charset=utf-8' }));
        entries.set(url, env.setTimeout(() => release(url), 60000));
        env.clickDownload(url, `glossquote-audio-notes.${kind}`);
      } catch {
        release(url);
        throw new Error('DOWNLOAD');
      }
    },
    clear() { for (const url of entries.keys()) release(url); },
    get size() { return entries.size; },
  };
}
