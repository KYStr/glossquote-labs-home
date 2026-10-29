import { validateProject } from './validate.mjs';
import { analyzeGraph, GraphError } from './graph.mjs';
import { buildWorkdayCalendar } from './calendar.mjs';

export class PlanError extends Error {
  constructor(code, errors = [{ code, field: 'project' }]) {
    super(code);
    this.code = code;
    this.errors = errors;
  }
}

export function assertSchedule(plan, graph, calendar) {
  const D = graph.longestPathWorkdays;
  const byId = new Map(plan.tasks.map(task => [task.id, task]));
  const index = new Map(calendar.workdayDates.map((date, i) => [date, i]));
  const require = condition => { if (!condition) throw new PlanError('INTERNAL_ERROR'); };
  require(plan.tasks.length === graph.ids.length && index.size === D && plan.anchor === calendar.workdayDates[0]);
  for (const task of plan.tasks) {
    const [es, ef, ls, lf] = ['ES', 'EF', 'LS', 'LF'].map(key => index.get(task[key]));
    require([es, ef, ls, lf].every(i => Number.isInteger(i) && i >= 0 && i < D));
    require(ef - es + 1 === task.durationWorkdays && lf - ls + 1 === task.durationWorkdays);
    require(ls >= es && task.slackWorkdays === ls - es && task.critical === (ls === es));
    const preds = graph.predecessors.get(task.id);
    const next = graph.successors.get(task.id);
    require(es === (preds.length ? Math.max(...preds.map(p => index.get(byId.get(p).EF))) + 1 : 0));
    require(lf === (next.length ? Math.min(...next.map(s => index.get(byId.get(s).LS))) - 1 : D - 1));
    for (const pred of preds) require(es >= index.get(byId.get(pred).EF) + 1);
  }
  require(plan.criticalTaskIds.join('\0') === graph.order.filter(id => byId.get(id).slackWorkdays === 0).join('\0'));
}

export function calculateBackplan(raw, { onProgress = () => {} } = {}) {
  const validated = validateProject(raw);
  if (!validated.ok) throw new PlanError('VALIDATION', validated.errors);
  const input = validated.input;
  onProgress({ phase: 'validate', completed: input.tasks.length, unit: 'tasks' });
  let graph;
  try { graph = analyzeGraph(input.tasks); }
  catch (error) {
    if (error instanceof GraphError) throw new PlanError(error.code, [{ code: error.code, field: 'tasks', ...(error.cycles ? { cycles: error.cycles } : {}) }]);
    throw new PlanError('INTERNAL_ERROR');
  }
  onProgress({ phase: 'graph', completed: graph.order.length, unit: 'tasks' });
  let calendar;
  try { calendar = buildWorkdayCalendar(input.deadline, input.workweek, input.holidays, graph.longestPathWorkdays, { onProgress }); }
  catch { throw new PlanError('INTERNAL_ERROR'); }
  const byId = new Map(input.tasks.map(task => [task.id, task]));
  const indices = new Map();
  graph.order.forEach((id, i) => {
    const predecessors = graph.predecessors.get(id);
    const ES = predecessors.length ? Math.max(...predecessors.map(pred => indices.get(pred).EF)) + 1 : 0;
    indices.set(id, { ES, EF: ES + byId.get(id).durationWorkdays - 1 });
    onProgress({ phase: 'forward', completed: i + 1, unit: 'tasks' });
  });
  [...graph.order].reverse().forEach((id, i) => {
    const successors = graph.successors.get(id);
    const LF = successors.length ? Math.min(...successors.map(next => indices.get(next).LS)) - 1 : graph.longestPathWorkdays - 1;
    Object.assign(indices.get(id), { LF, LS: LF - byId.get(id).durationWorkdays + 1 });
    onProgress({ phase: 'backward', completed: i + 1, unit: 'tasks' });
  });
  const tasks = input.tasks.map(task => {
    const ix = indices.get(task.id);
    if (Object.values(ix).some(i => !Number.isInteger(i) || i < 0 || i >= calendar.workdayDates.length) || ix.LS < ix.ES) throw new PlanError('INTERNAL_ERROR');
    return {
      ...task,
      ES: calendar.workdayDates[ix.ES], EF: calendar.workdayDates[ix.EF],
      LS: calendar.workdayDates[ix.LS], LF: calendar.workdayDates[ix.LF],
      slackWorkdays: ix.LS - ix.ES, critical: ix.LS === ix.ES
    };
  });
  const plan = {
    schema: 'gq.backplan', version: 1,
    settings: {
      deadline: input.deadline, effectiveDeadline: calendar.effectiveDeadline,
      deadlineAdjusted: calendar.deadlineAdjusted, deadlineAdjustmentDays: calendar.deadlineAdjustmentDays,
      workweek: input.workweek, holidays: input.holidays
    },
    anchor: calendar.anchor, longestPathWorkdays: graph.longestPathWorkdays,
    tasks,
    criticalTaskIds: graph.order.filter(id => indices.get(id).ES === indices.get(id).LS)
  };
  assertSchedule(plan, graph, calendar);
  return plan;
}
