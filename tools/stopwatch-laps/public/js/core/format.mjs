// Pure formatting for the stopwatch core (SPEC section 4).
// No DOM, no network, no storage, no clock access.

// Format a duration for display. The input is floored to whole
// milliseconds first; centiseconds are truncated (floor), never rounded.
// T < 3,600,000 -> "MM:SS.cc"; T >= 3,600,000 -> "H:MM:SS.cc" with H
// unbounded and without a leading zero.
export function formatDuration(ms) {
  const T = Math.floor(ms);
  const cc = Math.floor((T % 1000) / 10);
  const totalSeconds = Math.floor(T / 1000);
  const ss = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const pad = (n) => String(n).padStart(2, "0");
  if (T < 3600000) {
    return `${pad(totalMinutes)}:${pad(ss)}.${pad(cc)}`;
  }
  const h = Math.floor(totalMinutes / 60);
  const mm = totalMinutes % 60;
  return `${h}:${pad(mm)}:${pad(ss)}.${pad(cc)}`;
}

// Format whole milliseconds as seconds with exactly three decimal
// places, computed from the integer so no float artefact can appear
// (45450 -> "45.450", 120000 -> "120.000").
export function formatSeconds3(ms) {
  const whole = Math.trunc(ms);
  const sign = whole < 0 ? "-" : "";
  const abs = Math.abs(whole);
  return `${sign}${Math.floor(abs / 1000)}.${String(abs % 1000).padStart(3, "0")}`;
}
