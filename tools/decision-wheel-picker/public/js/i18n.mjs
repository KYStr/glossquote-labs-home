// Dynamic UI strings for the Decision Wheel Picker. Static copy lives
// in the two HTML pages; only messages composed at runtime live here.
// Both dictionaries must carry identical key sets (enforced by check).

export const STRINGS = Object.freeze({
  "zh-Hant": Object.freeze({
    countText: (count) => `目前選項數量：${count}（需要 2–50 個）`,
    tooFew: (count) => `選項不足：目前 ${count} 個，至少需要 2 個才能轉。`,
    tooMany: (count) => `選項太多：目前 ${count} 個，最多只能有 50 個。`,
    entryTooLong: (line) => `第 ${line} 行超過 60 個字，請縮短後再試。`,
    spinning: "轉動中…",
    idle: "按下「轉一下」，由程式先抽定再轉給你看。",
    announcePick: (text) => `抽中：${text}`,
    announceFinal: (text) =>
      `最後剩下：${text}。它是最後留下的選項，沒有被抽中。`,
    historyPick: (pick, text) => `第 ${pick} 次抽中：${text}`,
    historyFinal: (text) => `最後剩下：${text}`,
    editorLocked:
      "淘汰進行中，選項已鎖定；按「重置」可以重新編輯。",
  }),
  en: Object.freeze({
    countText: (count) =>
      `Current option count: ${count} (2–50 required)`,
    tooFew: (count) =>
      `Not enough options: ${count} so far; at least 2 are needed to spin.`,
    tooMany: (count) =>
      `Too many options: ${count} so far; the maximum is 50.`,
    entryTooLong: (line) =>
      `Line ${line} is longer than 60 characters; please shorten it.`,
    spinning: "Spinning…",
    idle: "Press “Spin” — the draw happens first, then the wheel shows it.",
    announcePick: (text) => `Picked: ${text}`,
    announceFinal: (text) =>
      `Final remaining: ${text}. It is the last entry left; it was not drawn.`,
    historyPick: (pick, text) => `Pick ${pick}: ${text}`,
    historyFinal: (text) => `Final remaining: ${text}`,
    editorLocked:
      "An elimination run is in progress, so the options are locked; press “Reset” to edit again.",
  }),
});

export function stringsFor(lang) {
  return STRINGS[lang] ?? STRINGS.en;
}
