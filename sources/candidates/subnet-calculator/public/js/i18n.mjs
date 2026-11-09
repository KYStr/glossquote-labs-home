// UI dictionaries for the IPv4 Subnet Calculator.
// Error messages are keyed by the core module's error codes; both
// languages carry the same keys (the project check enforces parity).

export const DICTIONARIES = Object.freeze({
  "zh-Hant": Object.freeze({
    errors: Object.freeze({
      IPV6_NOT_SUPPORTED: "本工具僅支援 IPv4；含冒號的輸入看起來是 IPv6 位址。",
      ADDRESS_PARTS: "位址必須是四段以小數點分隔的數字。",
      ADDRESS_EMPTY_OCTET: "第 {position} 段是空的。",
      ADDRESS_NON_DIGIT: "第 {position} 段含非數字字元（不接受正負號、空白或十六進位）。",
      ADDRESS_LEADING_ZERO: "第 {position} 段有前導零；除非該段就是 0，否則不接受（避免八進位混淆）。",
      ADDRESS_OCTET_RANGE: "第 {position} 段超過 255。",
      PREFIX_INVALID: "前綴必須是 0 到 32 的整數。",
      PREFIX_RANGE: "前綴必須是 0 到 32 的整數。",
      NETMASK_NOT_CONTIGUOUS: "遮罩不連續：遮罩必須是若干個 1 之後接著 0，不能交錯。",
      CHILD_PREFIX_NOT_LONGER: "子網前綴（/{child}）必須比母網前綴（/{parent}）長，才能切出子網。",
    }),
    ui: Object.freeze({
      ROW_ENTERED: "輸入位址",
      ROW_NETMASK: "子網路遮罩",
      ROW_WILDCARD: "萬用遮罩（wildcard）",
      ROW_NETWORK: "網路位址",
      ROW_BROADCAST: "廣播位址（broadcast）",
      ROW_TOTAL: "位址總數",
      ROW_USABLE: "可用主機數",
      ROW_FIRST: "第一個可用位址",
      ROW_LAST: "最後一個可用位址",
      ROW_PREFIX: "前綴長度",
      ROW_CLASS: "歷史級別（historical class）",
      ROW_CLASSIFICATION: "位址分類",
      ROW_BINARY: "二進位表示",
      BINARY_CAPTION: "前 {network} 位元是網路位元，其後 {host} 位元是主機位元。",
      NOTE_RFC3021: "RFC 3021 點對點連結：/31 的兩個位址都可用，不套用減二規則。",
      NOTE_HOST: "主機路由（host route）：/32 只有這一個位址。",
      CLASS_THIS_NETWORK: "本網路（this network，軟體用途）",
      CLASS_PRIVATE: "私有位址（private，RFC 1918）",
      CLASS_CGNAT: "CGNAT 共享位址空間（RFC 6598）",
      CLASS_LOOPBACK: "回送位址（loopback）",
      CLASS_LINK_LOCAL: "鏈路本地位址（link-local）",
      CLASS_DOCUMENTATION: "文件範例位址（documentation）",
      CLASS_MULTICAST: "多播位址（multicast）",
      CLASS_RESERVED: "保留位址（reserved）",
      CLASS_LIMITED_BROADCAST: "保留位址（reserved）；此位址即 255.255.255.255 受限廣播",
      CLASS_PUBLIC: "公共位址（public）",
      SPLIT_COUNT: "共 {count} 個子網",
      SPLIT_CAPPED: "顯示前 256 個，共 {count} 個子網",
      MEMBER_INSIDE: "{other} 在這個子網內（範圍 {network} – {broadcast}）。",
      MEMBER_OUTSIDE: "{other} 不在這個子網內（範圍 {network} – {broadcast}）。",
      COPIED: "已複製分析摘要。",
      COPY_FAILED: "複製失敗，請手動選取畫面上的值。",
    }),
  }),
  en: Object.freeze({
    errors: Object.freeze({
      IPV6_NOT_SUPPORTED: "This tool is IPv4 only; input containing a colon looks like an IPv6 address.",
      ADDRESS_PARTS: "An address must be four dot-separated octets.",
      ADDRESS_EMPTY_OCTET: "Octet {position} is empty.",
      ADDRESS_NON_DIGIT: "Octet {position} contains non-digit characters (no signs, spaces or hex).",
      ADDRESS_LEADING_ZERO: "Octet {position} has a leading zero; rejected unless the octet is exactly 0 (octal ambiguity).",
      ADDRESS_OCTET_RANGE: "Octet {position} is above 255.",
      PREFIX_INVALID: "The prefix must be an integer from 0 to 32.",
      PREFIX_RANGE: "The prefix must be an integer from 0 to 32.",
      NETMASK_NOT_CONTIGUOUS: "The netmask is not contiguous: a mask must be some number of 1 bits followed by only 0 bits.",
      CHILD_PREFIX_NOT_LONGER: "The child prefix (/{child}) must be longer than the parent prefix (/{parent}) to split subnets.",
    }),
    ui: Object.freeze({
      ROW_ENTERED: "Entered address",
      ROW_NETMASK: "Netmask",
      ROW_WILDCARD: "Wildcard mask",
      ROW_NETWORK: "Network address",
      ROW_BROADCAST: "Broadcast address",
      ROW_TOTAL: "Total addresses",
      ROW_USABLE: "Usable hosts",
      ROW_FIRST: "First usable address",
      ROW_LAST: "Last usable address",
      ROW_PREFIX: "Prefix length",
      ROW_CLASS: "Historical class",
      ROW_CLASSIFICATION: "Classification",
      ROW_BINARY: "Binary view",
      BINARY_CAPTION: "The first {network} bits are network bits; the remaining {host} bits are host bits.",
      NOTE_RFC3021: "RFC 3021 point-to-point link: both /31 addresses are usable; the minus-two rule does not apply.",
      NOTE_HOST: "Host route: a /32 has exactly this one address.",
      CLASS_THIS_NETWORK: "This network (software)",
      CLASS_PRIVATE: "Private (RFC 1918)",
      CLASS_CGNAT: "CGNAT shared address space (RFC 6598)",
      CLASS_LOOPBACK: "Loopback",
      CLASS_LINK_LOCAL: "Link-local",
      CLASS_DOCUMENTATION: "Documentation (TEST-NET)",
      CLASS_MULTICAST: "Multicast",
      CLASS_RESERVED: "Reserved",
      CLASS_LIMITED_BROADCAST: "Reserved; this address is the 255.255.255.255 limited broadcast",
      CLASS_PUBLIC: "Public",
      SPLIT_COUNT: "{count} subnet(s) in total",
      SPLIT_CAPPED: "Showing first 256 of {count} subnets",
      MEMBER_INSIDE: "{other} is inside this subnet (range {network} – {broadcast}).",
      MEMBER_OUTSIDE: "{other} is outside this subnet (range {network} – {broadcast}).",
      COPIED: "Analysis summary copied.",
      COPY_FAILED: "Copy failed; select the values on screen manually.",
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
