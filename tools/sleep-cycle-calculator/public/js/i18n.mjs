// UI strings for the strings app.js renders dynamically (day labels,
// marks, errors, announcements). Static page text lives in the two HTML
// pages themselves; key sets MUST stay identical across languages
// (scripts/check.mjs asserts this).

export const STRINGS = Object.freeze({
  "zh-Hant": Object.freeze({
    labels: Object.freeze({
      "previous-evening": "前一晚",
      "same-morning": "同日清晨",
      "next-morning": "隔天早上",
      "same-evening-night": "同日晚間／夜間",
    }),
    recommendedMark: "★ 常見建議範圍",
    shortNightMark: "短夜——低於常見建議範圍",
    noMark: "—",
    resultForWake: "起床時間 {time} 的就寢建議已更新",
    resultForBed: "就寢時間 {time} 的起床建議已更新",
    sleepNowSet: "已填入現在時間 {time}，並更新起床建議",
    staleNote: "資料已過期：顯示上一次的有效結果",
    errorTime: "時間格式不正確：請用 24 小時制 HH:MM（例如 07:00）重新輸入。",
    errorLatency: "入睡時間必須是 0–60 的整數分鐘。",
  }),
  en: Object.freeze({
    labels: Object.freeze({
      "previous-evening": "Previous evening",
      "same-morning": "Same morning",
      "next-morning": "Next morning",
      "same-evening-night": "Same evening/night",
    }),
    recommendedMark: "★ Commonly recommended",
    shortNightMark: "Short night — below the commonly advised range",
    noMark: "—",
    resultForWake: "Bedtime suggestions for a {time} wake time updated",
    resultForBed: "Wake-time suggestions for a {time} bedtime updated",
    sleepNowSet: "Filled in the current time {time} and updated the wake suggestions",
    staleNote: "Out of date: showing the last valid result",
    errorTime: "Invalid time: please enter a 24-hour HH:MM time (for example 07:00).",
    errorLatency: "Time to fall asleep must be a whole number of minutes from 0 to 60.",
  }),
});
