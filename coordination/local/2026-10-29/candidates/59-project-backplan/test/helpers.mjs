export const task = (id, durationWorkdays = 1, predecessors = [], name = `Task ${id}`) => ({ id, name, durationWorkdays, predecessors });
export const project = (tasks = [task('A')], extra = {}) => ({ deadline: '2026-10-23', workweek: [1, 2, 3, 4, 5], holidays: [], tasks, ...extra });
export const dates = task => [task.ES, task.EF, task.LS, task.LF, task.slackWorkdays, task.critical];
export function chain(count, duration = 1) {
  return Array.from({ length: count }, (_, i) => task(`T${i + 1}`, duration, i ? [`T${i}`] : []));
}
// Independent UTC Date oracle (only years >= 1400); production uses civil ordinals instead.
export function nativeWorkdays(from, through, workweek, holidays = []) {
  const values = [];
  const end = Date.parse(`${through}T00:00:00Z`);
  for (let ms = Date.parse(`${from}T00:00:00Z`); ms <= end; ms += 86400000) {
    const day = new Date(ms);
    const value = day.toISOString().slice(0, 10);
    if (workweek.includes(day.getUTCDay()) && !holidays.includes(value)) values.push(value);
  }
  return values;
}
