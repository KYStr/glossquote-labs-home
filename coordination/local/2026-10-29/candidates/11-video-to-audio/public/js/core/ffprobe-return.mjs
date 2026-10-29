// core 0.12.10's public ffprobe binding discards the native function's return.
// Keep the exact native status; upstream files and WASM remain byte-identical.
// The original binding owns argv allocation. A disposable probe Worker owns
// that memory and all FFmpeg C globals for exactly one probe invocation.
export function retainNativeProbeReturn(core) {
  if (!core || typeof core.ffprobe !== 'function' || typeof core._ffprobe !== 'function') throw new Error('MEDIA_UNSUPPORTED');
  const originalProbe = core.ffprobe;
  core.ffprobe = (...args) => {
    const nativeProbe = core._ffprobe;
    let completed = false, nativeStatus;
    core.ret = -1;
    core._ffprobe = (argc, argv) => {
      const status = nativeProbe(argc, argv);
      if (!Number.isInteger(status) || status < -2147483648 || status > 2147483647) throw new Error('MEDIA_UNSUPPORTED');
      nativeStatus = status;
      completed = true;
      core.ret = status;
      return status;
    };
    try {
      originalProbe(...args);
      // An abort swallowed by the upstream binding has no normal return.
      if (!completed || core.ret !== nativeStatus) throw new Error('MEDIA_UNSUPPORTED');
      return nativeStatus;
    } finally {
      // The upstream lazy export rewrites _ffprobe during its first call.
      // Restore the captured entry so subsequent interceptions are explicit.
      core._ffprobe = nativeProbe;
    }
  };
  return core;
}
