import { readRecord, readArray, parseDate, validId, nameIssue } from './schema.js';

export const REPORT_FILENAME = 'glossquote-duty-roster.txt';
const fail = path => ({ ok: false, error: { code: 'REPORT_SCHEMA', path } });
const integer = (n, min, max) => Number.isInteger(n) && n >= min && n <= max;

export function buildReport(result, lang) {
  if (lang !== 'zh-TW' && lang !== 'en') return { ok: false, error: { code: 'REPORT_LANGUAGE', path: '/lang' } };
  const data = readRecord(result, ['ok', 'days', 'counts', 'assignedCount', 'unassignedCount', 'totalDays']);
  if (!data) return fail('/');
  if (data.ok !== true) return fail('/ok');
  const dayInputs = readArray(data.days, 366);
  if (!dayInputs || !dayInputs.length) return fail('/days');
  const countInputs = readArray(data.counts, 30);
  if (!countInputs || !countInputs.length) return fail('/counts');
  const counts = [];
  const ids = new Set();
  for (let i = 0; i < countInputs.length; i++) {
    const path = `/counts/${i}`;
    const row = readRecord(countInputs[i], ['personNumber', 'personId', 'personName', 'count']);
    if (!row) return fail(path);
    if (row.personNumber !== i + 1) return fail(`${path}/personNumber`);
    if (!validId(row.personId) || ids.has(row.personId)) return fail(`${path}/personId`);
    ids.add(row.personId);
    if (nameIssue(row.personName) || row.personName !== row.personName.trim()) return fail(`${path}/personName`);
    if (!integer(row.count, 0, 366)) return fail(`${path}/count`);
    counts.push(row);
  }
  const actualCounts = Array(counts.length).fill(0);
  const days = [];
  let previousOrdinal = -1;
  let assigned = 0;
  let unassigned = 0;
  for (let i = 0; i < dayInputs.length; i++) {
    const path = `/days/${i}`;
    const row = readRecord(dayInputs[i], ['date', 'weekday', 'personNumber', 'personId', 'personName']);
    if (!row) return fail(path);
    const parsed = parseDate(row.date);
    if (parsed.issue || parsed.ordinal <= previousOrdinal) return fail(`${path}/date`);
    previousOrdinal = parsed.ordinal;
    if (row.weekday !== parsed.weekday) return fail(`${path}/weekday`);
    if (row.personNumber === null) {
      if (row.personId !== null) return fail(`${path}/personId`);
      if (row.personName !== null) return fail(`${path}/personName`);
      unassigned++;
    } else {
      if (!integer(row.personNumber, 1, counts.length)) return fail(`${path}/personNumber`);
      const person = counts[row.personNumber - 1];
      if (row.personId !== person.personId) return fail(`${path}/personId`);
      if (row.personName !== person.personName) return fail(`${path}/personName`);
      actualCounts[row.personNumber - 1]++; assigned++;
    }
    days.push(row);
  }
  for (let i = 0; i < counts.length; i++) if (counts[i].count !== actualCounts[i]) return fail(`/counts/${i}/count`);
  for (const [key, expected] of [['assignedCount', assigned], ['unassignedCount', unassigned], ['totalDays', days.length]]) {
    if (!integer(data[key], 0, 366) || data[key] !== expected) return fail(`/${key}`);
  }
  const zh = lang === 'zh-TW';
  const weekday = zh ? ['週一', '週二', '週三', '週四', '週五', '週六', '週日'] : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const member = row => zh ? `成員 ${row.personNumber}：${row.personName}` : `Member ${row.personNumber}: ${row.personName}`;
  const lines = ['GlossQuote Duty Roster', zh ? '輪值排班表' : 'Duty roster', zh ? `輪值日數：${days.length}` : `Duty days: ${days.length}`, zh ? `已排：${assigned}` : `Assigned: ${assigned}`, zh ? `未排：${unassigned}` : `Unassigned: ${unassigned}`, '', zh ? '日期\t星期\t輪值人員' : 'Date\tWeekday\tMember'];
  for (const row of days) lines.push(`${row.date}\t${weekday[row.weekday - 1]}\t${row.personNumber === null ? (zh ? '未排' : 'Unassigned') : member(row)}`);
  lines.push('', zh ? '成員統計' : 'Member totals');
  for (const row of counts) lines.push(`${member(row)}\t${row.count}`);
  return { ok: true, filename: REPORT_FILENAME, mimeType: 'text/plain;charset=utf-8', text: lines.join('\n') };
}
