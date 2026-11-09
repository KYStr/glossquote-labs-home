// Morse Code Translator — DOM layer.
// Pure logic lives in ./core/*.mjs; this file only wires the page, renders
// text with textContent/value (user input is never treated as markup), and
// owns WebAudio playback (scheduled on the audio clock from the same timing
// expansion the duration display uses).

import { CHAR_TABLE, PROSIGNS, durationSeconds } from "./core/table.mjs";
import { encodeText } from "./core/encode.mjs";
import { decodeMorse } from "./core/decode.mjs";
import { expandTiming } from "./core/timing.mjs";

const STRINGS = {
  "zh-Hant": {
    dirFromText: "上次轉換方向：文字 → 摩斯碼",
    dirFromMorse: "上次轉換方向：摩斯碼 → 文字",
    errUnsupported: (char, pos) => `不支援的字元「${char}」，位置 ${pos}（由左至右數）。整段不會轉換，請修正後再試。`,
    errUnknownProsign: (group) => `未知的通訊簡語群組 ${group}。只支援 <SOS>、<AR>、<AS>、<KN>、<SK>。`,
    errUnclosed: (pos) => `位置 ${pos} 的「<」沒有對應的「>」，通訊簡語群組未結束。`,
    errStray: (pos) => `位置 ${pos} 出現未成對的「>」。`,
    errTooLongText: (limit) => `文字超過上限 ${limit} 字元，請縮短後再試。`,
    errTooLongMorse: (limit) => `摩斯碼輸入超過上限 ${limit} 字元，請縮短後再試。`,
    warnUnknown: (index, token) => `第 ${index} 個符號無法辨識：「${token}」，已在結果中以 � 標示。`,
    noteAmbiguity: (index, token, name, run) =>
      `第 ${index} 個符號「${token}」也是通訊簡語 <${name}> 的連送形式；這裡依字元解碼。若要解成簡語，請把該符號寫成標記形式 <${run}>。`,
    noteHint: (index, token, name, run) =>
      `第 ${index} 個符號「${token}」是通訊簡語 <${name}> 的連送形式，但未加標記，所以不解成簡語；請寫成 <${run}> 才會解成 <${name}>。`,
    reasonStale: "文字欄有錯誤，摩斯欄目前顯示的是上一次的有效結果（已過期），修正後才能播放。",
    reasonUnknown: "摩斯訊號含有無法辨識的符號，不能播放。",
    reasonEmpty: "目前沒有可播放的訊號。",
    copied: "已複製。",
    copyFailed: "複製失敗，請手動選取文字複製。",
    copyEmpty: "目前沒有內容可複製。",
    duration: (units, secs) => `總長度：${units} 單位 · ${secs} 秒`,
    nowPlaying: (textLabel, codeLabel) => `正在播放：${textLabel}（${codeLabel}）`,
  },
  en: {
    dirFromText: "Last conversion: text → Morse",
    dirFromMorse: "Last conversion: Morse → text",
    errUnsupported: (char, pos) => `Unsupported character "${char}" at position ${pos} (counted from the left). Nothing is converted; fix it and try again.`,
    errUnknownProsign: (group) => `Unknown prosign group ${group}. Only <SOS>, <AR>, <AS>, <KN> and <SK> are supported.`,
    errUnclosed: (pos) => `The "<" at position ${pos} has no closing ">"; the prosign group is unterminated.`,
    errStray: (pos) => `Unpaired ">" at position ${pos}.`,
    errTooLongText: (limit) => `Text exceeds the ${limit}-character limit; shorten it and try again.`,
    errTooLongMorse: (limit) => `Morse input exceeds the ${limit}-character limit; shorten it and try again.`,
    warnUnknown: (index, token) => `Token ${index} could not be recognised: "${token}". It is shown as � in the result.`,
    noteAmbiguity: (index, token, name, run) =>
      `Token ${index} "${token}" is also the run-together form of the prosign <${name}>; it is decoded as the character here. To decode it as the prosign, tag the token as <${run}>.`,
    noteHint: (index, token, name, run) =>
      `Token ${index} "${token}" is the run-together form of the prosign <${name}>, but it is untagged, so it is not decoded as the prosign. Write it as <${run}> to decode it as <${name}>.`,
    reasonStale: "The text pane has an error, so the Morse pane is showing the last valid result (out of date). Fix the error to play.",
    reasonUnknown: "The Morse signal contains unrecognised tokens and cannot be played.",
    reasonEmpty: "There is no signal to play yet.",
    copied: "Copied.",
    copyFailed: "Copy failed; select the text manually instead.",
    copyEmpty: "Nothing to copy yet.",
    duration: (units, secs) => `Total duration: ${units} units · ${secs} seconds`,
    nowPlaying: (textLabel, codeLabel) => `Now playing: ${textLabel} (${codeLabel})`,
  },
};

const lang = document.documentElement.lang.startsWith("en") ? "en" : "zh-Hant";
const S = STRINGS[lang];

const $ = (id) => document.getElementById(id);
const textEl = $("text-input");
const morseEl = $("morse-input");
const textErrorEl = $("text-error");
const directionEl = $("direction");
const messagesEl = $("morse-messages");
const copyMorseBtn = $("copy-morse");
const copyTextBtn = $("copy-text");
const copyStatusEl = $("copy-status");
const wpmRange = $("wpm-range");
const wpmNum = $("wpm-num");
const toneRange = $("tone-range");
const toneNum = $("tone-num");
const durationEl = $("duration");
const playBtn = $("play-btn");
const stopBtn = $("stop-btn");
const playReasonEl = $("play-reason");
const audioFallbackEl = $("audio-fallback");
const stripTextEl = $("strip-text");
const stripMorseEl = $("strip-morse");
const nowPlayingEl = $("now-playing");

const audioCtor = window.AudioContext || window.webkitAudioContext;
const audioAvailable = typeof audioCtor === "function";
if (!audioAvailable) {
  audioFallbackEl.hidden = false;
  playBtn.hidden = true;
  stopBtn.hidden = true;
}

let stale = false;
let morseError = false;
let unknownCount = 0;
let signalWords = [];
let decodedText = "";
let lastTiming = expandTiming([]);
let playback = null;

// ---------- rendering helpers (textContent only) ----------

function textLabelOf(item) {
  const src = item.source;
  if (!src) return "";
  if (src.kind === "prosign") return `<${src.name}>`;
  return src.char ?? "";
}

function codeLabelOf(item) {
  const src = item.source;
  if (!src) return "";
  return src.kind === "prosign" ? `<${src.code}>` : src.code;
}

function renderStrip() {
  stripTextEl.replaceChildren();
  stripMorseEl.replaceChildren();
  for (const item of lastTiming.items) {
    const a = document.createElement("span");
    a.className = "strip-item";
    a.textContent = textLabelOf(item);
    stripTextEl.append(a);
    const b = document.createElement("span");
    b.className = "strip-item";
    b.textContent = codeLabelOf(item);
    stripMorseEl.append(b);
  }
}

function setActiveItem(index) {
  for (const row of [stripTextEl, stripMorseEl]) {
    [...row.children].forEach((el, i) => el.classList.toggle("active", i === index));
  }
  const item = lastTiming.items[index];
  if (item) {
    nowPlayingEl.textContent = S.nowPlaying(textLabelOf(item), codeLabelOf(item));
    nowPlayingEl.hidden = false;
  }
}

function clearActiveItem() {
  for (const row of [stripTextEl, stripMorseEl]) {
    [...row.children].forEach((el) => el.classList.remove("active"));
  }
  nowPlayingEl.hidden = true;
  nowPlayingEl.textContent = "";
}

// ---------- play validity (SPEC §3 fixed rule) ----------

function updatePlayState() {
  let reason = "";
  if (!audioAvailable) {
    playBtn.disabled = true;
    return;
  }
  if (stale) reason = S.reasonStale;
  else if (morseError || unknownCount > 0) reason = S.reasonUnknown;
  else if (lastTiming.items.length === 0) reason = S.reasonEmpty;
  playBtn.disabled = reason !== "";
  playReasonEl.textContent = reason;
}

function currentWpm() {
  const v = Number(wpmNum.value);
  return Number.isFinite(v) ? Math.min(60, Math.max(5, v)) : 20;
}

function updateDuration() {
  lastTiming = expandTiming(signalWords);
  const secs = durationSeconds(lastTiming.totalUnits, currentWpm()).toFixed(2);
  durationEl.textContent = S.duration(lastTiming.totalUnits, secs);
  renderStrip();
  updatePlayState();
}

// ---------- conversion ----------

function encodeErrorMessage(error) {
  switch (error.kind) {
    case "unsupported-char":
      return S.errUnsupported(error.char, error.position);
    case "unknown-prosign":
      return S.errUnknownProsign(error.group);
    case "unclosed-prosign":
      return S.errUnclosed(error.position);
    case "stray-bracket":
      return S.errStray(error.position);
    case "too-long":
      return S.errTooLongText(error.limit);
    default:
      return error.kind;
  }
}

function renderMessages(warnings, notes) {
  messagesEl.replaceChildren();
  for (const w of warnings) {
    const li = document.createElement("li");
    li.className = "msg-warning";
    li.textContent = S.warnUnknown(w.index, w.token);
    messagesEl.append(li);
  }
  for (const n of notes) {
    const li = document.createElement("li");
    li.className = "msg-note";
    const run = n.token.replace(/[<>]/g, "");
    li.textContent =
      n.type === "prosign-ambiguity"
        ? S.noteAmbiguity(n.index, n.token, n.prosign, run)
        : S.noteHint(n.index, n.token, n.prosign, run);
    messagesEl.append(li);
  }
}

function refreshFromText() {
  stopPlayback();
  directionEl.textContent = S.dirFromText;
  const result = encodeText(textEl.value);
  if (result.ok) {
    morseEl.value = result.morse;
    textErrorEl.textContent = "";
    textErrorEl.hidden = true;
    stale = false;
    morseError = false;
    unknownCount = 0;
    signalWords = result.words;
    const back = decodeMorse(result.morse);
    decodedText = back.ok ? back.text : "";
    renderMessages([], []);
  } else {
    // Freeze the Morse pane at the last valid encoding, marked out of date.
    textErrorEl.textContent = encodeErrorMessage(result.error);
    textErrorEl.hidden = false;
    stale = true;
    const back = decodeMorse(morseEl.value);
    decodedText = back.ok ? back.text : "";
  }
  updateDuration();
}

function refreshFromMorse() {
  stopPlayback();
  directionEl.textContent = S.dirFromMorse;
  const result = decodeMorse(morseEl.value);
  stale = false;
  if (result.ok) {
    textEl.value = result.text;
    decodedText = result.text;
    morseError = false;
    unknownCount = result.warnings.length;
    signalWords = result.words;
    textErrorEl.textContent = "";
    textErrorEl.hidden = true;
    renderMessages(result.warnings, result.notes);
  } else {
    morseError = true;
    unknownCount = 0;
    signalWords = [];
    decodedText = "";
    renderMessages([], []);
    const li = document.createElement("li");
    li.className = "msg-warning";
    li.textContent = S.errTooLongMorse(result.error.limit);
    messagesEl.append(li);
  }
  updateDuration();
}

// ---------- playback (WebAudio only in this layer) ----------

function stopPlayback() {
  if (!playback) return;
  const p = playback;
  playback = null;
  for (const timer of p.timers) clearTimeout(timer);
  for (const osc of p.oscs) {
    try {
      osc.stop();
    } catch {
      /* already stopped */
    }
    try {
      osc.disconnect();
    } catch {
      /* noop */
    }
  }
  try {
    p.gain.disconnect();
  } catch {
    /* noop */
  }
  p.ctx.close().catch(() => {});
  clearActiveItem();
  stopBtn.disabled = true;
  updatePlayState();
}

function play() {
  if (!audioAvailable || playBtn.disabled) return;
  stopPlayback();
  const { intervals, items, totalUnits } = lastTiming;
  if (items.length === 0) return;

  // Speed and tone are snapshotted now; changing them mid-playback takes
  // effect on the next Play (SPEC §3), never mid-signal.
  const wpm = currentWpm();
  const tone = Math.min(1000, Math.max(400, Number(toneNum.value) || 600));
  const unitSec = 1200 / wpm / 1000;

  const ctx = new audioCtor();
  const gain = ctx.createGain();
  gain.gain.value = 0;
  gain.connect(ctx.destination);

  const oscs = [];
  const timers = [];
  let t = ctx.currentTime + 0.06;
  for (const iv of intervals) {
    const dur = iv.units * unitSec;
    if (iv.on) {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = tone;
      osc.connect(gain);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.9, t + 0.004);
      gain.gain.setValueAtTime(0.9, Math.max(t + 0.004, t + dur - 0.004));
      gain.gain.linearRampToValueAtTime(0, t + dur);
      osc.start(t);
      osc.stop(t + dur + 0.05);
      oscs.push(osc);
    }
    t += dur;
  }
  for (const item of items) {
    timers.push(setTimeout(() => setActiveItem(item.index), 60 + item.startUnit * unitSec * 1000));
  }
  timers.push(setTimeout(() => stopPlayback(), 60 + totalUnits * unitSec * 1000 + 60));

  playback = { ctx, gain, oscs, timers };
  playBtn.disabled = true;
  stopBtn.disabled = false;
}

// ---------- copy ----------

async function copyValue(value) {
  if (value === "") {
    copyStatusEl.textContent = S.copyEmpty;
    return;
  }
  try {
    await navigator.clipboard.writeText(value);
    copyStatusEl.textContent = S.copied;
  } catch {
    const tmp = document.createElement("textarea");
    tmp.value = value;
    tmp.style.position = "fixed";
    tmp.style.opacity = "0";
    document.body.append(tmp);
    tmp.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {
      ok = false;
    }
    tmp.remove();
    copyStatusEl.textContent = ok ? S.copied : S.copyFailed;
  }
}

// ---------- reference tables generated from the shipped data ----------

function buildReferenceTables() {
  const refBody = $("ref-table-body");
  for (const [ch, code] of CHAR_TABLE) {
    const tr = document.createElement("tr");
    const tdCh = document.createElement("td");
    tdCh.textContent = ch;
    const tdCode = document.createElement("td");
    tdCode.textContent = code;
    tr.append(tdCh, tdCode);
    refBody.append(tr);
  }
  const proBody = $("prosign-table-body");
  for (const p of PROSIGNS) {
    const tr = document.createElement("tr");
    const tdName = document.createElement("td");
    tdName.textContent = `<${p.name}>`;
    const tdRun = document.createElement("td");
    tdRun.textContent = `<${p.run}>`;
    tr.append(tdName, tdRun);
    proBody.append(tr);
  }
}

// ---------- wiring ----------

textEl.addEventListener("input", refreshFromText);
morseEl.addEventListener("input", refreshFromMorse);
playBtn.addEventListener("click", play);
stopBtn.addEventListener("click", stopPlayback);
copyMorseBtn.addEventListener("click", () => copyValue(morseEl.value));
copyTextBtn.addEventListener("click", () => copyValue(decodedText));

function bindPair(range, num, onChange) {
  range.addEventListener("input", () => {
    num.value = range.value;
    onChange();
  });
  num.addEventListener("input", () => {
    const v = Number(num.value);
    if (Number.isFinite(v) && v >= Number(range.min) && v <= Number(range.max)) {
      range.value = String(v);
    }
    onChange();
  });
}
bindPair(wpmRange, wpmNum, updateDuration);
bindPair(toneRange, toneNum, () => {});

buildReferenceTables();
refreshFromText();
