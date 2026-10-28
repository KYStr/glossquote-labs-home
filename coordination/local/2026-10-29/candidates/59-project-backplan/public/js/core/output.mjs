export const MAX_OUTPUT_BYTES = 2 * 1024 * 1024;
const encoder = new TextEncoder();
const words = {
  'zh-Hant': {
    title: '專案期限倒排', deadline: '原交件日', effective: '有效交件日', adjusted: '截止調整', delta: '向前調整曆日數',
    anchor: '全案起點', duration: '最長路徑工作日', workweek: '工作週（0=週日）', holidays: '休假', critical: '關鍵任務（穩定依賴順序）',
    yes: '是', no: '否', none: '無',
    headers: ['ID', '任務名稱', '工期（工作日）', '前置 ID', '最早開始 ES', '最早完成 EF', '最晚開始 LS', '最晚完成 LF', '餘裕（工作日）', '關鍵任務'],
    note: '起迄含當日；前置完成的下一工作日可開始。假日由使用者提供；不計人力容量、風險或資源限制。'
  },
  en: {
    title: 'Deadline Back-Planner', deadline: 'Entered deadline', effective: 'Effective deadline', adjusted: 'Deadline adjusted', delta: 'Calendar days moved earlier',
    anchor: 'Project anchor', duration: 'Longest path workdays', workweek: 'Workweek (0=Sunday)', holidays: 'Holidays', critical: 'Critical tasks (stable topological order)',
    yes: 'Yes', no: 'No', none: 'None',
    headers: ['ID', 'Task name', 'Duration (workdays)', 'Predecessor IDs', 'Early start ES', 'Early finish EF', 'Late start LS', 'Late finish LF', 'Slack (workdays)', 'Critical task'],
    note: 'Start and finish dates are inclusive. Successors start on the next workday after predecessors finish. You provide the holidays; team capacity, risk, and resource constraints are not modeled.'
  }
};

export function serializePlan(plan, { maxBytes = MAX_OUTPUT_BYTES, locale = 'zh-Hant' } = {}) {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 0 || maxBytes > MAX_OUTPUT_BYTES || !Object.hasOwn(words, locale)) {
    return { ok: false, code: 'OUTPUT_OPTIONS' };
  }
  const t = words[locale];
  if (!plan || plan.schema !== 'gq.backplan' || plan.version !== 1 || !Array.isArray(plan.tasks) || !plan.settings) return { ok: false, code: 'OUTPUT_INVALID' };
  // The sole caller supplies a validated calculation; this function commits neither file until both fit.
  const json = `${JSON.stringify(plan, null, 2)}\n`;
  const s = plan.settings;
  const lines = [
    t.title, 'gq.backplan / 1',
    `${t.deadline}: ${s.deadline}`, `${t.effective}: ${s.effectiveDeadline}`,
    `${t.adjusted}: ${s.deadlineAdjusted ? t.yes : t.no}`, `${t.delta}: ${s.deadlineAdjustmentDays}`,
    `${t.anchor}: ${plan.anchor}`, `${t.duration}: ${plan.longestPathWorkdays}`,
    `${t.workweek}: ${s.workweek.join(', ')}`, `${t.holidays}: ${s.holidays.join(', ') || t.none}`,
    `${t.critical}: ${plan.criticalTaskIds.join(', ') || t.none}`, '', t.headers.join('\t')
  ];
  for (const task of plan.tasks) {
    lines.push([task.id, task.name, task.durationWorkdays, task.predecessors.join(', ') || t.none,
      task.ES, task.EF, task.LS, task.LF, task.slackWorkdays, task.critical ? t.yes : t.no].join('\t'));
  }
  const txt = `${lines.join('\n')}\n\n${t.note}\n`;
  const jsonBytes = encoder.encode(json).byteLength;
  const txtBytes = encoder.encode(txt).byteLength;
  const totalBytes = jsonBytes + txtBytes;
  if (totalBytes > maxBytes) return { ok: false, code: 'OUTPUT_LIMIT' };
  return {
    ok: true, totalBytes,
    json: { filename: 'project-backplan.json', mime: 'application/json;charset=utf-8', text: json, bytes: jsonBytes },
    txt: { filename: 'project-backplan.txt', mime: 'text/plain;charset=utf-8', text: txt, bytes: txtBytes }
  };
}
