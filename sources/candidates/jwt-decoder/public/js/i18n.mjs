// UI dictionaries for the JWT Decoder and Claims Inspector.
// Error messages are keyed by the core module's error codes; both
// languages carry the same keys (the project check enforces parity).
// The wording is deliberate: nothing in either dictionary affirms that
// a token is genuine — this tool decodes, it never verifies (SPEC
// sections 1 and 5).

export const DICTIONARIES = Object.freeze({
  "zh-Hant": Object.freeze({
    errors: Object.freeze({
      TOO_LONG: "token 超過長度上限 {limit} 個字元。",
      WHITESPACE_INSIDE: "token 內部含有空白字元（第 {position} 個字元）。",
      PART_COUNT: "token 應由 . 分隔為 3 個部分，實際找到 {count} 個。",
      JWE_LIKELY:
        "找到 5 個部分：這看起來是 JWE（加密的 JWT）。本工具只解碼未加密的三段式 token，不解密任何內容。",
      EMPTY_PART: "{part} 部分是空的。",
      INVALID_CHARACTER:
        "{part} 部分第 {position} 個字元不在 base64url 字母表（A–Z、a–z、0–9、-、_）內。",
      INVALID_LENGTH:
        "{part} 部分的長度無法解碼：未補 padding 的長度除以 4 餘 1，不存在合法解碼。",
      INVALID_PADDING: "{part} 部分的 padding（=）數量或位置不正確。",
      INVALID_UTF8: "{part} 部分解碼後的位元組不是有效的 UTF-8。",
      INVALID_JSON: "{part} 部分不是有效的 JSON。",
      INVALID_JSON_POSITION: "{part} 部分不是有效的 JSON（剖析器位置 {position}）。",
      NOT_JSON_OBJECT: "{part} 部分的最上層不是 JSON 物件。",
    }),
    ui: Object.freeze({
      PART_HEADER: "標頭",
      PART_PAYLOAD: "酬載",
      PART_SIGNATURE: "簽章",
      STATUS_EXPIRED: "已過期（exp 主張已到達或早於目前裝置時間）",
      STATUS_NOT_YET_VALID: "尚未生效（nbf 主張晚於目前裝置時間）",
      STATUS_WITHIN_STATED_WINDOW: "位於主張的時間窗內（僅就時間而言）",
      STATUS_NO_TIME_CLAIMS: "沒有時間主張",
      STATUS_CAPTION: "狀態只陳述時間主張與裝置時鐘的關係——簽章未經驗證。",
      CHECKED_AT: "判斷時間（裝置時鐘）：{time}",
      SIGNATURE_NOTE: "本工具未驗證此簽章。",
      EMPTY_SIGNATURE: "空的簽章段",
      BYTES: "{count} 位元組",
      COPIED: "已複製這一欄的 JSON。",
      COPY_FAILED: "複製失敗，請手動選取文字複製。",
      CLEARED: "已清除 token 與全部解碼結果。",
      LOCAL_TIME: "本機時間",
      NOT_NUMERICDATE: "不是 NumericDate——僅顯示原始值，不由此推導時間狀態",
      AUD_LIST: "共 {count} 個 audience 值（完整列於左欄）",
      NONSTRING_NOTE: "（非字串，顯示原始 JSON）",
      REL_AGO: "{rel} 前",
      REL_IN: "{rel} 後",
      EXP_PAST: "已於 {rel} 前到期",
      EXP_FUTURE: "將於 {rel} 後到期",
      NBF_PAST: "生效時間已於 {rel} 前到達",
      NBF_FUTURE: "生效時間在 {rel} 後",
      IAT_PAST: "簽發於 {rel} 前",
      IAT_FUTURE: "簽發時間在 {rel} 後",
      UNIT_DAYS: "{value} 天",
      UNIT_HOURS: "{value} 小時",
      UNIT_MINUTES: "{value} 分鐘",
      UNIT_SECONDS: "{value} 秒",
    }),
  }),
  en: Object.freeze({
    errors: Object.freeze({
      TOO_LONG: "The token exceeds the length limit of {limit} characters.",
      WHITESPACE_INSIDE: "The token contains whitespace at character {position}.",
      PART_COUNT: "A token must split on dots into 3 parts; found {count}.",
      JWE_LIKELY:
        "Found 5 parts: this looks like a JWE (an encrypted JWT). This tool only decodes unencrypted three-part tokens; it decrypts nothing.",
      EMPTY_PART: "The {part} part is empty.",
      INVALID_CHARACTER:
        "Character {position} of the {part} part is not in the base64url alphabet (A-Z, a-z, 0-9, -, _).",
      INVALID_LENGTH:
        "The {part} part has an undecodable length: its unpadded length mod 4 equals 1, so no valid decoding exists.",
      INVALID_PADDING: "The {part} part has misplaced or excessive padding (=).",
      INVALID_UTF8: "The {part} part does not decode as valid UTF-8 bytes.",
      INVALID_JSON: "The {part} part is not valid JSON.",
      INVALID_JSON_POSITION: "The {part} part is not valid JSON (parser position {position}).",
      NOT_JSON_OBJECT: "The top level of the {part} part is not a JSON object.",
    }),
    ui: Object.freeze({
      PART_HEADER: "header",
      PART_PAYLOAD: "payload",
      PART_SIGNATURE: "signature",
      STATUS_EXPIRED: "EXPIRED (the exp claim is at or before the current device time)",
      STATUS_NOT_YET_VALID: "NOT YET VALID (the nbf claim is later than the current device time)",
      STATUS_WITHIN_STATED_WINDOW: "WITHIN STATED WINDOW (times only)",
      STATUS_NO_TIME_CLAIMS: "NO TIME CLAIMS",
      STATUS_CAPTION: "The status only relates the time claims to the device clock — the signature is not verified.",
      CHECKED_AT: "Assessed at (device clock): {time}",
      SIGNATURE_NOTE: "Signature is not verified by this tool.",
      EMPTY_SIGNATURE: "empty signature segment",
      BYTES: "{count} bytes",
      COPIED: "Copied this pane's JSON.",
      COPY_FAILED: "Copy failed; select the text and copy it manually.",
      CLEARED: "Cleared the token and all decoded output.",
      LOCAL_TIME: "Local time",
      NOT_NUMERICDATE: "is not a NumericDate — shown raw; no time status is derived from it",
      AUD_LIST: "{count} audience values (listed in full in the value column)",
      NONSTRING_NOTE: "(not a string; raw JSON shown)",
      REL_AGO: "{rel} ago",
      REL_IN: "in {rel}",
      EXP_PAST: "expired {rel} ago",
      EXP_FUTURE: "expires in {rel}",
      NBF_PAST: "effective since {rel} ago",
      NBF_FUTURE: "takes effect in {rel}",
      IAT_PAST: "issued {rel} ago",
      IAT_FUTURE: "issued in {rel}",
      UNIT_DAYS: "{value} day(s)",
      UNIT_HOURS: "{value} hour(s)",
      UNIT_MINUTES: "{value} minute(s)",
      UNIT_SECONDS: "{value} second(s)",
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
