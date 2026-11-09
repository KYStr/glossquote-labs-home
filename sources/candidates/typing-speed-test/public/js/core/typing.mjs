// Pure core for the Typing Speed Test.
//
// Positional scoring exactly as SPEC section 4 pins it: the attempt
// state is one committed string; position i is correct iff typed[i]
// equals passage[i] as Unicode code points; there is no realignment.
// English scores gross/net WPM from total / correct characters;
// Chinese scores gross/net CPM and never WPM. The session state
// machine owns the timing rules over an injected monotonic clock:
// the first committed character starts the timer, expiry locks with
// the full chosen duration, completion locks with the actual elapsed
// seconds to one decimal. Zero DOM access, zero dependencies.

export function codePoints(text) {
  return [...String(text ?? "")];
}

export function comparePositions(passage, typed) {
  const expected = codePoints(passage);
  const actual = codePoints(typed);
  return actual.map((ch, index) => ch === expected[index]);
}

export function countCorrect(passage, typed) {
  return comparePositions(passage, typed).filter(Boolean).length;
}

// Halves away from zero (all scored quantities are non-negative, but
// the rule is stated generally in the SPEC and implemented as such).
export function roundHalfAway(value) {
  return Math.sign(value) * Math.round(Math.abs(value));
}

export function formatAccuracy(correct, total) {
  if (total === 0) return null;
  const percent = (100 * correct) / total;
  return `${(roundHalfAway(percent * 10) / 10).toFixed(1)}%`;
}

// Scores a locked attempt. elapsedSeconds is the chosen duration at
// expiry or the actual elapsed seconds (one decimal) at completion.
// netWPM is defined directly from correct characters, never as
// gross x accuracy, so rounding can never disagree (SPEC section 4).
export function scoreAttempt({ passageLang, typed, correct, elapsedSeconds }) {
  const total = codePoints(typed).length;
  if (total === 0) return { noResult: true, total: 0, correct: 0 };
  const minutes = elapsedSeconds / 60;
  const grossRaw = passageLang === "zh" ? total / minutes : total / 5 / minutes;
  const netRaw = passageLang === "zh" ? correct / minutes : correct / 5 / minutes;
  return {
    noResult: false,
    total,
    correct,
    elapsedSeconds,
    unit: passageLang === "zh" ? "CPM" : "WPM",
    gross: grossRaw,
    net: netRaw,
    grossDisplay: roundHalfAway(grossRaw),
    netDisplay: roundHalfAway(netRaw),
    accuracyDisplay: formatAccuracy(correct, total),
  };
}

// Review grouping (SPEC section 4): English by word — a word is a
// maximal run between spaces, listed once if any of its typed
// positions is wrong, with the expected word and the typed substring
// at those positions. Chinese by character with occurrence counts.
// Positions beyond the typed length are not attempted, not errors.
export function reviewMistakes(passage, typed) {
  const expected = codePoints(passage);
  const actual = codePoints(typed);
  const total = actual.length;
  const wrongAt = (index) => index < total && actual[index] !== expected[index];
  const isCjk = expected.some((ch) => ch.codePointAt(0) >= 0x3400);
  if (!isCjk) {
    const entries = [];
    let index = 0;
    while (index < expected.length) {
      if (expected[index] === " ") {
        index += 1;
        continue;
      }
      const start = index;
      while (index < expected.length && expected[index] !== " ") index += 1;
      const end = index;
      let mistyped = false;
      for (let i = start; i < end; i += 1) if (wrongAt(i)) mistyped = true;
      if (mistyped) {
        entries.push({
          expected: expected.slice(start, end).join(""),
          typed: actual.slice(start, Math.min(end, total)).join(""),
        });
      }
    }
    return { kind: "words", entries };
  }
  const counts = new Map();
  for (let i = 0; i < Math.min(total, expected.length); i += 1) {
    if (actual[i] !== expected[i]) {
      const key = `${expected[i]}${actual[i]}`;
      const existing = counts.get(key);
      if (existing) existing.count += 1;
      else counts.set(key, { expected: expected[i], typed: actual[i], count: 1 });
    }
  }
  return { kind: "chars", entries: [...counts.values()] };
}

const EN_ALLOWED_PUNCT = new Set([..." .,;:'?!"]);
const ZH_ALLOWED_PUNCT = new Set([..."，。、；：？！「」"]);

// Passage content validation (SPEC section 4): length windows, the
// exact character sets, single spaces (English) / no spaces (Chinese),
// no edge spaces, BMP-only, and no combining sequences — so code
// points and UTF-16 units coincide for every shipped passage.
export function validatePassage(text, lang) {
  const violations = [];
  const chars = codePoints(text);
  if (lang === "en") {
    if (chars.length < 600 || chars.length > 900) violations.push("LENGTH");
    if (text.startsWith(" ") || text.endsWith(" ")) violations.push("EDGE_SPACE");
    if (text.includes("  ")) violations.push("DOUBLE_SPACE");
    for (const ch of chars) {
      const cp = ch.codePointAt(0);
      if (cp > 0xffff) violations.push("NON_BMP");
      if (cp >= 0x0300 && cp <= 0x036f) violations.push("COMBINING");
      if (!/[A-Za-z]/.test(ch) && !EN_ALLOWED_PUNCT.has(ch)) violations.push("CHARSET");
    }
  } else {
    if (chars.length < 300 || chars.length > 500) violations.push("LENGTH");
    if (text.includes(" ")) violations.push("SPACE_IN_ZH");
    for (const ch of chars) {
      const cp = ch.codePointAt(0);
      if (cp > 0xffff) violations.push("NON_BMP");
      if (cp >= 0x0300 && cp <= 0x036f) violations.push("COMBINING");
      const isCjk = (cp >= 0x4e00 && cp <= 0x9fff) || (cp >= 0x3400 && cp <= 0x4dbf);
      if (!isCjk && !ZH_ALLOWED_PUNCT.has(ch)) violations.push("CHARSET");
    }
  }
  return [...new Set(violations)];
}

// Draws passages without repetition until the set is exhausted, then
// reshuffles (SPEC section 2). The random source is injected.
export function createPassageDeck(passages, random = Math.random) {
  let order = [];
  let cursor = 0;
  function reshuffle() {
    order = passages.map((_, index) => index);
    for (let i = order.length - 1; i > 0; i -= 1) {
      const j = Math.floor(random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    cursor = 0;
  }
  reshuffle();
  return {
    next() {
      if (cursor >= order.length) reshuffle();
      const passage = passages[order[cursor]];
      cursor += 1;
      return passage;
    },
  };
}

// The attempt state machine. `now` is an injected monotonic clock in
// milliseconds (performance.now in the browser, a fake in tests).
// Composed (IME) text never reaches this machine: the controller only
// forwards committed strings, so composition is never scored and a
// commit is what starts the timer (SPEC sections 3 and 4).
export class AttemptSession {
  constructor({ passage, durationSeconds, now }) {
    this.passage = passage;
    this.passagePoints = codePoints(passage);
    this.durationSeconds = durationSeconds;
    this.now = now;
    this.typed = "";
    this.startedAtMs = null;
    this.locked = false;
    this.endReason = null;
    this.elapsedUsed = null;
  }

  get state() {
    if (this.locked) return "locked";
    return this.startedAtMs === null ? "setup" : "running";
  }

  // Replaces the committed string (typing and backspace both arrive
  // here as the new whole string). Characters beyond the passage
  // length are refused. Returns what changed for the controller.
  setTyped(nextText) {
    if (this.locked) return { accepted: false, reason: "locked" };
    const points = codePoints(nextText).slice(0, this.passagePoints.length);
    const next = points.join("");
    const grew = points.length > codePoints(this.typed).length;
    this.typed = next;
    if (this.startedAtMs === null && points.length > 0) {
      this.startedAtMs = this.now();
    }
    if (points.length === this.passagePoints.length && points.length > 0) {
      this.lock("completion");
    } else if (grew) {
      this.checkExpiry();
    }
    return { accepted: true, started: this.startedAtMs !== null, locked: this.locked };
  }

  checkExpiry() {
    if (this.locked || this.startedAtMs === null) return false;
    if (this.now() - this.startedAtMs >= this.durationSeconds * 1000) {
      this.lock("expiry");
      return true;
    }
    return false;
  }

  lock(reason) {
    this.locked = true;
    this.endReason = reason;
    if (reason === "expiry") {
      this.elapsedUsed = this.durationSeconds;
    } else {
      const raw = (this.now() - this.startedAtMs) / 1000;
      this.elapsedUsed = Math.round(raw * 10) / 10;
    }
  }

  remainingSeconds() {
    if (this.startedAtMs === null) return this.durationSeconds;
    if (this.locked) return 0;
    const left = this.durationSeconds - (this.now() - this.startedAtMs) / 1000;
    return Math.max(0, left);
  }

  result() {
    if (!this.locked) return null;
    const correct = countCorrect(this.passage, this.typed);
    const isZh = this.passagePoints.some((ch) => ch.codePointAt(0) >= 0x3400);
    return scoreAttempt({
      passageLang: isZh ? "zh" : "en",
      typed: this.typed,
      correct,
      elapsedSeconds: this.elapsedUsed,
    });
  }
}
