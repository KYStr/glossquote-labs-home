// Distance-unit helpers. The internal store is always seconds and kilometres
// (SPEC section 4); conversions happen only at the edges, from the unrounded
// store, never from rounded display text.

import { MILE_KM } from './constants.mjs';
import { roundTo } from './time.mjs';

/** How many kilometres one chosen unit is (km: 1, mi: MILE_KM). */
export function unitFactor(unit) {
  return unit === 'mi' ? MILE_KM : 1;
}

/** Distance expressed in the chosen unit, snapped to 1e-9 to absorb FP noise. */
export function distanceInUnit(distanceKm, unit) {
  return roundTo(distanceKm / unitFactor(unit), 9);
}

/** Pace expressed as seconds per chosen unit. */
export function pacePerUnit(paceSecondsPerKm, unit) {
  return paceSecondsPerKm * unitFactor(unit);
}
