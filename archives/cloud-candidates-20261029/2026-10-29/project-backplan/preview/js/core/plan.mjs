// 沿用已讀日期來源的零起算公曆 ordinal；此模組不讀時鐘或時區。
import { parseDate, fromOrdinal, formatDate } from './dates.mjs';

// 對外明示上限，避免不受限的圖形或日曆掃描。
export const LIMITS = Object.freeze({ tasks: 50, duration: 365, holidays: 366, name: 100 });
// 固定錯誤碼供雙語 UI 翻譯，不把輸入當 HTML 或程式。
export class PlanError extends Error {
  constructor(code, field = '') { super(code); this.name = 'PlanError'; this.code = code; this.field = field; }
}
const fail = (code, field = '') => { throw new PlanError(code, field); };

// 僅接受完整、純資料、自有欄位；讀描述器避免執行 accessor。
function record(value, keys, field) {
  try {
    if (!value || typeof value !== 'object' || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) fail('SCHEMA', field);
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const own = Reflect.ownKeys(descriptors);
    if (own.length !== keys.length || own.some(key => typeof key !== 'string' || !keys.includes(key))) fail('SCHEMA', field);
    const result = Object.create(null);
    for (const key of keys) {
      if (!Object.hasOwn(descriptors[key], 'value')) fail('SCHEMA', field);
      result[key] = descriptors[key].value;
    }
    return result;
  } catch (error) { if (error instanceof PlanError) throw error; fail('SCHEMA', field); }
}

// 陣列也拒絕洞、額外屬性、symbol 和 getter，而不是默默略過。
function array(value, min, max, field) {
  try {
    if (!Array.isArray(value)) fail('SCHEMA', field);
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const length = descriptors.length.value;
    if (!Number.isInteger(length) || length < min || length > max) fail('LIMIT', field);
    if (Reflect.ownKeys(descriptors).length !== length + 1) fail('SCHEMA', field);
    const result = [];
    for (let i = 0; i < length; i += 1) {
      if (!descriptors[i] || !Object.hasOwn(descriptors[i], 'value')) fail('SCHEMA', field);
      result.push(descriptors[i].value);
    }
    return result;
  } catch (error) { if (error instanceof PlanError) throw error; fail('SCHEMA', field); }
}

// 名稱是單行純文字；控制碼和雙向控制符會讓文字報告產生歧義，因此拒絕。
function name(value, field, optional = false) {
  if (typeof value !== 'string' || value.length > 200 || [...value].length > LIMITS.name || /[\x00-\x1f\x7f-\x9f\ud800-\udfff\u2028-\u202e\u2066-\u2069]/u.test(value)) fail('NAME', field);
  const clean = value.trim();
  if (!optional && clean.length === 0) fail('NAME', field);
  return clean;
}

// ISO 欄位採精確十字元，不接收隱式型別轉換或時區字串。
function date(value, field) {
  if (typeof value !== 'string' || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(value)) fail('DATE', field);
  const parsed = parseDate(value);
  if (!parsed.ok) fail('DATE', field);
  return parsed.value.ordinal;
}

// UI 文字工期只接受 ASCII 正整數；不把 1e2、1.0 或全形數字當整數。
export function parseDuration(value, field = '') {
  if (typeof value !== 'string' || !/^[1-9][0-9]{0,2}$/.test(value)) fail('DURATION', field);
  const number = Number(value);
  if (number > LIMITS.duration) fail('DURATION', field);
  return number;
}

const iso = ordinal => formatDate(fromOrdinal(ordinal).value).value;
const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;

export function planProject(raw) {
  const input = record(raw, ['project', 'deadline', 'weekdays', 'holidays', 'tasks'], 'project');
  const project = name(input.project, 'project', true);
  const deadline = date(input.deadline, 'deadline');
  const weekdays = array(input.weekdays, 1, 7, 'weekdays');
  if (weekdays.some(day => !Number.isInteger(day) || day < 0 || day > 6) || new Set(weekdays).size !== weekdays.length) fail('WEEKDAYS', 'weekdays');
  const week = new Set(weekdays);
  const holidayInput = array(input.holidays, 0, LIMITS.holidays, 'holidays');
  const holidayDates = holidayInput.map(value => date(value, 'holidays'));
  if (new Set(holidayDates).size !== holidayDates.length) fail('HOLIDAYS', 'holidays');
  const holidays = new Set(holidayDates);
  const rawTasks = array(input.tasks, 1, LIMITS.tasks, 'tasks');
  const tasks = rawTasks.map((rawTask, index) => {
    const field = `task-${index}`;
    const task = record(rawTask, ['id', 'name', 'duration', 'dependsOn'], field);
    if (typeof task.id !== 'string' || !/^[A-Za-z][A-Za-z0-9_-]{0,31}$/.test(task.id)) fail('ID', field);
    const title = name(task.name, `${task.id}-name`);
    if (!Number.isInteger(task.duration) || task.duration < 1 || task.duration > LIMITS.duration) fail('DURATION', `${task.id}-duration`);
    const dependencies = array(task.dependsOn, 0, LIMITS.tasks - 1, `${task.id}-dependencies`);
    if (dependencies.some(id => typeof id !== 'string' || !/^[A-Za-z][A-Za-z0-9_-]{0,31}$/.test(id))) fail('DEPENDENCY', `${task.id}-dependencies`);
    if (new Set(dependencies).size !== dependencies.length) fail('DUPLICATE_EDGE', `${task.id}-dependencies`);
    return { id: task.id, name: title, duration: task.duration, dependsOn: [...dependencies].sort(compare), successors: [] };
  }).sort((a, b) => compare(a.id, b.id));
  const byId = new Map(tasks.map(task => [task.id, task]));
  if (byId.size !== tasks.length) fail('DUPLICATE_ID', 'tasks');
  for (const task of tasks) {
    for (const id of task.dependsOn) {
      if (id === task.id) fail('SELF_EDGE', `${task.id}-dependencies`);
      if (!byId.has(id)) fail('MISSING_EDGE', `${task.id}-dependencies`);
      byId.get(id).successors.push(task.id);
    }
  }
  // Kahn 演算法檢查全部子圖，不遺漏與主要鏈斷開的循環。
  const degree = new Map(tasks.map(task => [task.id, task.dependsOn.length]));
  const queue = tasks.filter(task => degree.get(task.id) === 0).map(task => task.id);
  const order = [];
  while (queue.length) {
    queue.sort(compare);
    const id = queue.shift();
    order.push(id);
    for (const successor of byId.get(id).successors) {
      degree.set(successor, degree.get(successor) - 1);
      if (degree.get(successor) === 0) queue.push(successor);
    }
  }
  if (order.length !== tasks.length) fail('CYCLE', 'tasks');
  const isWorking = ordinal => week.has(ordinal % 7) && !holidays.has(ordinal);
  // 每步只往回走；50×365工作日及366排除日提供有限算量上界。
  const previous = ordinal => {
    while (ordinal >= 0 && !isWorking(ordinal)) ordinal -= 1;
    if (ordinal < 0) fail('DATE_RANGE', 'deadline');
    return ordinal;
  };
  const effectiveDeadline = previous(deadline);
  const schedule = new Map();
  for (const id of order.toReversed()) {
    const task = byId.get(id);
    let finish = effectiveDeadline;
    // 每一後繼都必須滿足 finish-to-start，不能挑一條依賴忽略其餘。
    for (const successor of task.successors) finish = Math.min(finish, previous(schedule.get(successor).start - 1));
    let start = finish;
    for (let count = 1; count < task.duration; count += 1) start = previous(start - 1);
    schedule.set(id, { start, finish });
  }
  const output = tasks.map(task => {
    const dates = schedule.get(task.id);
    return Object.freeze({ id: task.id, name: task.name, duration: task.duration, dependsOn: Object.freeze([...task.dependsOn]), start: iso(dates.start), finish: iso(dates.finish) });
  });
  const start = Math.min(...[...schedule.values()].map(dates => dates.start));
  return Object.freeze({ project, deadline: iso(deadline), effectiveDeadline: iso(effectiveDeadline), start: iso(start), weekdays: Object.freeze([...week].sort()), holidays: Object.freeze([...holidays].sort((a, b) => a - b).map(iso)), tasks: Object.freeze(output) });
}
