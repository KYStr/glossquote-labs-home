import { parseLimit, validateSource, splitText } from './core/text-chunker.mjs';

const ticketOwners = new WeakMap();

function idleCopy(requestId = 0) {
  return { busy: false, requestId, revision: null, index: null, status: 'idle' };
}

export function createState() {
  return {
    source: '', limitRaw: '280', mode: 'strict', revision: 0,
    result: null, fieldErrors: {}, copy: idleCopy(), disposed: false
  };
}

export function validateDraft(state) {
  const source = validateSource(state.source);
  const limit = parseLimit(state.limitRaw);
  state.fieldErrors = {};
  if (!source.ok) state.fieldErrors.source = source.code;
  if (!limit.ok) state.fieldErrors.limit = limit.code;
  if (state.mode !== 'strict' && state.mode !== 'prefer-lf') state.fieldErrors.mode = 'INVALID_MODE';
  return { source, limit };
}

export function changeDraft(state, field, raw) {
  if (state.disposed || state.copy.busy || !['source', 'limitRaw', 'mode'].includes(field)) return false;
  state[field] = raw;
  state.revision += 1;
  state.result = null;
  state.copy = idleCopy(state.copy.requestId + 1);
  validateDraft(state);
  return true;
}

export function calculate(state) {
  if (state.disposed || state.copy.busy) return null;
  const draft = validateDraft(state);
  state.result = null;
  state.copy = idleCopy(state.copy.requestId + 1);
  if (!draft.source.ok) return { ok: false, code: draft.source.code };
  if (!draft.limit.ok) return { ok: false, code: draft.limit.code };
  const result = splitText({ source: state.source, limit: draft.limit.value, mode: state.mode });
  if (result.ok) state.result = result;
  return result;
}

export function clearDraft(state) {
  if (state.disposed || state.copy.busy) return false;
  state.source = '';
  state.limitRaw = '280';
  state.mode = 'strict';
  state.result = null;
  state.fieldErrors = {};
  state.revision += 1;
  state.copy = idleCopy(state.copy.requestId + 1);
  return true;
}

export function beginCopy(state, index) {
  if (state.disposed || state.copy.busy || !state.result?.ok) return null;
  if (!Number.isInteger(index) || !state.result.chunks.some(chunk => chunk.index === index)) return null;
  const ticket = { requestId: state.copy.requestId + 1, revision: state.revision, index };
  ticketOwners.set(ticket, state);
  state.copy = { ...ticket, busy: true, status: 'busy' };
  return ticket;
}

export function copyIsCurrent(state, ticket) {
  return ticketOwners.get(ticket) === state && !state.disposed && state.copy.busy && state.copy.requestId === ticket.requestId &&
    state.revision === ticket.revision && state.copy.revision === ticket.revision;
}

export function finishCopy(state, ticket, status) {
  if (!copyIsCurrent(state, ticket) || !['copied', 'fallback'].includes(status)) return false;
  state.copy.busy = false;
  state.copy.status = status;
  return true;
}

export function dispose(state) {
  state.disposed = true;
  state.source = '';
  state.limitRaw = '';
  state.result = null;
  state.fieldErrors = {};
  state.revision += 1;
  state.copy = idleCopy(state.copy.requestId + 1);
}
