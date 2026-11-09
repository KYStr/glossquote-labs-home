// UI dictionaries and explanation templates for the Cron Expression
// Explainer. The core produces a structured explanation model; the
// phrases below render it, so both languages carry identical semantic
// content from the same model (SPEC sections 4 and 5). Error messages
// are keyed by the core module's error codes; the project check
// enforces key parity between the languages.

const PHRASES_ZH = Object.freeze({
  minute: Object.freeze({
    every: "每分鐘", single: "在第 {value} 分", range: "在第 {a}–{b} 分",
    stepAll: "每 {step} 分鐘", stepRange: "在第 {a}–{b} 分內每 {step} 分鐘",
    stepFrom: "從第 {a} 分起每 {step} 分鐘", list: "在第 {values} 分",
    summary: "在 {count} 個指定的分鐘值",
  }),
  hour: Object.freeze({
    every: "每小時", single: "在 {value} 時", range: "在 {a}–{b} 時",
    stepAll: "每 {step} 小時", stepRange: "在 {a}–{b} 時內每 {step} 小時",
    stepFrom: "從 {a} 時起每 {step} 小時", list: "在 {values} 時",
    summary: "在 {count} 個指定的小時值",
  }),
  dom: Object.freeze({
    every: "每月每一日", single: "在每月 {value} 日", range: "在每月 {a}–{b} 日",
    stepAll: "每 {step} 天", stepRange: "在每月 {a}–{b} 日內每 {step} 天",
    stepFrom: "從每月 {a} 日起每 {step} 天", list: "在每月 {values} 日",
    summary: "在 {count} 個指定的日期",
  }),
  month: Object.freeze({
    every: "每月", single: "在{value}", range: "在{a}至{b}",
    stepAll: "每 {step} 個月", stepRange: "在{a}至{b}內每 {step} 個月",
    stepFrom: "從{value}起每 {step} 個月", list: "在{values}",
    summary: "在 {count} 個指定的月份",
  }),
  dow: Object.freeze({
    every: "星期一至星期日每天", single: "在{value}", range: "在{a}至{b}",
    stepAll: "每 {step} 天（依星期）", stepRange: "在{a}至{b}內每 {step} 天",
    stepFrom: "從{value}起每 {step} 天", list: "在{values}",
    summary: "在 {count} 個指定的星期",
  }),
});

const PHRASES_EN = Object.freeze({
  minute: Object.freeze({
    every: "every minute", single: "at minute {value}", range: "at minutes {a}–{b}",
    stepAll: "every {step} minutes", stepRange: "every {step} minutes within minutes {a}–{b}",
    stepFrom: "every {step} minutes starting at minute {a}", list: "at minutes {values}",
    summary: "at {count} specific minute values",
  }),
  hour: Object.freeze({
    every: "every hour", single: "at hour {value}", range: "at hours {a}–{b}",
    stepAll: "every {step} hours", stepRange: "every {step} hours within hours {a}–{b}",
    stepFrom: "every {step} hours starting at hour {a}", list: "at hours {values}",
    summary: "at {count} specific hour values",
  }),
  dom: Object.freeze({
    every: "every day of the month", single: "on day {value} of the month", range: "on days {a}–{b} of the month",
    stepAll: "every {step} days", stepRange: "every {step} days within days {a}–{b} of the month",
    stepFrom: "every {step} days starting on day {a} of the month", list: "on days {values} of the month",
    summary: "on {count} specific days of the month",
  }),
  month: Object.freeze({
    every: "every month", single: "in {value}", range: "from {a} to {b}",
    stepAll: "every {step} months", stepRange: "every {step} months from {a} to {b}",
    stepFrom: "every {step} months starting in {value}", list: "in {values}",
    summary: "in {count} specific months",
  }),
  dow: Object.freeze({
    every: "every day of the week", single: "on {value}", range: "from {a} to {b}",
    stepAll: "every {step} days of the week", stepRange: "every {step} days from {a} to {b}",
    stepFrom: "every {step} days starting on {value}", list: "on {values}",
    summary: "on {count} specific weekdays",
  }),
});

export const DICTIONARIES = Object.freeze({
  "zh-Hant": Object.freeze({
    errors: Object.freeze({
      FIELD_COUNT: "欄位數不對：需要正好 5 個欄位（分鐘、小時、日期、月份、星期），你輸入了 {count} 個。本工具不支援秒或年份欄位。",
      UNKNOWN_NAME: "不認識的名稱「{token}」：月份可用 JAN–DEC、星期可用 SUN–SAT。",
      VALUE_RANGE: "值超出範圍：「{token}」。",
      RANGE_ORDER: "範圍起點大於終點：「{token}」，cron 範圍不跨界回繞。",
      STEP_INVALID: "步進無效：「{token}」，步進必須是 ≥1 的整數。",
      EMPTY_ITEM: "清單中有空項目（多餘的逗號）：「{token}」。",
      ITEM_INVALID: "無法解析的項目：「{token}」。",
      DIALECT_TOKEN: "「{token}」是 Quartz 等其他方言的語法（?、L、W、#），標準五欄位 cron 不支援，請改寫後再試。",
      MACRO_UNKNOWN: "不支援的 @ 寫法：「{token}」。支援的 macros：{supported}。",
    }),
    ui: Object.freeze({
      ERROR_AT_FIELD: "第 {index} 欄（{field}）錯誤：",
      SCHEDULE_LEAD: "整體排程：",
      SCHEDULE_SEP: "，",
      OR_SENTENCE: "注意：日期與星期兩個欄位都有指定時，任一符合就會執行（cron 的 OR 規則），不需要兩者同時符合。",
      NEVER_WARNING: "警告：從指定的起始時間起四年內找不到任何執行時間——這個排程可能永遠不會觸發（例如 2 月 31 日不存在）。",
      NEVER_RUNS_NOTE: "在接下來的四年內沒有（更多）執行時間。像 2 月 31 日這種不存在的日期永遠不會觸發；某個月沒有的日子（例如 2 月的 31 日）在該月會被跳過。",
      RUNS_FROM: "從 {start} 起（時區：{zone}）的下 10 次執行：",
      BUILDER_EVERY: "每個值",
      BUILDER_VALUES: "指定值",
      BUILDER_RANGE: "範圍",
      BUILDER_STEP: "步進",
      BUILDER_CUSTOM: "自訂",
      BUILDER_CUSTOM_NOTE: "這個欄位的寫法無法用建構器表示；直接編輯上方文字即可，建構器不會改寫它。",
      BUILDER_FROM: "從",
      BUILDER_TO: "到",
      BUILDER_BASE: "基準",
      BUILDER_BASE_ALL: "全部（*）",
      BUILDER_BASE_RANGE: "範圍",
      BUILDER_BASE_FROM: "從某值起",
      BUILDER_STEP_EVERY: "每隔",
    }),
    fieldLabels: Object.freeze({
      minute: "分鐘", hour: "小時", dom: "日期（日）", month: "月份", dow: "星期",
    }),
    monthNames: Object.freeze(["一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"]),
    dowNames: Object.freeze(["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"]),
    phrases: PHRASES_ZH,
  }),
  en: Object.freeze({
    errors: Object.freeze({
      FIELD_COUNT: "Wrong field count: exactly 5 fields are required (minute, hour, day of month, month, day of week); you entered {count}. Seconds and year fields are not supported.",
      UNKNOWN_NAME: "Unknown name in \"{token}\": months use JAN–DEC and weekdays use SUN–SAT.",
      VALUE_RANGE: "Value out of range in \"{token}\".",
      RANGE_ORDER: "Range start is after its end in \"{token}\"; cron ranges do not wrap around.",
      STEP_INVALID: "Invalid step in \"{token}\": a step must be an integer of at least 1.",
      EMPTY_ITEM: "Empty item in the list (a stray comma) in \"{token}\".",
      ITEM_INVALID: "Item cannot be parsed: \"{token}\".",
      DIALECT_TOKEN: "\"{token}\" is Quartz-style dialect syntax (?, L, W, #); standard five-field cron does not support it — rewrite the field and try again.",
      MACRO_UNKNOWN: "Unsupported @ form: \"{token}\". Supported macros: {supported}.",
    }),
    ui: Object.freeze({
      ERROR_AT_FIELD: "Error in field {index} ({field}):",
      SCHEDULE_LEAD: "Schedule: ",
      SCHEDULE_SEP: ", ",
      OR_SENTENCE: "Note: when both the day-of-month and day-of-week fields are restricted, the job runs when EITHER one matches (the cron OR rule); both do not have to match.",
      NEVER_WARNING: "Warning: no run exists within four years of the chosen start — this schedule may never fire (for example, February 31st does not exist).",
      NEVER_RUNS_NOTE: "No (further) run exists within the next four years. A date that does not exist, such as February 31st, never fires; a day a month does not have (the 31st in February) is skipped for that month.",
      RUNS_FROM: "Next 10 runs from {start} (timezone: {zone}):",
      BUILDER_EVERY: "Every value",
      BUILDER_VALUES: "Choose values",
      BUILDER_RANGE: "Range",
      BUILDER_STEP: "Step",
      BUILDER_CUSTOM: "Custom",
      BUILDER_CUSTOM_NOTE: "This field's shape cannot be represented by the builder; edit the text above directly — the builder will not rewrite it.",
      BUILDER_FROM: "From",
      BUILDER_TO: "To",
      BUILDER_BASE: "Base",
      BUILDER_BASE_ALL: "All (*)",
      BUILDER_BASE_RANGE: "Range",
      BUILDER_BASE_FROM: "Starting value",
      BUILDER_STEP_EVERY: "Every",
    }),
    fieldLabels: Object.freeze({
      minute: "minute", hour: "hour", dom: "day of month", month: "month", dow: "day of week",
    }),
    monthNames: Object.freeze(["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]),
    dowNames: Object.freeze(["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]),
    phrases: PHRASES_EN,
  }),
});

export function fillTemplate(template, params = {}) {
  return template.replace(/\{(\w+)\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(params, key) ? String(params[key]) : match);
}

export function translate(lang, code, params = {}) {
  const dict = DICTIONARIES[lang] ?? DICTIONARIES["zh-Hant"];
  const template = dict.errors[code] ?? dict.ui[code] ?? code;
  return fillTemplate(template, params);
}

export function errorMessage(lang, error) {
  if (error && typeof error.code === "string") {
    const params = error.params ?? {};
    const message = translate(lang, error.code, params);
    if (params.field && params.index) {
      const labels = (DICTIONARIES[lang] ?? DICTIONARIES["zh-Hant"]).fieldLabels;
      return (
        translate(lang, "ERROR_AT_FIELD", {
          index: params.index,
          field: labels[params.field] ?? params.field,
        }) + message
      );
    }
    return message;
  }
  return error instanceof Error ? error.message : String(error);
}
