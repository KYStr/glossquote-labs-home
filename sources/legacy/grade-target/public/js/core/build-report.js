import { readRecord, formatHundredths, displayNumerator, derive } from './exact.js';

const keys = ['schemaVersion', 'status', 'targetHundredths', 'earnedNumerator', 'earnedDisplay', 'remainingWeightBp', 'requiredAverageHundredths', 'maximumPossibleNumerator', 'maximumPossibleDisplay'];
const fail = (code, field) => ({ ok: false, error: { code, field } });
const validInteger = (s, max) => typeof s === 'string' && /^(?:0|[1-9][0-9]{0,8})(?![\s\S])/u.test(s) && BigInt(s) <= max;
const fixed = {
  'zh-Hant': {
    title: '成績目標試算', target: '目標：', earned: '已取得的總成績貢獻：', remaining: '剩餘權重：',
    maximum: '最高可能總成績：', required: '剩餘項目需達的加權平均：', final: '全部項目已評分；最終總成績：', unreachable: '目標無法達到',
    statuses: {
      target_feasible: '狀態：仍可達成', target_already_met: '狀態：已達成目標；仍有項目尚未評分',
      target_unreachable: '狀態：目標無法達到', complete_met: '狀態：全部項目已評分，已達成目標', complete_missed: '狀態：全部項目已評分，未達成目標'
    },
    notes: ['空白成績代表尚未評分；輸入 0 代表已評分且得 0 分。', '所需值是剩餘項目依權重合併後的平均，不是每項最低分，也不保證取得目標。', '本工具依你的輸入試算，不代表學校官方計分規則。']
  },
  en: {
    title: 'Grade Target Calculator', target: 'Target: ', earned: 'Earned contribution to final grade: ', remaining: 'Remaining weight: ',
    maximum: 'Maximum possible final grade: ', required: 'Weighted average needed across remaining components: ', final: 'All components are graded; final grade: ', unreachable: 'Target is not reachable',
    statuses: {
      target_feasible: 'Status: Target is reachable', target_already_met: 'Status: Target already met; some components are still ungraded',
      target_unreachable: 'Status: Target is not reachable', complete_met: 'Status: All components are graded; target met', complete_missed: 'Status: All components are graded; target not met'
    },
    notes: ['A blank score means not graded; 0 means graded with a score of zero.', 'This is the weighted average across ungraded components, not a minimum for each one, and it does not guarantee the target.', "This calculator follows your inputs and does not represent your school's official grading rules."]
  }
};

export function buildReport(result, language) {
  if (language !== 'zh-Hant' && language !== 'en') return fail('invalid_language', 'language');
  const checked = readRecord(result, keys, 'result');
  if (checked.error) return fail('invalid_result', 'result');
  const r = checked.values;
  if (r.schemaVersion !== 1 || !validInteger(r.targetHundredths, 10000n) || !validInteger(r.earnedNumerator, 100000000n) || !validInteger(r.remainingWeightBp, 10000n) || !validInteger(r.maximumPossibleNumerator, 100000000n)) return fail('invalid_result', 'result');
  if (r.requiredAverageHundredths !== null && !validInteger(r.requiredAverageHundredths, 10000n)) return fail('invalid_result', 'result');
  const target = BigInt(r.targetHundredths), earned = BigInt(r.earnedNumerator), remaining = BigInt(r.remainingWeightBp);
  const d = derive(target, earned, remaining);
  if (r.status !== d.status || r.requiredAverageHundredths !== (d.required === null ? null : d.required.toString()) || r.maximumPossibleNumerator !== d.maximum.toString() || r.earnedDisplay !== displayNumerator(earned) || r.maximumPossibleDisplay !== displayNumerator(d.maximum)) return fail('invalid_result', 'result');
  const t = fixed[language];
  const lines = [t.title, `${t.target}${formatHundredths(target)} / 100`, `${t.earned}${r.earnedDisplay} / 100`, `${t.remaining}${formatHundredths(remaining)}%`];
  if (remaining === 0n) lines.push(`${t.final}${r.earnedDisplay} / 100`);
  else if (r.status === 'target_unreachable') lines.push(`${t.maximum}${r.maximumPossibleDisplay} / 100`, `${t.required}${t.unreachable}`);
  else lines.push(`${t.required}${formatHundredths(d.required)} / 100`);
  lines.push(t.statuses[r.status], ...t.notes);
  return { ok: true, text: lines.join('\n'), filename: 'glossquote-grade-target.txt', mimeType: 'text/plain;charset=utf-8' };
}
