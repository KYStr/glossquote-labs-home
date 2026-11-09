import { parseCivilDate } from './calendar.mjs';

export const LIMITS = Object.freeze({ tasks: 100, dependencies: 500, holidays: 366, duration: 260, nameScalars: 120 });
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
const exactKeys = (value, keys) => record(value) && Object.keys(value).length === keys.length && keys.every(k => Object.hasOwn(value, k));
const idPattern = /^[A-Za-z0-9._-]{1,32}$/;

export function validateProject(raw) {
  const errors = [];
  const add = (code, field, extra = {}) => errors.push({ code, field, ...extra });
  if (!exactKeys(raw, ['deadline', 'workweek', 'holidays', 'tasks'])) {
    return { ok: false, errors: [{ code: 'PROJECT_SCHEMA', field: 'project' }] };
  }
  if (!parseCivilDate(raw.deadline)) add('DATE_INVALID', 'deadline');
  if (!Array.isArray(raw.workweek) || raw.workweek.length > 7 || [...raw.workweek].some(d => !Number.isInteger(d) || d < 0 || d > 6) || new Set(raw.workweek).size !== raw.workweek.length) {
    add('WORKWEEK_INVALID', 'workweek');
  } else if (raw.workweek.length === 0) add('NO_WORKDAYS', 'workweek');
  if (!Array.isArray(raw.holidays) || raw.holidays.length > LIMITS.holidays) add('HOLIDAY_LIMIT', 'holidays');
  else {
    const seenHolidays = new Set();
    for (let i = 0; i < raw.holidays.length; i += 1) {
      const holiday = raw.holidays[i];
      if (!parseCivilDate(holiday)) add('DATE_INVALID', `holidays.${i}`);
      else if (seenHolidays.has(holiday)) add('HOLIDAY_DUPLICATE', `holidays.${i}`);
      seenHolidays.add(holiday);
    }
  }
  if (!Array.isArray(raw.tasks) || raw.tasks.length < 1 || raw.tasks.length > LIMITS.tasks) {
    add('TASK_LIMIT', 'tasks');
    return { ok: false, errors };
  }
  const ids = new Set();
  const tasks = [];
  let dependencies = 0;
  for (let index = 0; index < raw.tasks.length; index += 1) {
    const task = raw.tasks[index];
    const field = `tasks.${index}`;
    if (!exactKeys(task, ['id', 'name', 'durationWorkdays', 'predecessors'])) {
      add('TASK_SCHEMA', field);
      tasks.push(null);
      continue;
    }
    const validId = typeof task.id === 'string' && idPattern.test(task.id);
    const context = validId ? { taskId: task.id } : {};
    if (!validId) add('ID_INVALID', `${field}.id`);
    else if (ids.has(task.id)) add('ID_DUPLICATE', `${field}.id`, context);
    if (validId) ids.add(task.id);
    if (typeof task.name !== 'string' || task.name.length > 240 || !task.name.isWellFormed() ||
        [...task.name].length < 1 || [...task.name].length > LIMITS.nameScalars || /^\s*$/.test(task.name) || /[\p{Cc}\p{Zl}\p{Zp}]/u.test(task.name)) {
      add('NAME_INVALID', `${field}.name`, context);
    }
    let duration = task.durationWorkdays;
    if (typeof duration === 'string') {
      if (duration.length > 3 || !/^[1-9][0-9]*$/.test(duration)) duration = NaN;
      else duration = Number(duration);
    }
    if (!Number.isSafeInteger(duration) || duration < 1 || duration > LIMITS.duration) add('DURATION_INVALID', `${field}.durationWorkdays`, context);
    if (!Array.isArray(task.predecessors) || task.predecessors.length > LIMITS.dependencies) add('DEPENDENCY_LIMIT', `${field}.predecessors`, context);
    else {
      dependencies += task.predecessors.length;
      const seen = new Set();
      [...task.predecessors].forEach((pred, p) => {
        if (typeof pred !== 'string' || !idPattern.test(pred)) add('PREDECESSOR_INVALID', `${field}.predecessors.${p}`, context);
        else if (seen.has(pred)) add('DUPLICATE_EDGE', `${field}.predecessors.${p}`, { ...context, relatedId: pred });
        seen.add(pred);
      });
    }
    tasks.push({ id: task.id, name: task.name, durationWorkdays: duration, predecessors: Array.isArray(task.predecessors) && task.predecessors.length <= LIMITS.dependencies ? [...task.predecessors] : [] });
  }
  if (dependencies > LIMITS.dependencies) add('DEPENDENCY_LIMIT', 'tasks');
  tasks.forEach((task, i) => {
    if (!task) return;
    task.predecessors.forEach((pred, p) => {
      if (typeof pred === 'string' && idPattern.test(pred) && !ids.has(pred)) {
        add('UNKNOWN_PREDECESSOR', `tasks.${i}.predecessors.${p}`, { ...(typeof task.id === 'string' && idPattern.test(task.id) ? { taskId: task.id } : {}), relatedId: pred });
      }
    });
  });
  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    input: { deadline: raw.deadline, workweek: [...raw.workweek].sort((a, b) => a - b), holidays: [...raw.holidays].sort(), tasks },
    errors: []
  };
}
