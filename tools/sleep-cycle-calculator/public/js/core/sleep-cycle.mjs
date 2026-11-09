// Sleep Cycle Calculator — pure core.
// Implements docs/specs/sleep-cycle-calculator/SPEC.md section 4 exactly:
// all times are minutes since midnight (0–1439), one cycle is exactly
// 90 minutes, latency is a whole number of minutes 0–60 kept strictly
// outside the cycles, and day labels come from the unwrapped raw value,
// never from the displayed clock face. No DOM, network or storage here.

export const CYCLE_MINUTES = 90;
export const DAY_MINUTES = 1440;
export const LATENCY_MIN = 0;
export const LATENCY_MAX = 60;
export const LATENCY_DEFAULT = 15;

// Row order is normative: most sleep first when planning a bedtime,
// earliest wake first when planning from a bedtime.
export const WAKE_DIRECTION_CYCLES = Object.freeze([6, 5, 4, 3]);
export const BED_DIRECTION_CYCLES = Object.freeze([3, 4, 5, 6]);
export const RECOMMENDED_CYCLES = Object.freeze([5, 6]);

export const LABEL_KEYS = Object.freeze({
  PREVIOUS_EVENING: "previous-evening",
  SAME_MORNING: "same-morning",
  NEXT_MORNING: "next-morning",
  SAME_EVENING_NIGHT: "same-evening-night",
});

const TIME_PATTERN = /^([0-9]{2}):([0-9]{2})$/;

// Strict HH:MM parse: exactly two digits per field, hours 0–23,
// minutes 0–59. Returns minutes since midnight, or null when refused.
export function parseTime(value) {
  if (typeof value !== "string") return null;
  const match = TIME_PATTERN.exec(value);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

// Latency parse: a whole number of minutes, 0–60 inclusive. Accepts a
// number or its plain decimal string form; refuses fractions, signs
// outside the range, empty and non-numeric input. Returns the number,
// or null when refused.
export function parseLatency(value) {
  if (typeof value === "number") {
    if (!Number.isInteger(value)) return null;
    return value >= LATENCY_MIN && value <= LATENCY_MAX ? value : null;
  }
  if (typeof value === "string") {
    if (!/^[0-9]+$/.test(value)) return null;
    const parsed = Number(value);
    return parsed >= LATENCY_MIN && parsed <= LATENCY_MAX ? parsed : null;
  }
  return null;
}

// Mathematical (non-negative) modulo: -135 mod 1440 = 1305.
export function modDay(rawMinutes) {
  return ((rawMinutes % DAY_MINUTES) + DAY_MINUTES) % DAY_MINUTES;
}

export function formatClock(minutesSinceMidnight) {
  const hours = Math.floor(minutesSinceMidnight / 60);
  const minutes = minutesSinceMidnight % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

// Durations display as H:MM (e.g. 450 -> "7:30", 555 -> "9:15").
export function formatDuration(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}:${String(minutes).padStart(2, "0")}`;
}

function buildRow(cycles, rawMinutes, labelKey, latency) {
  const sleepMinutes = cycles * CYCLE_MINUTES;
  const inBedMinutes = latency + sleepMinutes;
  const minutes = modDay(rawMinutes);
  return Object.freeze({
    cycles,
    rawMinutes,
    minutes,
    time: formatClock(minutes),
    labelKey,
    sleepMinutes,
    sleep: formatDuration(sleepMinutes),
    inBedMinutes,
    inBed: formatDuration(inBedMinutes),
    recommended: RECOMMENDED_CYCLES.includes(cycles),
    shortNight: cycles === 3,
  });
}

// Wake direction: given the wake time W, bedtime = W - L - 90n.
// Label: "previous evening" when raw < 0, otherwise "same morning".
export function bedtimeRows(wakeMinutes, latency) {
  return WAKE_DIRECTION_CYCLES.map((cycles) => {
    const raw = wakeMinutes - latency - cycles * CYCLE_MINUTES;
    const labelKey = raw < 0 ? LABEL_KEYS.PREVIOUS_EVENING : LABEL_KEYS.SAME_MORNING;
    return buildRow(cycles, raw, labelKey, latency);
  });
}

// Bed direction: given the bedtime B, wake time = B + L + 90n.
// Label: "next morning" when raw >= 1440, otherwise "same evening/night".
export function wakeTimeRows(bedMinutes, latency) {
  return BED_DIRECTION_CYCLES.map((cycles) => {
    const raw = bedMinutes + latency + cycles * CYCLE_MINUTES;
    const labelKey = raw >= DAY_MINUTES ? LABEL_KEYS.NEXT_MORNING : LABEL_KEYS.SAME_EVENING_NIGHT;
    return buildRow(cycles, raw, labelKey, latency);
  });
}
