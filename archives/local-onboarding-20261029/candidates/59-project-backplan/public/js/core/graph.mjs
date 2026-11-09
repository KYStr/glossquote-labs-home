export class GraphError extends Error {
  constructor(code, details = {}) {
    super(code);
    this.code = code;
    Object.assign(this, details);
  }
}

export function buildGraph(tasks, edges) {
  if (!Array.isArray(tasks) || tasks.length < 1 || tasks.length > 100) throw new GraphError('TASK_LIMIT');
  const ids = tasks.map(task => task.id);
  if (new Set(ids).size !== ids.length || ids.some(id => typeof id !== 'string' || !/^[A-Za-z0-9._-]{1,32}$/.test(id))) throw new GraphError('ID_INVALID');
  const predecessors = new Map(ids.map(id => [id, []]));
  const successors = new Map(ids.map(id => [id, []]));
  const pairs = edges ?? tasks.flatMap(task => task.predecessors.map(pred => [pred, task.id]));
  if (!Array.isArray(pairs) || pairs.length > 500) throw new GraphError('DEPENDENCY_LIMIT');
  const seen = new Set();
  for (const pair of pairs) {
    if (!Array.isArray(pair) || pair.length !== 2 || !predecessors.has(pair[0]) || !predecessors.has(pair[1])) throw new GraphError('UNKNOWN_PREDECESSOR');
    const [from, to] = pair;
    const key = `${from}\0${to}`;
    if (seen.has(key)) throw new GraphError('DUPLICATE_EDGE');
    seen.add(key);
    predecessors.get(to).push(from);
    successors.get(from).push(to);
  }
  const orderIndex = new Map(ids.map((id, i) => [id, i]));
  for (const list of [...predecessors.values(), ...successors.values()]) list.sort((a, b) => orderIndex.get(a) - orderIndex.get(b));
  return { ids, predecessors, successors, orderIndex };
}

function cyclesIn(graph, candidates = new Set(graph.ids)) {
  const state = new Map();
  const stack = [];
  const cycles = [];
  function visit(id) {
    state.set(id, 1);
    stack.push(id);
    for (const next of graph.successors.get(id)) {
      if (!candidates.has(next)) continue;
      if (!state.has(next)) visit(next);
      else if (state.get(next) === 1) cycles.push([...stack.slice(stack.indexOf(next)), next]);
    }
    stack.pop();
    state.set(id, 2);
  }
  for (const id of graph.ids) if (candidates.has(id) && !state.has(id)) visit(id);
  return cycles;
}

export function findCyclePaths(tasks, edges) {
  return cyclesIn(buildGraph(tasks, edges));
}

export function topologicalOrder(tasks, edges) {
  const graph = buildGraph(tasks, edges);
  const degree = new Map(graph.ids.map(id => [id, graph.predecessors.get(id).length]));
  const ready = graph.ids.filter(id => degree.get(id) === 0);
  const order = [];
  while (ready.length) {
    ready.sort((a, b) => graph.orderIndex.get(a) - graph.orderIndex.get(b));
    const id = ready.shift();
    order.push(id);
    for (const next of graph.successors.get(id)) {
      degree.set(next, degree.get(next) - 1);
      if (degree.get(next) === 0) ready.push(next);
    }
  }
  if (order.length !== tasks.length) {
    const remaining = new Set(graph.ids.filter(id => degree.get(id) > 0));
    throw new GraphError('CYCLE', { cycles: cyclesIn(graph, remaining) });
  }
  return order;
}

export function analyzeGraph(tasks) {
  const graph = buildGraph(tasks);
  const order = topologicalOrder(tasks);
  const byId = new Map(tasks.map(task => [task.id, task]));
  const longestTo = new Map();
  for (const id of order) {
    const duration = byId.get(id).durationWorkdays;
    if (!Number.isSafeInteger(duration) || duration < 1 || duration > 260) throw new GraphError('DURATION_INVALID');
    longestTo.set(id, duration + Math.max(0, ...graph.predecessors.get(id).map(pred => longestTo.get(pred))));
  }
  return { ...graph, order, longestTo, longestPathWorkdays: Math.max(...longestTo.values()) };
}
