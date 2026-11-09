import assert from "node:assert/strict";
import test from "node:test";

// SPEC section 7 controller suite: the section 3 state machine runs
// against a fake synthesis engine through the injected interface, so
// no browser and no real voice is involved.

import { createSpeechController } from "../public/js/controller.mjs";

function makeRig(settings = { voice: { name: "Fake", lang: "en-US", localService: true }, rate: 1, pitch: 1 }) {
  const calls = { speak: [], cancel: 0, pause: 0, resume: 0 };
  const events = { states: [], progress: [], errors: [] };
  let currentSettings = settings;
  const controller = createSpeechController({
    synth: {
      speak: (utterance) => calls.speak.push(utterance),
      cancel: () => { calls.cancel += 1; },
      pause: () => { calls.pause += 1; },
      resume: () => { calls.resume += 1; },
    },
    createUtterance: (text) => ({
      text, voice: undefined, lang: undefined, rate: undefined,
      pitch: undefined, volume: undefined, onend: null, onerror: null,
    }),
    getSettings: () => currentSettings,
    onStateChange: (state) => events.states.push(state),
    onProgress: (progress) => events.progress.push(progress),
    onError: (name) => events.errors.push(name),
  });
  return {
    calls, events, controller,
    setSettings: (next) => { currentSettings = next; },
    lastProgress: () => events.progress[events.progress.length - 1],
  };
}

function chunk(text, sentenceIndex, ordinal) {
  return { text, sentenceIndex, ordinal };
}

const THREE = [chunk("One.", 0, 0), chunk("Two.", 1, 1), chunk("Three.", 2, 2)];

test("play enqueues exactly one chunk and advances only on end", () => {
  const rig = makeRig();
  rig.controller.load(THREE, 3);
  assert.equal(rig.controller.play(0), true);
  assert.equal(rig.controller.state, "speaking");
  assert.equal(rig.calls.speak.length, 1);
  assert.equal(rig.calls.speak[0].text, "One.");
  // Volume is fixed at 1.0 (SPEC section 4); settings are snapshotted.
  assert.equal(rig.calls.speak[0].volume, 1.0);
  assert.equal(rig.calls.speak[0].rate, 1);
  rig.calls.speak[0].onend();
  assert.equal(rig.calls.speak.length, 2);
  assert.equal(rig.calls.speak[1].text, "Two.");
  assert.equal(rig.lastProgress().sentence, 2);
  rig.calls.speak[1].onend();
  rig.calls.speak[2].onend();
  assert.equal(rig.controller.state, "idle");
  // Natural completion: progress shows N of N at 100% (SPEC section 3).
  assert.equal(rig.lastProgress().sentence, 3);
  assert.equal(rig.lastProgress().percent, 100);
});

test("rate changes mid-playback apply from the next chunk (snapshot)", () => {
  const rig = makeRig();
  rig.controller.load(THREE, 3);
  rig.controller.play(0);
  assert.equal(rig.calls.speak[0].rate, 1);
  rig.setSettings({ voice: { name: "Other", lang: "zh-TW", localService: false }, rate: 1.6, pitch: 0.5 });
  rig.calls.speak[0].onend();
  assert.equal(rig.calls.speak[1].rate, 1.6);
  assert.equal(rig.calls.speak[1].pitch, 0.5);
  assert.equal(rig.calls.speak[1].voice.name, "Other");
  assert.equal(rig.calls.speak[1].lang, "zh-TW");
});

test("pause and resume call the engine and move the state machine", () => {
  const rig = makeRig();
  rig.controller.load(THREE, 3);
  rig.controller.pause(); // no-op while idle
  assert.equal(rig.calls.pause, 0);
  rig.controller.play(0);
  rig.controller.pause();
  assert.equal(rig.calls.pause, 1);
  assert.equal(rig.controller.state, "paused");
  rig.controller.resume();
  assert.equal(rig.calls.resume, 1);
  assert.equal(rig.controller.state, "speaking");
  assert.deepEqual(rig.events.states, ["speaking", "paused", "speaking"]);
});

test("stop cancels, resets progress, and stale callbacks are ignored", () => {
  const rig = makeRig();
  rig.controller.load(THREE, 3);
  rig.controller.play(0);
  const stale = rig.calls.speak[0];
  rig.controller.stop();
  assert.equal(rig.calls.cancel, 2); // play() cancels once, stop() once
  assert.equal(rig.controller.state, "idle");
  assert.equal(rig.lastProgress().currentChunk, -1);
  assert.equal(rig.lastProgress().percent, 0);
  // The cancelled utterance's late end event must not resurrect it:
  // this is also what makes edit-during-playback safe (SPEC section 3).
  stale.onend();
  assert.equal(rig.calls.speak.length, 1);
  assert.equal(rig.controller.state, "idle");
});

test("an utterance error returns to idle and surfaces the error name", () => {
  const rig = makeRig();
  rig.controller.load(THREE, 3);
  rig.controller.play(0);
  rig.calls.speak[0].onerror({ error: "synthesis-failed" });
  assert.equal(rig.controller.state, "idle");
  assert.deepEqual(rig.events.errors, ["synthesis-failed"]);
  // No retries, no further chunks (SPEC section 3).
  assert.equal(rig.calls.speak.length, 1);
});

test("play from a sentence starts at that sentence's first chunk", () => {
  const rig = makeRig();
  const chunks = [
    chunk("A1.", 0, 0), chunk("A2.", 0, 1),
    chunk("B1.", 1, 2), chunk("B2.", 1, 3),
    chunk("C1.", 2, 4),
  ];
  rig.controller.load(chunks, 3);
  assert.equal(rig.controller.playFromSentence(1), true);
  assert.equal(rig.calls.speak[0].text, "B1.");
  assert.equal(rig.lastProgress().sentence, 2);
  assert.equal(rig.controller.playFromSentence(9), false);
});

test("re-playing cancels the old queue; its callbacks go stale", () => {
  const rig = makeRig();
  rig.controller.load(THREE, 3);
  rig.controller.play(0);
  const first = rig.calls.speak[0];
  rig.controller.play(0);
  assert.equal(rig.calls.speak.length, 2);
  first.onend(); // stale generation: ignored
  assert.equal(rig.calls.speak.length, 2);
  rig.calls.speak[1].onend();
  assert.equal(rig.calls.speak.length, 3);
  assert.equal(rig.calls.speak[2].text, "Two.");
});

test("play with no playlist is refused without touching the engine", () => {
  const rig = makeRig();
  rig.controller.load([], 0);
  assert.equal(rig.controller.play(0), false);
  assert.equal(rig.calls.speak.length, 0);
  assert.equal(rig.calls.cancel, 0);
});
