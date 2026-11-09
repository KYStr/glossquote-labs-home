// UI dictionaries for the QR Code Maker. Error messages are keyed by the
// core module's error codes; both languages must carry the same keys (the
// project check enforces parity).

export const DICTIONARIES = Object.freeze({
  "zh-Hant": Object.freeze({
    errors: Object.freeze({
      CAPACITY_EXCEEDED: "內容太長：上限 {limit} 位元組，目前 {actual} 位元組。",
      SSID_REQUIRED: "請輸入網路名稱 (SSID)。",
      PASSWORD_REQUIRED: "此安全性類型需要密碼；若無密碼請改選「無密碼」。",
      EMPTY_PAYLOAD: "沒有可編碼的內容。",
    }),
    ui: Object.freeze({
      COPIED: "已複製內容。",
      COPY_FAILED: "複製失敗，請手動選取內容文字複製。",
      PLACEHOLDER: "輸入內容後，這裡會即時出現 QR 碼。",
      PREVIEW_PREFIX: "QR 碼內容：",
    }),
  }),
  en: Object.freeze({
    errors: Object.freeze({
      CAPACITY_EXCEEDED: "Content too long: the limit is {limit} bytes and the current content is {actual} bytes.",
      SSID_REQUIRED: "Enter the network name (SSID).",
      PASSWORD_REQUIRED: "A password is required for this security type; choose “None” if there is no password.",
      EMPTY_PAYLOAD: "There is no content to encode.",
    }),
    ui: Object.freeze({
      COPIED: "Payload copied.",
      COPY_FAILED: "Copy failed; select the payload text and copy it manually.",
      PLACEHOLDER: "Enter content and the QR code will appear here.",
      PREVIEW_PREFIX: "QR code for: ",
    }),
  }),
});

export function translate(lang, code, params = {}) {
  const dict = DICTIONARIES[lang] ?? DICTIONARIES["zh-Hant"];
  const template = dict.errors[code] ?? dict.ui[code] ?? code;
  return template.replace(/\{(\w+)\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(params, key) ? String(params[key]) : match);
}
