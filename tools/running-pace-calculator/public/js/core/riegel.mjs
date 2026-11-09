// Riegel race predictions (SPEC section 4):
//   T2 = T1 x (D2 / D1) ^ 1.06
// for the four fixed target distances only; nothing is extrapolated beyond
// the marathon. The row whose target equals the known distance exactly
// shows the actual time and is flagged isInput ("your input").

import { RIEGEL_EXPONENT, RIEGEL_TARGETS_KM } from './constants.mjs';
import { formatTime, roundHalfAwayFromZero } from './time.mjs';
import { pacePerUnit } from './units.mjs';

export function buildPredictions({ timeSeconds, distanceKm, unit }) {
  return RIEGEL_TARGETS_KM.map((targetKm) => {
    const rawSeconds = timeSeconds * Math.pow(targetKm / distanceKm, RIEGEL_EXPONENT);
    return {
      targetKm,
      rawSeconds,
      timeSeconds: roundHalfAwayFromZero(rawSeconds),
      timeText: formatTime(rawSeconds),
      paceText: formatTime(pacePerUnit(rawSeconds / targetKm, unit)),
      isInput: distanceKm === targetKm,
    };
  });
}
