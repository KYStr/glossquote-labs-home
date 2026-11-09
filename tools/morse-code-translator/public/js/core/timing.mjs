// Timing expansion (pure; no DOM/network/storage).
// Turns a signal — words of items carrying a `code` run of '.'/'-' — into an
// on/off interval list per REVISED SPEC b612c14d §4: dot 1 unit on, dash 3
// units on, 1 unit off between elements inside an item, 3 units off between
// characters, 7 units off between words, and NO trailing gap after the final
// element. Items with code === null (unknown decode tokens) carry no signal
// and are skipped; gaps are computed between successive coded items.
// This is the identical timing model the duration display and the WebAudio
// playback both consume.

import { TIMING } from "./table.mjs";

// expandTiming(words) -> { intervals, totalUnits, items }
//   intervals: [{ on: boolean, units, item }]  item = global coded-item index
//   items:     [{ index, wordIndex, code, startUnit, endUnit }]  (coded items only;
//               start/end span the item's own elements + internal element gaps)
export function expandTiming(words) {
  const coded = [];
  words.forEach((wordItems, wordIndex) => {
    for (const item of wordItems) {
      if (item && typeof item.code === "string" && item.code.length > 0) {
        coded.push({ wordIndex, code: item.code, source: item });
      }
    }
  });

  const intervals = [];
  const items = [];
  let t = 0;
  let prev = null;

  coded.forEach((entry, g) => {
    if (prev !== null) {
      const gap = entry.wordIndex === prev.wordIndex ? TIMING.letterGap : TIMING.wordGap;
      intervals.push({ on: false, units: gap, item: prev.index });
      t += gap;
    }
    const startUnit = t;
    const elements = [...entry.code];
    elements.forEach((el, ei) => {
      if (ei > 0) {
        intervals.push({ on: false, units: TIMING.elementGap, item: g });
        t += TIMING.elementGap;
      }
      const onUnits = el === "." ? TIMING.dot : TIMING.dash;
      intervals.push({ on: true, units: onUnits, item: g });
      t += onUnits;
    });
    items.push({ index: g, wordIndex: entry.wordIndex, code: entry.code, source: entry.source, startUnit, endUnit: t });
    prev = { wordIndex: entry.wordIndex, index: g };
  });

  return { intervals, totalUnits: t, items };
}
