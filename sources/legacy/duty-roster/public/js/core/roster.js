import { readRecord, readArray, parseDate, formatOrdinal, validId, nameIssue } from './schema.js';

export const MAX_PEOPLE = 30;
const fail = (code, path) => ({ ok: false, error: { code, path } });

function weekdaysError(value, prefix, path, allowEmpty) {
  const values = readArray(value, 7);
  if (values === null) return fail(`${prefix}SCHEMA`, path);
  if (!allowEmpty && !values.length) return fail('WEEKDAYS_EMPTY', path);
  const seen = new Set();
  for (let i = 0; i < values.length; i++) {
    const day = values[i];
    const field = prefix === 'WEEKDAYS_' ? 'WEEKDAY' : 'PERSON_WEEKDAY';
    if (!Number.isInteger(day) || day < 1 || day > 7) return fail(`${field}_INVALID`, `${path}/${i}`);
    if (seen.has(day)) return fail(`${field}_DUPLICATE`, `${path}/${i}`);
    seen.add(day);
  }
  return values;
}

export function calculateRoster(request) {
  const data = readRecord(request, ['startRaw', 'endRaw', 'weekdays', 'people']);
  if (!data) return fail('REQUEST_SCHEMA', '/');
  const start = parseDate(data.startRaw);
  if (start.issue) return fail(`START_DATE_${start.issue}`, '/startRaw');
  const end = parseDate(data.endRaw);
  if (end.issue) return fail(`END_DATE_${end.issue}`, '/endRaw');
  if (end.ordinal < start.ordinal) return fail('DATE_ORDER', '/endRaw');
  if (end.ordinal - start.ordinal + 1 > 366) return fail('DATE_SPAN_LIMIT', '/endRaw');
  const weekdays = weekdaysError(data.weekdays, 'WEEKDAYS_', '/weekdays', false);
  if (!Array.isArray(weekdays)) return weekdays;
  const rows = readArray(data.people);
  if (!rows) return fail('PEOPLE_SCHEMA', '/people');
  if (rows.length < 1 || rows.length > MAX_PEOPLE) return fail('PEOPLE_COUNT', '/people');
  const ids = new Set();
  const people = [];
  for (let i = 0; i < rows.length; i++) {
    const path = `/people/${i}`;
    const person = readRecord(rows[i], ['id', 'nameRaw', 'weekdays']);
    if (!person) return fail('PERSON_SCHEMA', path);
    if (!validId(person.id)) return fail('PERSON_ID_INVALID', `${path}/id`);
    if (ids.has(person.id)) return fail('PERSON_ID_DUPLICATE', `${path}/id`);
    ids.add(person.id);
    const issue = nameIssue(person.nameRaw);
    if (issue) return fail(`PERSON_NAME_${issue}`, `${path}/nameRaw`);
    const available = weekdaysError(person.weekdays, 'PERSON_WEEKDAYS_', `${path}/weekdays`, true);
    if (!Array.isArray(available)) return available;
    people.push({ id: person.id, name: person.nameRaw.trim(), weekdays: new Set(available) });
  }
  const selected = new Set(weekdays);
  const days = [];
  const counts = people.map((person, index) => ({ personNumber: index + 1, personId: person.id, personName: person.name, count: 0 }));
  let cursor = 0;
  let assignedCount = 0;
  let unassignedCount = 0;
  for (let ordinal = start.ordinal; ordinal <= end.ordinal; ordinal++) {
    const weekday = ordinal % 7 + 1;
    if (!selected.has(weekday)) continue;
    let chosen = -1;
    for (let offset = 0; offset < people.length; offset++) {
      const index = (cursor + offset) % people.length;
      if (people[index].weekdays.has(weekday)) { chosen = index; break; }
    }
    const row = { date: formatOrdinal(ordinal), weekday, personNumber: null, personId: null, personName: null };
    if (chosen < 0) unassignedCount++;
    else {
      row.personNumber = chosen + 1;
      row.personId = people[chosen].id;
      row.personName = people[chosen].name;
      counts[chosen].count++;
      assignedCount++;
      cursor = (chosen + 1) % people.length;
    }
    days.push(row);
  }
  if (!days.length) return fail('NO_DUTY_DATES', '/weekdays');
  return { ok: true, days, counts, assignedCount, unassignedCount, totalDays: days.length };
}
