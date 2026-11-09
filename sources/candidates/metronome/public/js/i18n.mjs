// UI dictionaries for the WebAudio Metronome.
// Only dynamically rendered strings live here; static labels are in
// the pages. Both languages carry the same keys (the project check
// enforces parity).

export const DICTIONARIES = Object.freeze({
  "zh-Hant": Object.freeze({
    errors: Object.freeze({}),
    ui: Object.freeze({
      START_LABEL: "開始",
      STOP_LABEL: "停止",
      POSITION: "第 {bar} 小節 · 第 {beat} 拍",
      POSITION_STOPPED: "已停止（第 1 小節 · 第 1 拍就緒）",
      ANNOUNCE_STARTED: "節拍器已開始。",
      ANNOUNCE_STOPPED: "節拍器已停止。",
    }),
  }),
  en: Object.freeze({
    errors: Object.freeze({}),
    ui: Object.freeze({
      START_LABEL: "Start",
      STOP_LABEL: "Stop",
      POSITION: "Bar {bar} · Beat {beat}",
      POSITION_STOPPED: "Stopped (ready at bar 1, beat 1)",
      ANNOUNCE_STARTED: "Metronome started.",
      ANNOUNCE_STOPPED: "Metronome stopped.",
    }),
  }),
});

function fill(template, params) {
  let out = template;
  for (const [key, value] of Object.entries(params ?? {})) {
    out = out.split(`{${key}}`).join(String(value));
  }
  return out;
}

export function translate(lang, code, params) {
  const dict = DICTIONARIES[lang] ?? DICTIONARIES.en;
  return fill(dict.ui[code] ?? code, params);
}

export function errorMessage(lang, code, params) {
  const dict = DICTIONARIES[lang] ?? DICTIONARIES.en;
  return fill(dict.errors[code] ?? code, params);
}
