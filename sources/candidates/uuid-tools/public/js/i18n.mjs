// UI dictionaries for the UUID Generator and Inspector.
// Only dynamically rendered strings live here; static labels are in
// the pages. Both languages carry the same keys (the project check
// enforces parity).

export const DICTIONARIES = Object.freeze({
  "zh-Hant": Object.freeze({
    errors: Object.freeze({
      EMPTY: "（空白）",
      WRONG_LENGTH: "長度錯誤：需要 36 字元（含連字號）或 32 字元（純十六進位），實際為 {length} 字元。",
      HYPHEN_MISPLACED: "連字號位置錯誤：第 {position} 字元。",
      NON_HEX: "第 {position} 字元「{char}」不是十六進位數字。",
      COUNT_INVALID: "數量必須是 1 到 1000 的整數。",
    }),
    ui: Object.freeze({
      BATCH_LABEL: "目前批次：{count} 個 · 版本 {version}",
      BATCH_EMPTY: "尚未產生批次。",
      STATUS_OK: "格式正確（well-formed）。",
      STATUS_INVALID: "不是嚴格合法的 UUID：",
      CANONICAL_LABEL: "正規形式",
      VERSION_LABEL: "版本",
      VARIANT_LABEL: "變體",
      TIMESTAMP_LABEL: "內嵌時間",
      TIMESTAMP_NONE: "這個版本沒有內嵌時間戳。",
      TIMESTAMP_V6: "版本 6 已辨識，但本工具不解碼它的時間欄位排列。",
      TIMESTAMP_LOCAL: "本地時間",
      NIL_TEXT: "NIL UUID：全部位元為 0 的特殊值。",
      MAX_TEXT: "MAX UUID：全部位元為 1 的特殊值。",
      VERSION_CAVEAT: "注意：版本語意以 RFC 9562 標準變體為前提，此值的變體不同，解讀僅供參考。",
      VER_0: "0 — 保留（NIL 範圍）",
      VER_1: "1 — 時間型（time-based）",
      VER_2: "2 — DCE 安全型",
      VER_3: "3 — MD5 名稱型",
      VER_4: "4 — 隨機型（random）",
      VER_5: "5 — SHA-1 名稱型",
      VER_6: "6 — 重排時間型",
      VER_7: "7 — Unix 時間型",
      VER_8: "8 — 自訂型（custom）",
      VER_RESERVED: "{nibble} — 保留供未來使用",
      VAR_NCS: "NCS 舊式變體（0xxx）",
      VAR_RFC: "RFC 9562 標準變體（10xx）",
      VAR_MS: "Microsoft 舊式變體（110x）",
      VAR_RESERVED: "保留變體（111x）",
      COPIED: "已複製整批。",
      COPY_FAILED: "複製失敗，請手動選取結果複製。",
    }),
  }),
  en: Object.freeze({
    errors: Object.freeze({
      EMPTY: "(empty)",
      WRONG_LENGTH: "Wrong length: expected 36 characters (hyphenated) or 32 (hex only), found {length}.",
      HYPHEN_MISPLACED: "Misplaced hyphen at character {position}.",
      NON_HEX: "Character {position} (\"{char}\") is not a hex digit.",
      COUNT_INVALID: "Count must be an integer from 1 to 1000.",
    }),
    ui: Object.freeze({
      BATCH_LABEL: "Current batch: {count} · version {version}",
      BATCH_EMPTY: "No batch generated yet.",
      STATUS_OK: "Well-formed.",
      STATUS_INVALID: "Not a strictly well-formed UUID:",
      CANONICAL_LABEL: "Canonical form",
      VERSION_LABEL: "Version",
      VARIANT_LABEL: "Variant",
      TIMESTAMP_LABEL: "Embedded timestamp",
      TIMESTAMP_NONE: "This version carries no embedded timestamp.",
      TIMESTAMP_V6: "Version 6 is recognised, but this tool does not decode its timestamp layout.",
      TIMESTAMP_LOCAL: "Local time",
      NIL_TEXT: "NIL UUID: the special all-zero value.",
      MAX_TEXT: "MAX UUID: the special all-ones value.",
      VERSION_CAVEAT: "Note: version semantics assume the RFC 9562 standard variant; this value's variant differs, so read it with care.",
      VER_0: "0 — reserved (NIL range)",
      VER_1: "1 — time-based",
      VER_2: "2 — DCE security",
      VER_3: "3 — MD5 name-based",
      VER_4: "4 — random",
      VER_5: "5 — SHA-1 name-based",
      VER_6: "6 — reordered time",
      VER_7: "7 — Unix time",
      VER_8: "8 — custom",
      VER_RESERVED: "{nibble} — reserved for future use",
      VAR_NCS: "NCS legacy variant (0xxx)",
      VAR_RFC: "RFC 9562 standard variant (10xx)",
      VAR_MS: "Microsoft legacy variant (110x)",
      VAR_RESERVED: "Reserved variant (111x)",
      COPIED: "Batch copied.",
      COPY_FAILED: "Copy failed; select the results and copy manually.",
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
