// WebAudio adapter for the Metronome.
//
// The pure core decides every click time from the audio clock; this
// layer only renders those decisions: an oscillator burst with an
// exponential-decay envelope per click (no audio assets of any kind),
// through one master gain. Scheduled sources are tracked so Stop can
// silence already-scheduled-but-unplayed clicks immediately, and the
// bookkeeping is pruned as events pass, so a long run accumulates no
// unbounded state (SPEC sections 4 and 5).

export function createAudioEngine() {
  let context = null;
  let master = null;
  let sources = [];

  function ensureContext() {
    if (!context) {
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = 1;
      master.connect(context.destination);
    }
    return context;
  }

  return {
    now() {
      return context ? context.currentTime : 0;
    },
    async resume() {
      ensureContext();
      if (context.state === "suspended") await context.resume();
    },
    schedule(event) {
      ensureContext();
      const t = event.time;
      sources = sources.filter((entry) => entry.endTime > context.currentTime);
      const osc = context.createOscillator();
      osc.type = "square";
      osc.frequency.value = event.frequency;
      const envelope = context.createGain();
      envelope.gain.setValueAtTime(Math.max(event.gain, 0.0001), t);
      envelope.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
      osc.connect(envelope);
      envelope.connect(master);
      osc.start(t);
      osc.stop(t + 0.06);
      sources.push({ source: osc, endTime: t + 0.06 });
    },
    silence() {
      for (const entry of sources) {
        try {
          entry.source.stop();
        } catch {
          // Already stopped or ended; silencing is best-effort per source.
        }
      }
      sources = [];
      if (context && master) {
        master.disconnect();
        master = context.createGain();
        master.gain.value = 1;
        master.connect(context.destination);
      }
    },
  };
}
