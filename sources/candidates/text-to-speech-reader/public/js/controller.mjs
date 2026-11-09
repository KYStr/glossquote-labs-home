// Speech controller for the Text-to-Speech Reader: the SPEC section 3
// playback state machine (idle / speaking / paused) over an injected
// synthesis interface, so the machine is unit-testable with a fake
// engine and never touches the DOM or the real speechSynthesis here.
//
// The controller speaks exactly one chunk at a time: chunk k + 1 is
// enqueued only when chunk k ends. That makes Stop immediate and lets
// voice/rate/pitch changes (snapshotted by getSettings() at the moment
// a chunk is enqueued, SPEC section 4) apply from the next chunk.
//
// A generation counter guards every utterance callback: Play, Stop and
// an utterance error each advance the generation, so callbacks from a
// cancelled or superseded queue are ignored instead of resurrecting
// stale playback.

import { codePointLength, totalCharacters } from "./core/tts.mjs";

export function createSpeechController({
  synth,
  createUtterance,
  getSettings,
  onStateChange,
  onProgress,
  onError,
}) {
  let state = "idle";
  let generation = 0;
  let chunks = [];
  let totalSentences = 0;
  let current = -1; // chunk index in flight; -1 when nothing is queued
  let spokenChars = 0; // characters in chunks fully spoken in this run

  function emitProgress() {
    if (!onProgress) return;
    const total = totalCharacters(chunks);
    onProgress({
      state,
      sentence: current >= 0 ? chunks[current].sentenceIndex + 1 : 1,
      totalSentences,
      currentChunk: current,
      percent: total === 0 ? 0 : Math.floor((spokenChars / total) * 100),
      spokenChars,
      totalChars: total,
    });
  }

  function setState(next) {
    state = next;
    if (onStateChange) onStateChange(state);
    emitProgress();
  }

  function enqueue(index) {
    current = index;
    const gen = generation;
    const chunk = chunks[index];
    const settings = getSettings(); // snapshot at enqueue time (SPEC 4)
    const utterance = createUtterance(chunk.text);
    utterance.voice = settings.voice ?? null;
    if (settings.voice && settings.voice.lang) {
      utterance.lang = settings.voice.lang;
    }
    utterance.rate = settings.rate;
    utterance.pitch = settings.pitch;
    utterance.volume = 1.0; // fixed in this version (SPEC section 4)
    utterance.onend = () => {
      if (gen !== generation || index !== current) return; // stale
      spokenChars += codePointLength(chunk.text);
      if (index + 1 < chunks.length) {
        enqueue(index + 1);
        emitProgress();
      } else {
        // Natural completion: idle, progress shows N of N at 100%.
        setState("idle");
      }
    };
    utterance.onerror = (event) => {
      if (gen !== generation || index !== current) return; // stale
      // SPEC section 3: an utterance error stops playback, returns to
      // idle and surfaces the error name; it never loops retries.
      generation += 1;
      current = -1;
      spokenChars = 0;
      setState("idle");
      if (onError) onError((event && event.error) || "unknown");
    };
    synth.speak(utterance);
    emitProgress();
  }

  return {
    get state() {
      return state;
    },
    // Load a playlist without playing (preview / progress reset).
    load(list, sentenceCount) {
      chunks = Array.isArray(list) ? list : [];
      totalSentences =
        sentenceCount ??
        (chunks.length ? chunks[chunks.length - 1].sentenceIndex + 1 : 0);
      current = -1;
      spokenChars = 0;
      emitProgress();
    },
    // Play from a chunk index (default: the start). Cancels any
    // current queue first, per SPEC section 3.
    play(fromChunkIndex = 0) {
      if (chunks.length === 0) return false;
      if (fromChunkIndex < 0 || fromChunkIndex >= chunks.length) return false;
      generation += 1;
      synth.cancel();
      spokenChars = 0;
      setState("speaking");
      enqueue(fromChunkIndex);
      return true;
    },
    playFromSentence(sentenceIndex) {
      const index = chunks.findIndex(
        (chunk) => chunk.sentenceIndex === sentenceIndex,
      );
      if (index === -1) return false;
      return this.play(index);
    },
    pause() {
      if (state !== "speaking") return;
      synth.pause();
      setState("paused");
    },
    resume() {
      if (state !== "paused") return;
      synth.resume();
      setState("speaking");
    },
    // Stop cancels the queue and returns to idle with progress reset
    // to the start sentence (SPEC section 3). Also the response to a
    // text edit during playback: a stale queue must never keep reading.
    stop() {
      generation += 1;
      synth.cancel();
      current = -1;
      spokenChars = 0;
      setState("idle");
    },
  };
}
