import { fail, validateCards } from './schema.mjs';

export function validateSeed(seed) {
  if (!Number.isInteger(seed) || seed < 1 || seed > 4294967295) fail('INVALID_SEED', 'seed');
  return seed;
}
export function shuffledOrder(ids, seed) {
  let value = validateSeed(seed) >>> 0;
  const order = [...ids];
  for (let i = order.length - 1; i > 0; i--) {
    value ^= value << 13; value ^= value >>> 17; value ^= value << 5;
    value >>>= 0;
    const j = Math.floor((value / 4294967296) * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}
function batch(state, mode, baseOrder = state.baseOrder) {
  const order = baseOrder.filter(id => mode === 'all' || !state.known.has(id));
  return { ...state, mode, baseOrder, order, position: 0, currentId: order[0] ?? null, revealed: false, ended: order.length === 0 };
}
export function createSession(cards, { seed = 1, shuffle = false, known = [] } = {}) {
  const validated = validateCards(cards);
  validateSeed(seed);
  if (typeof shuffle !== 'boolean' || !Array.isArray(known)) fail('INVALID_SESSION');
  const ids = validated.map(card => card.id);
  if (new Set(known).size !== known.length || known.some(id => !ids.includes(id))) fail('INVALID_REFERENCE', 'json');
  const baseOrder = shuffle ? shuffledOrder(ids, seed) : ids;
  return batch({ cards: validated, known: new Set(known), seed, shuffle }, 'all', baseOrder);
}
export function reduceSession(state, event) {
  if (!event || typeof event.type !== 'string') fail('INVALID_EVENT');
  switch (event.type) {
    case 'reveal': return state.currentId === null ? state : { ...state, revealed: true };
    case 'assess': {
      if (state.currentId === null || !state.revealed) fail('ANSWER_HIDDEN');
      if (!['known', 'review'].includes(event.value)) fail('INVALID_EVENT');
      const known = new Set(state.known);
      if (event.value === 'known') known.add(state.currentId); else known.delete(state.currentId);
      const position = state.position + 1;
      return { ...state, known, position, currentId: state.order[position] ?? null, revealed: false, ended: position >= state.order.length };
    }
    case 'previous': {
      if (!state.order.length || state.position === 0) return state;
      const position = Math.min(state.position - 1, state.order.length - 1);
      return { ...state, position, currentId: state.order[position], ended: false, revealed: false };
    }
    case 'next': {
      if (state.currentId === null) return state;
      const position = state.position + 1;
      return { ...state, position, currentId: state.order[position] ?? null, revealed: false, ended: position >= state.order.length };
    }
    case 'setMode':
      if (!['all', 'review'].includes(event.mode)) fail('INVALID_EVENT');
      return batch(state, event.mode);
    case 'restart': return batch(state, state.mode);
    case 'reshuffle': {
      const seed = validateSeed(event.seed);
      return batch({ ...state, seed, shuffle: true }, state.mode, shuffledOrder(state.cards.map(card => card.id), seed));
    }
    case 'reset': return batch({ ...state, known: new Set() }, state.mode);
    default: fail('INVALID_EVENT');
  }
}
