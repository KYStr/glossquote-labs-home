// Dynamic UI strings for the aspect ratio calculator. Static page text
// lives in the two HTML pages; this dictionary covers only what the
// controller renders: field errors, the preset note, the stale marker and
// the live status announcements.

function deepFreeze(value) {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const nested of Object.values(value)) deepFreeze(nested);
    Object.freeze(value);
  }
  return value;
}

export const DICTIONARIES = deepFreeze({
  "zh-Hant": {
    errors: {
      EMPTY: () => "請輸入數字。",
      INVALID_NUMBER: () => "請輸入數字，例如 16 或 2.39；不接受逗號、運算式或全形數字。",
      TOO_MANY_DECIMALS: ({ max }) => (max === 0
        ? "請輸入整數，不接受小數。"
        : `小數最多 ${max} 位，請刪減後重試。`),
      NON_POSITIVE: () => "必須大於 0。",
      TOO_LARGE: ({ cap }) => `不可超過 ${cap}。`,
    },
    noteExact: (label) => `正好是 ${label}`,
    noteClose: (label, diff) => `接近 ${label}（差 ${diff}）`,
    noteNone: () => "",
    stale: "已過時：欄位有誤，顯示上次有效的結果。",
    givenWidth: "已知寬度",
    givenHeight: "已知高度",
    solvedWidth: "求得的寬度",
    solvedHeight: "求得的高度",
    useAsDimensionsReason: "模式 A 只接受整數；目前這組結果不全是整數，所以不能帶入。",
    statusModeA: ({ ratio, decimal, percent, note }) =>
      `比率 ${ratio}，小數 ${decimal}，高度為寬度的 ${percent}%。${note}`,
    statusModeB: ({ ratio, solved, fraction }) =>
      fraction ? `化簡比率 ${ratio}，求得 ${solved}（精確值 ${fraction}）。` : `化簡比率 ${ratio}，求得 ${solved}。`,
  },
  en: {
    errors: {
      EMPTY: () => "Enter a number.",
      INVALID_NUMBER: () => "Enter a number such as 16 or 2.39; commas, expressions and full-width digits are not accepted.",
      TOO_MANY_DECIMALS: ({ max }) => (max === 0
        ? "Enter a whole number; decimals are not accepted here."
        : `At most ${max} decimal places; remove digits and try again.`),
      NON_POSITIVE: () => "Must be greater than 0.",
      TOO_LARGE: ({ cap }) => `Must not exceed ${cap}.`,
    },
    noteExact: (label) => `Exactly ${label}`,
    noteClose: (label, diff) => `Close to ${label} (differs by ${diff})`,
    noteNone: () => "",
    stale: "Out of date: a field is invalid, so the last valid result is shown.",
    givenWidth: "Known width",
    givenHeight: "Known height",
    solvedWidth: "Solved width",
    solvedHeight: "Solved height",
    useAsDimensionsReason: "Mode A accepts integers only; this result pair is not all integers, so it cannot be carried over.",
    statusModeA: ({ ratio, decimal, percent, note }) =>
      `Ratio ${ratio}, decimal ${decimal}, height is ${percent}% of width. ${note}`,
    statusModeB: ({ ratio, solved, fraction }) =>
      fraction ? `Simplified ratio ${ratio}, solved value ${solved} (exact value ${fraction}).` : `Simplified ratio ${ratio}, solved value ${solved}.`,
  },
});

export function getMessages(language) {
  return DICTIONARIES[language] ?? DICTIONARIES.en;
}

export function getErrorMessage(language, result) {
  const messages = getMessages(language);
  const render = messages.errors[result.code] ?? messages.errors.INVALID_NUMBER;
  return render(result);
}

export function formatNote(language, note) {
  const messages = getMessages(language);
  if (note.kind === "exact") return messages.noteExact(note.label);
  if (note.kind === "close") return messages.noteClose(note.label, note.diffText);
  return messages.noteNone();
}
