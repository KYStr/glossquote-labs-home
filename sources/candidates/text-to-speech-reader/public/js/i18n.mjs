// UI dictionaries for the Text-to-Speech Reader.
// Error messages are keyed by the core module's error codes; both
// languages carry the same keys (the project check enforces parity).

export const DICTIONARIES = Object.freeze({
  "zh-Hant": Object.freeze({
    errors: Object.freeze({
      EMPTY_TEXT: "沒有可朗讀的文字，請先輸入或貼上文字。",
      TEXT_TOO_LONG: "文字長度上限為 {limit} 個字元（Unicode 碼點），請縮短後再朗讀。",
      FILE_DECODE: "這個檔案無法以 UTF-8 解碼，請將檔案另存為 UTF-8 編碼後再試。",
    }),
    ui: Object.freeze({
      LOCAL: "本機",
      NETWORK: "網路",
      VOICES_LOADING: "正在載入聲音清單…",
      VOICES_NONE: "這個瀏覽器目前沒有提供任何聲音。",
      NETWORK_NOTICE:
        "你選的是網路聲音：以這個聲音朗讀時，文字會傳送給該聲音的提供者。本工具本身不會把文字傳到任何地方。",
      PROGRESS: "第 {current} 句，共 {total} 句 · 已朗讀 {percent}%",
      PROGRESS_IDLE: "尚未開始朗讀",
      ANNOUNCE_PLAYING: "正在朗讀：第 {current} 句，共 {total} 句。",
      ANNOUNCE_PAUSED: "已暫停：第 {current} 句，共 {total} 句。",
      ANNOUNCE_FINISHED: "朗讀完成：共 {total} 句。",
      ANNOUNCE_STOPPED: "已停止朗讀。",
      UTTERANCE_ERROR:
        "朗讀時發生錯誤（{name}）。已停止朗讀，請改選另一個聲音再試一次。",
      CLEARED: "已清除文字。",
      CHAR_COUNT: "{count} / 20000 字元",
    }),
  }),
  en: Object.freeze({
    errors: Object.freeze({
      EMPTY_TEXT: "There is no text to read. Type or paste some text first.",
      TEXT_TOO_LONG:
        "The text limit is {limit} characters (Unicode code points). Shorten the text and try again.",
      FILE_DECODE:
        "This file could not be decoded as UTF-8. Re-save it with UTF-8 encoding and try again.",
    }),
    ui: Object.freeze({
      LOCAL: "local",
      NETWORK: "network",
      VOICES_LOADING: "Loading the voice list…",
      VOICES_NONE: "This browser currently offers no voices.",
      NETWORK_NOTICE:
        "You picked a network voice: when this voice reads, the text is sent to that voice's provider. The tool itself sends your text nowhere.",
      PROGRESS: "Sentence {current} of {total} · {percent}% read",
      PROGRESS_IDLE: "Not started",
      ANNOUNCE_PLAYING: "Playing: sentence {current} of {total}.",
      ANNOUNCE_PAUSED: "Paused: sentence {current} of {total}.",
      ANNOUNCE_FINISHED: "Finished reading: {total} sentence(s).",
      ANNOUNCE_STOPPED: "Reading stopped.",
      CLEARED: "Text cleared.",
      CHAR_COUNT: "{count} / 20000 characters",
    }),
  }),
});

export function translate(lang, code, params = {}) {
  const dict = DICTIONARIES[lang] ?? DICTIONARIES["zh-Hant"];
  const template = dict.errors[code] ?? dict.ui[code] ?? code;
  return template.replace(/\{(\w+)\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(params, key) ? String(params[key]) : match);
}

export function errorMessage(lang, error) {
  if (error && typeof error.code === "string") {
    return translate(lang, error.code, error.params ?? {});
  }
  return error instanceof Error ? error.message : String(error);
}
