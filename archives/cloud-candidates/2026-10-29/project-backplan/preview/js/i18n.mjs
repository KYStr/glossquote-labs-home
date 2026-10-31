// 全部可變 UI 與匯出字句集中在此，避免英文錯誤滲入繁中頁。
export const messages = {
  'zh-Hant': {
    task: '任務', name: '任務名稱', duration: '工作天數', dependencies: '前置任務 ID', dependencyHint: '以英文逗號分隔，例如 T1,T2；沒有則留空。', remove: '移除',
    noResult: '尚未計算。輸入變更後，請重新倒排。', ready: '倒排完成。結果只對應目前輸入。', changed: '輸入已變更，舊結果已清除。',
    earliest: '專案最晚開工日', effective: '實際最晚完工日', requested: '指定截止日', adjusted: '截止日不是工作日，已往前取最近工作日。',
    start: '最晚開始', finish: '最晚完成', days: '工作天', none: '無', unnamed: '未命名專案',
    composing: '請先完成輸入法組字，再重新倒排。', copy: '複製文字', copying: '正在複製…', copied: '已複製文字。', manual: '無法自動複製；已選取文字，請使用裝置的複製指令。', download: '下載 TXT', downloaded: '已請求下載；10 秒後可重新下載，請確認瀏覽器的下載結果。', downloadFailed: '無法產生下載；請複製下方文字。',
    reportTitle: '專案期限倒排', calendar: '工作星期（週一至週日）', exclusions: '自行排除日期', noExclusions: '無',
    assumptions: '規則：工期含首尾工作日；前置完成後的下一個工作日才可開始後繼。可平行重疊，不檢查人力、設備、現實可行性或今天是否已逾期；不自動套用國定假日。',
    weekdayNames: ['週一','週二','週三','週四','週五','週六','週日'],
    cleared: '輸入與結果已清除。', limit: '最多 50 項任務。', initialization: '初始化失敗，表單保持停用；請重新載入。',
    errors: {
      SCHEMA: '輸入格式不符，請檢查各欄位。', LIMIT: '超出上限：1–50 項任務、至少一個工作星期、最多 366 個排除日期。', NAME: '名稱須為 1–100 個字元的有效 Unicode 單行文字，不含控制字元；專案名稱可留空。', DATE: '請填寫有效公曆日期 YYYY-MM-DD，範圍 0001–9999 年。', DURATION: '工期只接受 1–365 的 ASCII 正整數，不可小數、指數或全形數字。', WEEKDAYS: '至少選一個工作星期，不可重複。', HOLIDAYS: '排除日期不可重複。', ID: '任務 ID 必須是英文字母開頭的 1–32 字元識別碼。', DEPENDENCY: '前置任務請填 ID，以英文逗號分隔。', DUPLICATE_EDGE: '同一前置任務 ID 不可重複。', DUPLICATE_ID: '任務 ID 不可重複。', SELF_EDGE: '任務不能依賴自己。', MISSING_EDGE: '前置任務 ID 不存在；移除任務後請更新依賴。', CYCLE: '任務依賴形成循環，請移除循環後重算。', DATE_RANGE: '倒排會早於 0001-01-01；未產生任何結果。', INTERNAL: '無法完成計算，請檢查輸入後重試。'
    }
  },
  en: {
    task: 'Task', name: 'Task name', duration: 'Workdays', dependencies: 'Predecessor IDs', dependencyHint: 'Separate IDs with commas, e.g. T1,T2. Leave blank for none.', remove: 'Remove',
    noResult: 'No plan yet. Recalculate after changing any input.', ready: 'Plan calculated for the current inputs only.', changed: 'Inputs changed. The previous result was cleared.',
    earliest: 'Latest project start', effective: 'Effective latest finish', requested: 'Requested deadline', adjusted: 'The deadline is not a workday; the previous workday is used.',
    start: 'Latest start', finish: 'Latest finish', days: 'workdays', none: 'None', unnamed: 'Untitled project',
    composing: 'Finish composing your text before recalculating.', copy: 'Copy text', copying: 'Copying…', copied: 'Text copied.', manual: 'Automatic copy was unavailable. Text is selected; use your device’s copy command.', download: 'Download TXT', downloaded: 'Download requested. You can download again after 10 seconds. Check your browser’s downloads to confirm.', downloadFailed: 'Download could not be created. Copy the text below instead.',
    reportTitle: 'Project Deadline Backplanner', calendar: 'Working weekdays (Monday to Sunday)', exclusions: 'Excluded dates', noExclusions: 'None',
    assumptions: 'Rules: durations include both endpoint workdays; a successor starts no earlier than the next workday after its predecessor finishes. Parallel tasks may overlap. Staffing, equipment, real-world feasibility and whether today is already too late are not checked. National holidays are not applied automatically.',
    weekdayNames: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
    cleared: 'Inputs and results cleared.', limit: 'A maximum of 50 tasks is allowed.', initialization: 'Initialization failed. The form remains disabled; reload to retry.',
    errors: {
      SCHEMA: 'The input structure is invalid. Check the fields.', LIMIT: 'Limits: 1–50 tasks, at least one working weekday and up to 366 excluded dates.', NAME: 'Names must be valid Unicode single-line text of 1–100 characters, without control characters. The project name may be empty.', DATE: 'Enter a valid Gregorian date as YYYY-MM-DD, with a year from 0001 to 9999.', DURATION: 'Duration must be an ASCII whole number from 1 to 365, without decimals, exponents or full-width digits.', WEEKDAYS: 'Choose at least one working weekday, without duplicates.', HOLIDAYS: 'Excluded dates must not be repeated.', ID: 'Task IDs must begin with a letter and contain 1–32 identifier characters.', DEPENDENCY: 'Enter predecessor IDs separated by commas.', DUPLICATE_EDGE: 'A predecessor ID must not be repeated.', DUPLICATE_ID: 'Task IDs must be unique.', SELF_EDGE: 'A task cannot depend on itself.', MISSING_EDGE: 'A predecessor ID does not exist. Update dependencies after removing a task.', CYCLE: 'The dependency graph contains a cycle. Remove the cycle before recalculating.', DATE_RANGE: 'This plan would start before 0001-01-01. No partial result was produced.', INTERNAL: 'The plan could not be calculated. Check your inputs and retry.'
    }
  }
};

// 純文字報告使用固定 LF，下載會另外加一個 UTF-8 BOM。
export function formatReport(plan, language) {
  const t = messages[language];
  const lines = [t.reportTitle, plan.project || t.unnamed, '', `${t.requested}: ${plan.deadline}`, `${t.effective}: ${plan.effectiveDeadline}`, `${t.earliest}: ${plan.start}`, `${t.calendar}: ${plan.weekdays.map(day => t.weekdayNames[day]).join(', ')}`, `${t.exclusions}: ${plan.holidays.join(', ') || t.noExclusions}`, ''];
  for (const task of plan.tasks) lines.push(`[${task.id}] ${task.name}`, `  ${t.duration}: ${task.duration}; ${t.dependencies}: ${task.dependsOn.join(', ') || t.none}`, `  ${t.start}: ${task.start}; ${t.finish}: ${task.finish}`, '');
  lines.push(t.assumptions);
  return `${lines.join('\n')}\n`;
}
