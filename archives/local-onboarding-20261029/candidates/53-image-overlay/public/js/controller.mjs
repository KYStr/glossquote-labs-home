import { inspectImage } from './core/image-header.mjs';
import { visualDimensions, assertSameDimensions, validateFileSize, validatePairBytes, validateSettings, fail } from './core/geometry.mjs';
import { comparisonChunks } from './core/pixels.mjs';
import { initialSession, reduceSession } from './core/session.mjs';

const KNOWN_ERRORS = new Set(['HEADER_UNSAFE','HEADER_INVALID','HEADER_TRUNCATED','FILE_EMPTY','FILE_TOO_LARGE','TOTAL_TOO_LARGE','DIMENSION_INVALID','DIMENSION_LIMIT','PIXEL_LIMIT','EXIF_INVALID','ANIMATED_PNG','UNSUPPORTED_FORMAT','JPEG_MODE_UNSUPPORTED','DIMENSION_MISMATCH','SETTINGS_INVALID','PIXELS_INVALID','DECODE_FAILED','DECODE_DIMENSIONS','ENCODE_FAILED','READ_FAILED','UNSUPPORTED_BROWSER','PROCESSING_LIMIT','MISSING_SOURCE','CANCELLED','PROCESSING_FAILED','DOWNLOAD_FAILED']);
const safeCode = error => KNOWN_ERRORS.has(error?.message) ? error.message : 'PROCESSING_FAILED';
const DEFAULTS = Object.freeze({ mode: 'blend', opacity: 50, threshold: 0 });

export function createController(platform, notify = () => {}) {
  let state = initialSession(), settings = { ...DEFAULTS }, settingsValid = true;
  let sources = [null, null], blobs = null, active = null, errorField = null, note = null, disposed = false;
  // All handed-off URLs stay owned until their timers expire. Reuse belongs
  // only to the currently prepared result, never merely to an export format.
  const leases = new Set(), resultLeases = new Map();
  function snapshot() {
    return {
      ...state, settings: { ...settings }, errorField, note,
      sources: sources.map(source => source ? { name: source.file.name, size: source.file.size, dimensions: source.header ? visualDimensions(source.header) : null, kind: source.header?.kind ?? null, sample: source.sample } : null),
      canCompare: !disposed && state.phase !== 'running' && sources.every(Boolean) && settingsValid,
      hasData: sources.some(Boolean), canDownload: state.phase === 'ready' && blobs !== null
    };
  }
  function emit() { if (!disposed) notify(snapshot()); }
  function current(revision) { return !disposed && revision === state.revision; }
  function assertCurrent(revision) { if (!current(revision)) fail('CANCELLED'); }
  function stopActive() {
    if (active) { platform.clearTimer(active.deadline); active.abort.abort(); active = null; }
  }
  function invalidate(type = 'edit') {
    stopActive(); state = reduceSession(state, { type });
    blobs = null; resultLeases.clear(); errorField = null; note = null; platform.clearCanvas();
    // URLs exist only after an explicit download click. Handed-off downloads keep
    // their 1.5s lease even after a source change; no lease can reach 30 seconds.
  }
  function setError(error, field = null, revision = state.revision) {
    if (!current(revision)) return;
    blobs = null; platform.clearCanvas();
    state = reduceSession(state, { type: 'error', revision, code: safeCode(error) });
    errorField = field; emit();
  }
  function begin() {
    const revision = state.revision, abort = new AbortController();
    state = reduceSession(state, { type: 'start', revision });
    active = { abort, deadline: platform.setTimer(() => {
      if (!current(revision) || !active) return;
      invalidate('cancel'); setError(new Error('PROCESSING_LIMIT'));
    }, 20_000) };
    emit(); return { revision, signal: abort.signal };
  }
  function finish(revision) { if (current(revision)) stopActive(); }
  function progress(revision, value, activity) {
    if (!current(revision)) return;
    note = activity; state = reduceSession(state, { type:'progress', revision, progress:value }); emit();
  }
  async function inspectSources(revision, signal) {
    if (!sources.every(Boolean)) { errorField = sources[0] ? 'right' : 'left'; fail('MISSING_SOURCE'); }
    for (let side = 0; side < 2; side++) { errorField = side === 0 ? 'left' : 'right'; validateFileSize(sources[side].file.size); }
    validatePairBytes(sources[0].file.size, sources[1].file.size);
    for (let side = 0; side < 2; side++) {
      assertCurrent(revision);
      const source = sources[side]; errorField = side === 0 ? 'left' : 'right';
      if (source.header) continue;
      progress(revision, side * 5, 'reading');
      const bytes = await platform.read(source.file, signal);
      assertCurrent(revision);
      if (!(bytes instanceof Uint8Array) || bytes.byteLength !== source.file.size) fail('READ_FAILED');
      source.header = inspectImage(bytes); visualDimensions(source.header); emit();
    }
    errorField = 'right'; const dimensions = assertSameDimensions(sources[0].header, sources[1].header);
    errorField = null; return dimensions;
  }
  async function selectFile(side, file, { sample = false } = {}) {
    if (disposed || (side !== 0 && side !== 1)) return;
    invalidate(); sources[side] = file ? { file, sample, header:null, pixels:null } : null; emit();
    if (!file) return;
    const { revision, signal } = begin();
    try {
      errorField = side === 0 ? 'left' : 'right'; validateFileSize(file.size);
      if (sources.every(Boolean)) validatePairBytes(sources[0].file.size, sources[1].file.size);
      const bytes = await platform.read(file, signal); assertCurrent(revision);
      if (!(bytes instanceof Uint8Array) || bytes.byteLength !== file.size) fail('READ_FAILED');
      sources[side].header = inspectImage(bytes); visualDimensions(sources[side].header);
      if (sources.every(source => source?.header)) { errorField = 'right'; assertSameDimensions(sources[0].header, sources[1].header); }
      state = { ...state, phase:'editing', progress:0, error:null }; errorField = null; note = null;
    } catch (error) { if (current(revision)) setError(error, errorField, revision); }
    finally { finish(revision); emit(); }
  }
  function setSettings(next, field = 'settings') {
    if (disposed) return;
    invalidate(); settings = { mode: next.mode, opacity: next.opacity, threshold: next.threshold };
    try { validateSettings(next); settingsValid = true; emit(); }
    catch (error) { settingsValid = false; setError(error, field); }
  }
  async function compare() {
    if (disposed) return;
    invalidate(); emit();
    try { validateSettings(settings); }
    catch (error) { setError(error,'settings'); return; }
    const { revision, signal } = begin();
    try {
      const dimensions = await inspectSources(revision, signal);
      for (let side = 0; side < 2; side++) {
        assertCurrent(revision); const source = sources[side]; errorField = side === 0 ? 'left' : 'right';
        if (!source.pixels) {
          progress(revision, 10 + side * 15, 'decoding');
          const bitmap = await platform.decode(source.file, signal);
          try {
            assertCurrent(revision);
            if (bitmap.width !== dimensions.width || bitmap.height !== dimensions.height) fail('DECODE_DIMENSIONS');
            source.pixels = platform.flattenBitmap(bitmap, dimensions.width, dimensions.height);
            if (!(source.pixels instanceof Uint8ClampedArray) || source.pixels.length !== dimensions.width * dimensions.height * 4) fail('PIXELS_INVALID');
          } finally { bitmap.close(); }
        }
      }
      errorField = null;
      const iterator = comparisonChunks(sources[0].pixels, sources[1].pixels, settings);
      let result;
      try {
        for (;;) {
          assertCurrent(revision); const step = iterator.next();
          if (step.done) { result = step.value; break; }
          progress(revision, 40 + step.value.done / step.value.total * 50, 'comparing');
          await platform.yieldTask(signal);
        }
      } finally { iterator.return(); }
      assertCurrent(revision); platform.render(result.pixels, dimensions.width, dimensions.height); result.pixels = null;
      progress(revision, 95, 'encoding');
      const png = await platform.encode(signal); assertCurrent(revision);
      if (!png || png.type !== 'image/png' || png.size === 0) fail('ENCODE_FAILED');
      const report = { schemaVersion:1, width:dimensions.width, height:dimensions.height, mode:settings.mode, opacity:settings.opacity, threshold:settings.threshold, changed:result.stats.changed, total:result.stats.total, percent:result.stats.percent, comparison:'white-background-rgb-max-strict-greater', highlightRGB:[213,38,42] };
      const json = platform.jsonBlob(`${JSON.stringify(report,null,2)}\n`);
      blobs = { png, json }; state = reduceSession(state,{ type:'ready', revision, result:report }); note = 'ready';
    } catch (error) { if (current(revision)) setError(error,errorField,revision); }
    finally { finish(revision); emit(); }
  }
  function cancel() { if (!disposed) { invalidate('cancel'); note='cancelled'; emit(); } }
  function clear() {
    if (disposed) return;
    invalidate('clear'); sources=[null,null]; settings={...DEFAULTS}; settingsValid=true; emit();
  }
  async function loadExample() {
    if (disposed) return;
    invalidate('clear'); sources=[null,null]; settings={...DEFAULTS}; settingsValid=true;
    const { revision, signal } = begin();
    try {
      note='example'; emit(); const files=await platform.exampleFiles(signal); assertCurrent(revision);
      if (!Array.isArray(files) || files.length !== 2) fail('PROCESSING_FAILED');
      sources=files.map(file => ({file,sample:true,header:null,pixels:null})); await inspectSources(revision,signal);
      platform.clearCanvas(); state={...state,phase:'editing',progress:0}; note='exampleLoaded';
    } catch (error) { if (current(revision)) setError(error,errorField,revision); }
    finally { finish(revision); emit(); }
  }
  function download(format) {
    if (disposed || !blobs || state.phase !== 'ready' || !['png','json'].includes(format)) return false;
    let lease = resultLeases.get(format);
    if (lease?.revision !== state.revision) lease = null;
    try {
      if (!lease) {
        const url=platform.createURL(blobs[format]);
        lease={url,revision:state.revision,timer:null};
        const ownedLease=lease;
        leases.add(ownedLease); resultLeases.set(format,ownedLease);
        ownedLease.timer=platform.setTimer(() => {
          platform.revokeURL(url); leases.delete(ownedLease);
          if (resultLeases.get(format) === ownedLease) resultLeases.delete(format);
        },1500);
      }
      platform.save(lease.url,format === 'png' ? 'image-comparison.png' : 'image-comparison-stats.json');
      note='downloadStarted'; emit(); return true;
    } catch {
      if (lease) {
        platform.clearTimer(lease.timer); platform.revokeURL(lease.url); leases.delete(lease);
        if (resultLeases.get(format) === lease) resultLeases.delete(format);
      }
      invalidate(); setError(new Error('DOWNLOAD_FAILED')); return false;
    }
  }
  function dispose() {
    if (disposed) return;
    invalidate('clear'); sources=[null,null];
    for (const lease of leases.values()) { platform.clearTimer(lease.timer); platform.revokeURL(lease.url); }
    leases.clear(); resultLeases.clear(); disposed=true;
  }
  return { snapshot, selectFile, setSettings, compare, cancel, clear, loadExample, download, dispose };
}

export function createBrowserPlatform(canvas, doc, win) {
  let context;
  try { context=canvas.getContext('2d',{alpha:false,colorSpace:'srgb',willReadFrequently:true}); }
  catch { fail('UNSUPPORTED_BROWSER'); }
  if (!context || typeof win.createImageBitmap !== 'function' || typeof win.FileReader !== 'function' || typeof win.File !== 'function' || typeof win.ImageData !== 'function' || typeof canvas.toBlob !== 'function' || typeof win.URL?.createObjectURL !== 'function' || typeof win.URL?.revokeObjectURL !== 'function') fail('UNSUPPORTED_BROWSER');
  function abortable(promise, signal, dispose = () => {}) {
    return new Promise((resolve,reject) => {
      let ended=false;
      const stop=() => { if (!ended) { ended=true; reject(new Error('CANCELLED')); } };
      if (signal.aborted) stop(); else signal.addEventListener('abort',stop,{once:true});
      promise.then(value => {
        signal.removeEventListener('abort',stop);
        if (ended || signal.aborted) dispose(value); else { ended=true; resolve(value); }
      }, () => { signal.removeEventListener('abort',stop); if (!ended) { ended=true; reject(new Error('DECODE_FAILED')); } });
    });
  }
  function encode(signal) {
    return new Promise((resolve,reject) => {
      let ended=false;
      const stop=() => { if (!ended) { ended=true; reject(new Error('CANCELLED')); } };
      if (signal.aborted) { stop(); return; }
      signal.addEventListener('abort',stop,{once:true});
      try {
        canvas.toBlob(blob => {
          signal.removeEventListener('abort',stop);
          if (ended) return;
          ended=true;
          if (signal.aborted) reject(new Error('CANCELLED')); else if (!blob) reject(new Error('ENCODE_FAILED')); else resolve(blob);
        },'image/png');
      } catch { signal.removeEventListener('abort',stop); ended=true; reject(new Error('ENCODE_FAILED')); }
    });
  }
  return {
    read(file,signal) {
      return new Promise((resolve,reject) => {
        const reader=new win.FileReader();
        const stop=() => { reader.abort(); reject(new Error('CANCELLED')); };
        const cleanup=() => { signal.removeEventListener('abort',stop); reader.onload=null; reader.onerror=null; reader.onabort=null; };
        if (signal.aborted) { reject(new Error('CANCELLED')); return; }
        signal.addEventListener('abort',stop,{once:true});
        reader.onload=() => { const buffer=reader.result; cleanup(); resolve(new Uint8Array(buffer)); };
        reader.onerror=() => { cleanup(); reject(new Error('READ_FAILED')); };
        reader.onabort=() => { cleanup(); reject(new Error('CANCELLED')); };
        try { reader.readAsArrayBuffer(file); } catch { cleanup(); reject(new Error('READ_FAILED')); }
      });
    },
    decode(file,signal) { return abortable(win.createImageBitmap(file,{imageOrientation:'from-image'}),signal,bitmap => bitmap.close()); },
    flattenBitmap(bitmap,width,height) {
      canvas.width=width; canvas.height=height; context.fillStyle='#ffffff'; context.fillRect(0,0,width,height); context.drawImage(bitmap,0,0);
      return context.getImageData(0,0,width,height,{colorSpace:'srgb'}).data;
    },
    render(pixels,width,height) { canvas.width=width; canvas.height=height; context.putImageData(new win.ImageData(pixels,width,height,{colorSpace:'srgb'}),0,0); },
    clearCanvas() { canvas.width=1; canvas.height=1; },
    encode,
    jsonBlob(text) { return new win.Blob([text],{type:'application/json;charset=utf-8'}); },
    createURL(blob) { return win.URL.createObjectURL(blob); }, revokeURL(url) { win.URL.revokeObjectURL(url); },
    save(url,name) { const link=doc.createElement('a'); link.href=url; link.download=name; link.hidden=true; doc.body.append(link); try { link.click(); } finally { link.remove(); } },
    setTimer(callback,delay) { return win.setTimeout(callback,delay); }, clearTimer(id) { win.clearTimeout(id); },
    yieldTask(signal) { return new Promise((resolve,reject) => {
      const stop=() => { win.clearTimeout(id); reject(new Error('CANCELLED')); };
      const id=win.setTimeout(() => { signal.removeEventListener('abort',stop); signal.aborted ? reject(new Error('CANCELLED')) : resolve(); },0);
      if (signal.aborted) stop(); else signal.addEventListener('abort',stop,{once:true});
    }); },
    async exampleFiles(signal) {
      const files=[];
      for (let side=0; side<2; side++) {
        if (signal.aborted) fail('CANCELLED');
        canvas.width=480; canvas.height=320; context.fillStyle='#ffffff'; context.fillRect(0,0,480,320);
        context.fillStyle='#111410'; context.fillRect(40+side*8,40,64,64); context.fillRect(128,48,240,16); context.fillRect(128,80,160,8);
        context.fillStyle='#c8f56a'; context.fillRect(40,144,400,80); context.fillStyle='#55594f';
        context.fillRect(40,248,side ? 280 : 240,8); context.fillRect(40,272,320,8);
        const blob=await encode(signal); if (signal.aborted) fail('CANCELLED');
        files.push(new win.File([blob],side === 0 ? 'example-before.png' : 'example-after.png',{type:'image/png'}));
      }
      return files;
    }
  };
}
