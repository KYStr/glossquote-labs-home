// Session state machine for the CSS Specificity Comparator (SPEC §2).
// Pure and DOM-free: the DOM layer (app.mjs) renders from this state and
// forwards events. State: idle -> dirty -> result | invalid; any edit or
// pagehide clears results/errors immediately.

import { compareSelectors } from './core.mjs';

export const INITIAL_LEFT = '#card .title';
export const INITIAL_RIGHT = '.card h2.title';

export function createSession(lang) {
  return {
    lang: lang === 'en' ? 'en' : 'zh',
    left: INITIAL_LEFT,
    right: INITIAL_RIGHT,
    phase: 'idle', // idle | dirty | invalid | result
    result: null,
    errors: [],
    grammarOpen: false,
  };
}

export function setField(session, field, value) {
  if (field !== 'left' && field !== 'right') return session;
  session[field] = value;
  session.result = null;
  session.errors = [];
  session.phase = 'dirty';
  return session;
}

export function compare(session) {
  const outcome = compareSelectors({ left: session.left, right: session.right });
  if (outcome.ok) {
    session.result = outcome;
    session.errors = [];
    session.phase = 'result';
    return { focusField: null };
  }
  session.result = null;
  session.errors = outcome.errors;
  session.phase = 'invalid';
  const first = outcome.errors.find((e) => e.field === 'left' || e.field === 'right');
  return { focusField: first ? first.field : null };
}

export function reset(session) {
  session.left = INITIAL_LEFT;
  session.right = INITIAL_RIGHT;
  session.result = null;
  session.errors = [];
  session.phase = 'idle';
  session.grammarOpen = false;
  return session;
}

export function setLanguage(session, lang) {
  // Preserves both raw strings, phase, structured result/error and the
  // disclosure-open state; only the language changes (SPEC §2).
  session.lang = lang === 'en' ? 'en' : 'zh';
  return session;
}

export function setGrammarOpen(session, open) {
  session.grammarOpen = open === true;
  return session;
}

// pagehide / pageshow: results and errors are cleared and a fresh Compare is
// required; the in-memory raw strings are retained (SPEC §2).
export function hideResults(session) {
  session.result = null;
  session.errors = [];
  session.phase = 'dirty';
  return session;
}
