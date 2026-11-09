// Calculator state machine (pure, no DOM). Implements the lifecycle of
// SPEC section 3:
// - solve-for selects which field is the read-only output; the other two
//   are inputs. Switching direction never discards the user's numbers: a
//   field keeps its previous text, which becomes its starting input again.
// - Editing any input recomputes the output, splits and predictions
//   together. While any input is invalid, the outputs freeze at the last
//   valid state, flagged stale ("out of date").
// - Distance-unit switching converts the distance value and pace display
//   from the unrounded internal store, never from rounded display text,
//   and does not itself change the solved results.

import {
  buildView,
  distanceInputText,
  paceInputText,
  solveForDistance,
  solveForPace,
  solveForTime,
} from './solver.mjs';
import { formatTime } from './time.mjs';
import { parseDistanceField, parsePaceField, parseTimeField } from './validate.mjs';

const INPUT_FIELDS = {
  pace: ['time', 'distance'],
  time: ['pace', 'distance'],
  distance: ['time', 'pace'],
};

export function createCalculator() {
  const state = {
    solveFor: 'pace',
    unit: 'km',
    texts: { time: '55:00', distance: '10', pace: '' },
    errors: {},
    store: null,
    stale: false,
  };

  function parseInputs() {
    const parsed = {};
    const errors = {};
    for (const field of INPUT_FIELDS[state.solveFor]) {
      const result =
        field === 'time'
          ? parseTimeField(state.texts.time)
          : field === 'pace'
            ? parsePaceField(state.texts.pace, state.unit)
            : parseDistanceField(state.texts.distance, state.unit);
      if (result.ok) parsed[field] = result;
      else errors[field] = result;
    }
    return { parsed, errors };
  }

  function recompute() {
    const { parsed, errors } = parseInputs();
    state.errors = errors;
    if (Object.keys(errors).length > 0) {
      state.stale = state.store !== null;
      return;
    }
    if (state.solveFor === 'pace') {
      state.store = solveForPace(parsed.time.seconds, parsed.distance.km);
    } else if (state.solveFor === 'time') {
      state.store = solveForTime(parsed.pace.secondsPerKm, parsed.distance.km);
    } else {
      state.store = solveForDistance(parsed.time.seconds, parsed.pace.secondsPerKm);
    }
    state.stale = false;
  }

  function seedEmptyInput(field) {
    if (state.texts[field] !== '' || state.store === null) return;
    if (field === 'time') state.texts.time = formatTime(state.store.timeSeconds);
    else if (field === 'distance') {
      state.texts.distance = distanceInputText(state.store.distanceKm, state.unit);
    } else state.texts.pace = paceInputText(state.store.paceSecondsPerKm, state.unit);
  }

  recompute();

  return {
    setField(field, text) {
      state.texts[field] = String(text);
      recompute();
    },

    setSolveFor(next) {
      if (!INPUT_FIELDS[next] || next === state.solveFor) return;
      state.solveFor = next;
      for (const field of INPUT_FIELDS[next]) seedEmptyInput(field);
      recompute();
    },

    setUnit(next) {
      if (next === state.unit || (next !== 'km' && next !== 'mi')) return;
      const wasValid = Object.keys(state.errors).length === 0;
      state.unit = next;
      if (state.store !== null) {
        // Re-express the field texts from the unrounded store. The store
        // itself is left untouched, so the displayed results cannot drift.
        state.texts.distance = distanceInputText(state.store.distanceKm, next);
        if (state.texts.pace !== '') {
          state.texts.pace = paceInputText(state.store.paceSecondsPerKm, next);
        }
      }
      if (wasValid) {
        // Texts derived from a valid store are valid; just re-check them
        // without re-solving, so nothing is recomputed from rounded text.
        const { errors } = parseInputs();
        state.errors = errors;
        state.stale = Object.keys(errors).length > 0;
      } else {
        recompute();
      }
    },

    getState() {
      return {
        solveFor: state.solveFor,
        unit: state.unit,
        texts: { ...state.texts },
        errors: state.errors,
        stale: state.stale,
        store: state.store === null ? null : { ...state.store },
        view: state.store === null ? null : buildView(state.store, state.unit),
      };
    },
  };
}
