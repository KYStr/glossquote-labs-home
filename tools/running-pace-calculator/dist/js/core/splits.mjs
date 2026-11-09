// Even-pace split table (SPEC section 4).
// Markers sit at each whole unit of the chosen distance unit: step 1 while
// the whole-unit count is at most 100, otherwise step 5. A finish row at the
// exact distance is added when the distance is not itself a marker.
// Cumulative at a marker = round(pace per unit x marker) to whole seconds.
// Segment times are the differences of successive displayed (rounded)
// cumulatives, so the printed segments always sum exactly to the printed
// total. This is deliberate: rounding exact segment durations independently
// could make the printed rows contradict the printed total.

import { SPLIT_STEP_THRESHOLD } from './constants.mjs';
import { formatTrimmed, roundHalfAwayFromZero } from './time.mjs';
import { distanceInUnit, pacePerUnit } from './units.mjs';

export function buildSplits({ timeSeconds, distanceKm, paceSecondsPerKm, unit }) {
  const distU = distanceInUnit(distanceKm, unit);
  const paceU = pacePerUnit(paceSecondsPerKm, unit);
  const step = Math.floor(distU) <= SPLIT_STEP_THRESHOLD ? 1 : 5;
  const lastMarker = Math.floor(distU / step) * step;

  const rows = [];
  let previousCumulative = 0;
  for (let marker = step; marker <= lastMarker; marker += step) {
    const cumulative = roundHalfAwayFromZero(paceU * marker);
    rows.push({
      label: String(marker),
      marker,
      isFinish: false,
      segmentSeconds: cumulative - previousCumulative,
      cumulativeSeconds: cumulative,
    });
    previousCumulative = cumulative;
  }

  if (distU - lastMarker > 1e-9) {
    const cumulative = roundHalfAwayFromZero(timeSeconds);
    rows.push({
      label: formatTrimmed(distU, 2),
      marker: null,
      isFinish: true,
      segmentSeconds: cumulative - previousCumulative,
      cumulativeSeconds: cumulative,
    });
  }

  return { step, rows };
}
