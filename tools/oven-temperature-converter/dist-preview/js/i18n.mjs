// Bilingual runtime messages for the Oven Temperature Converter.
// Static page copy lives in the two HTML files; this table covers only
// strings the app sets at runtime (status, errors, dynamic result text).

export const MESSAGES = {
  'zh-Hant': {
    statusEmpty: '輸入溫度並選擇單位，再按「換算溫度」。',
    statusDirty: '輸入已變更，請重新執行',
    statusBusy: '處理中',
    statusCancelled: '已取消，可重新執行',
    statusSuccess: '換算完成。',
    error_INPUT_LIMIT: '輸入太長，請縮短後再試。',
    error_UNICODE: '輸入含有不完整的字元，請重新輸入。',
    error_EMPTY: '請輸入溫度。',
    error_DECIMAL_FORMAT: '溫度格式不正確，請輸入數字（最多兩位小數）。',
    error_ENUM: '請選擇有效的單位與烤箱基準。',
    error_FAN_GAS: 'Gas 刻度沒有旋風設定，請改選一般烤箱。',
    error_GAS_VALUE: '這個數值不在 Gas Mark 對照表內（¼–10）。',
    error_RANGE: '溫度超出可換算範圍（−50–350°C）。',
    error_INTERNAL: '發生未預期的問題，請重新執行。',
    summaryBoth: '一般烤箱 {conv}°C・旋風烤箱 {fan}°C',
    gasBelow: '超出對照表範圍（低於 Gas ¼）',
    gasAbove: '超出對照表範圍（高於 Gas 10）',
    exampleNote: '範例：一般烤箱 Gas Mark 4（合成案例，尚未執行）。',
  },
  en: {
    statusEmpty: 'Enter a temperature, choose its unit, then choose Convert temperature.',
    statusDirty: 'Input changed. Run again.',
    statusBusy: 'Working',
    statusCancelled: 'Cancelled. You can run again.',
    statusSuccess: 'Conversion complete.',
    error_INPUT_LIMIT: 'That entry is too long. Shorten it and try again.',
    error_UNICODE: 'That entry contains an incomplete character. Re-enter it.',
    error_EMPTY: 'Enter a temperature.',
    error_DECIMAL_FORMAT: 'Temperature format is not valid. Enter a number with up to two decimal places.',
    error_ENUM: 'Choose a valid unit and oven basis.',
    error_FAN_GAS: 'Gas Mark has no fan setting. Choose conventional oven instead.',
    error_GAS_VALUE: 'That value is not one of the Gas Mark chart values (¼–10).',
    error_RANGE: 'That temperature is outside the convertible range (−50–350 °C).',
    error_INTERNAL: 'Something unexpected happened. Run again.',
    summaryBoth: 'Conventional {conv} °C · Fan {fan} °C',
    gasBelow: 'Outside the chart (below Gas Mark ¼)',
    gasAbove: 'Outside the chart (above Gas Mark 10)',
    exampleNote: 'Example: Gas Mark 4, conventional oven (sample data, not run yet).',
  },
};

export function message(lang, key) {
  const table = MESSAGES[lang] ?? MESSAGES.en;
  return table[key] ?? MESSAGES.en[key] ?? key;
}
