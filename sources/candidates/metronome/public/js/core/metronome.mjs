// Pure core for the WebAudio Metronome with Tap Tempo.
//
// The one-sentence contract (SPEC section 4): every click time is
// computed from the audio clock and scheduled ahead; the UI timer
// exists only to trigger scheduling, never to keep time. This module
// is the lookahead scheduler state machine over an injected audio
// clock and an injected click sink, so the accuracy contract is fully
// testable against a fake clock. Zero DOM and zero WebAudio access.

export const TICK_MS = 25;
export const HORIZON_SECONDS = 0.12;
export const START_DELAY_SECONDS = 0.06;
export const MIN_BPM = 30;
export const MAX_BPM = 240;

// Fixed product choices (SPEC section 4): click frequencies in Hz and
// gains relative to the master volume. The ordering accent > beat >
// subdivision is the contract; the duration cap keeps clicks from
// overlapping at 240 BPM x 4 subdivisions (62.5 ms spacing > 50 ms).
export const CLICK = Object.freeze({
  accent: Object.freeze({ frequency: 1568, gain: 1.0 }),
  beat: Object.freeze({ frequency: 1046, gain: 0.7 }),
  sub: Object.freeze({ frequency: 784, gain: 0.4 }),
  durationSeconds: 0.05,
});

export const SIGNATURES = Object.freeze(
  [
    [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4],
    [2, 8], [3, 8], [6, 8], [9, 8], [12, 8],
  ].map((pair) => Object.freeze(pair)),
);
export const SUBDIVISIONS = Object.freeze([1, 2, 3, 4]);

export function clampBpm(value) {
  const bpm = Math.round(Number(value));
  if (!Number.isFinite(bpm)) return 100;
  return Math.min(MAX_BPM, Math.max(MIN_BPM, bpm));
}

export function gainFor(kind, volume) {
  return CLICK[kind].gain * volume;
}

// Tap tempo (SPEC section 4): a run is a sequence of taps each within
// 2.0 s of the previous one (a longer gap restarts the run). From at
// least 2 taps, BPM = round(60 / mean interval of the last up to 6
// intervals), clamped to 30-240. A single tap only starts a run.
export class TapTempoTracker {
  constructor() {
    this.run = [];
  }

  tap(nowMs) {
    if (this.run.length > 0 && nowMs - this.run[this.run.length - 1] > 2000) {
      this.run = [];
    }
    this.run.push(nowMs);
    if (this.run.length < 2) return null;
    const intervals = [];
    for (let i = Math.max(1, this.run.length - 6); i < this.run.length; i += 1) {
      intervals.push((this.run[i] - this.run[i - 1]) / 1000);
    }
    const mean = intervals.reduce((sum, v) => sum + v, 0) / intervals.length;
    return clampBpm(60 / mean);
  }
}

const HISTORY_LIMIT = 128;

// Lookahead scheduler. `now` returns audio-clock seconds; `emit`
// receives each scheduled event { time, kind, bar, beat, subdivision,
// frequency, gain }; `silence` is called on stop so the adapter can
// cancel already-scheduled sources immediately.
export class Scheduler {
  constructor({ now, emit, silence }) {
    this.now = now;
    this.emit = emit;
    this.silence = silence;
    this.bpm = 100;
    this.beatsPerBar = 4;
    this.beatUnit = 4;
    this.subdivisions = 1;
    this.accentOn = true;
    this.volume = 0.8;
    this.playing = false;
    this.bar = 1;
    this.beat = 0;
    this.sub = 0;
    this.nextNoteTime = 0;
    this.history = [];
  }

  setBpm(value) {
    this.bpm = clampBpm(value);
  }

  setSignature(beatsPerBar, beatUnit) {
    this.beatsPerBar = beatsPerBar;
    this.beatUnit = beatUnit;
  }

  setSubdivisions(value) {
    this.subdivisions = SUBDIVISIONS.includes(value) ? value : 1;
  }

  spacing() {
    return 60 / this.bpm / this.subdivisions;
  }

  kindForCurrent() {
    if (this.sub > 0) return "sub";
    if (this.beat === 0 && this.accentOn) return "accent";
    return "beat";
  }

  start() {
    this.playing = true;
    this.bar = 1;
    this.beat = 0;
    this.sub = 0;
    this.history = [];
    this.nextNoteTime = this.now() + START_DELAY_SECONDS;
  }

  stop() {
    this.playing = false;
    this.silence();
    this.bar = 1;
    this.beat = 0;
    this.sub = 0;
    this.history = [];
  }

  advance() {
    this.nextNoteTime += this.spacing();
    this.sub += 1;
    if (this.sub >= this.subdivisions) {
      this.sub = 0;
      this.beat += 1;
      if (this.beat >= this.beatsPerBar) {
        this.beat = 0;
        this.bar += 1;
      }
    }
  }

  // One scheduler tick (the controller calls this every 25 ms; the
  // timer's jitter never enters event times, which accumulate purely
  // by += spacing from the previous scheduled time). Events whose
  // computed time is already in the past — the tab was hidden and the
  // audio clock advanced — are skipped without emission while their
  // beat positions still advance the counter, so the track resumes
  // in phase with no catch-up burst (SPEC section 4).
  tick() {
    if (!this.playing) return;
    const horizon = this.now() + HORIZON_SECONDS;
    while (this.nextNoteTime < horizon) {
      if (this.beat >= this.beatsPerBar) {
        this.beat = 0;
        this.bar += 1;
      }
      const time = this.nextNoteTime;
      if (time >= this.now()) {
        const kind = this.kindForCurrent();
        const event = {
          time,
          kind,
          bar: this.bar,
          beat: this.beat,
          subdivision: this.sub,
          frequency: CLICK[kind].frequency,
          gain: gainFor(kind, this.volume),
        };
        this.history.push(event);
        if (this.history.length > HISTORY_LIMIT) this.history.shift();
        this.emit(event);
      }
      this.advance();
    }
  }

  // The latest scheduled event whose time has been reached, for the
  // visual indicator; the indicator reads the schedule and the audio
  // clock, never frame or tick counts (SPEC section 4).
  positionAt(seconds) {
    let found = null;
    for (const event of this.history) {
      if (event.time <= seconds) found = event;
      else break;
    }
    return found;
  }
}
