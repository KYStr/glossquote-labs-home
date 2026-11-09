// Solving the pace / time / distance triangle and building the full view
// model from the unrounded internal store (seconds, kilometres).
//   pace_s_per_km = time_s / distance_km
//   time_s        = pace_s_per_km x distance_km
//   distance_km   = time_s / pace_s_per_km

import { buildPredictions } from './riegel.mjs';
import { buildSplits } from './splits.mjs';
import { formatFixed, formatTime, formatTrimmed } from './time.mjs';
import { distanceInUnit, pacePerUnit } from './units.mjs';

export function solveForPace(timeSeconds, distanceKm) {
  return {
    timeSeconds,
    distanceKm,
    paceSecondsPerKm: timeSeconds / distanceKm,
  };
}

export function solveForTime(paceSecondsPerKm, distanceKm) {
  return {
    timeSeconds: paceSecondsPerKm * distanceKm,
    distanceKm,
    paceSecondsPerKm,
  };
}

export function solveForDistance(timeSeconds, paceSecondsPerKm) {
  return {
    timeSeconds,
    distanceKm: timeSeconds / paceSecondsPerKm,
    paceSecondsPerKm,
  };
}

/**
 * Everything the page displays, derived from the store in one pass:
 * solved-value texts, the split table and the prediction table.
 */
export function buildView(store, unit) {
  return {
    timeText: formatTime(store.timeSeconds),
    distanceText: formatFixed(distanceInUnit(store.distanceKm, unit), 2),
    paceText: formatTime(pacePerUnit(store.paceSecondsPerKm, unit)),
    splits: buildSplits({ ...store, unit }),
    predictions: buildPredictions({ ...store, unit }),
  };
}

/** Distance re-expressed as an input-field text after a unit switch. */
export function distanceInputText(distanceKm, unit) {
  return formatTrimmed(distanceInUnit(distanceKm, unit), 4);
}

/** Pace re-expressed as an input-field text after a unit switch. */
export function paceInputText(paceSecondsPerKm, unit) {
  return formatTime(pacePerUnit(paceSecondsPerKm, unit));
}
