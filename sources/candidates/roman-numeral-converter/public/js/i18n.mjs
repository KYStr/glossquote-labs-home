// Dynamic UI strings for the Roman numeral converter. Static page text
// lives in the two HTML pages; this dictionary covers only what the
// controller renders: field errors, the stale marker, the leading-zero
// note and copy/status announcements.

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
      INT_TOO_LONG: () => "最多 4 位數字。",
      INT_NON_DIGIT: ({ char, position }) =>
        `第 ${position} 個字元「${char}」不是數字；這個欄位只接受 0 到 9。`,
      INT_NO_ZERO: () => "羅馬數字沒有 0；最小的正整數是 1（I）。",
      INT_CEILING: () =>
        "最大值是 3999（MMMCMXCIX）；4000 以上需要上畫線記號，不在本工具的範圍內。",
      ROMAN_TOO_LONG: ({ length }) =>
        `長度 ${length} 超過上限 15 個字元；最長的標準形是 3888（MMMDCCCLXXXVIII），正好 15 個字元。`,
      ROMAN_BAD_CHAR: ({ char, position }) =>
        `第 ${position} 個字元「${char}」不是羅馬符號；只接受 I、V、X、L、C、D、M。`,
      ROMAN_OUT_OF_RANGE: ({ loose }) =>
        `這個寫法逐字讀出的寬鬆值是 ${loose}，超出 1 到 3999 的範圍。`,
      ROMAN_NON_CANONICAL: ({ loose, canonical }) =>
        `這個寫法不是標準形：寬鬆值是 ${loose}，標準形是 ${canonical}。`,
    },
    stale: "已過時：欄位有誤，顯示上次有效的結果。",
    leadingZeroNote: ({ text, value }) => `前導零以數值讀取：${text} = ${value}。`,
    copied: (value) => `已複製 ${value}。`,
    copyFailed: "無法自動複製；請手動選取欄位內容後再複製。",
    statusConverted: ({ int, roman }) => `${int} 的羅馬數字是 ${roman}。`,
  },
  en: {
    errors: {
      INT_TOO_LONG: () => "At most 4 digits.",
      INT_NON_DIGIT: ({ char, position }) =>
        `Character ${position} ("${char}") is not a digit; this field accepts 0 to 9 only.`,
      INT_NO_ZERO: () => "Roman numerals have no zero; the smallest positive integer is 1 (I).",
      INT_CEILING: () =>
        "The maximum is 3999 (MMMCMXCIX); values from 4000 on need overline notation, which is out of scope for this tool.",
      ROMAN_TOO_LONG: ({ length }) =>
        `Length ${length} exceeds the 15-character maximum; the longest canonical form is 3888 (MMMDCCCLXXXVIII), exactly 15 characters.`,
      ROMAN_BAD_CHAR: ({ char, position }) =>
        `Character ${position} ("${char}") is not a Roman symbol; only I, V, X, L, C, D and M are accepted.`,
      ROMAN_OUT_OF_RANGE: ({ loose }) =>
        `Read symbol by symbol, this has the loose value ${loose}, outside the range 1 to 3999.`,
      ROMAN_NON_CANONICAL: ({ loose, canonical }) =>
        `This is not the canonical form: its loose value is ${loose}, and the canonical form is ${canonical}.`,
    },
    stale: "Out of date: a field is invalid, so the last valid result is shown.",
    leadingZeroNote: ({ text, value }) => `Leading zeros are read as the number: ${text} = ${value}.`,
    copied: (value) => `Copied ${value}.`,
    copyFailed: "Automatic copy is unavailable; select the field text and copy it manually.",
    statusConverted: ({ int, roman }) => `${int} in Roman numerals is ${roman}.`,
  },
});

export function getMessages(language) {
  return DICTIONARIES[language] ?? DICTIONARIES.en;
}

export function getErrorMessage(language, result) {
  const messages = getMessages(language);
  const render = messages.errors[result.code] ?? messages.errors.INT_NON_DIGIT;
  return render(result);
}
