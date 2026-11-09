// Controller for the Typing Speed Test.
//
// The attempt lives entirely in memory: nothing typed is stored,
// sent, logged, or placed in the URL or the title, and retry,
// navigation, or reload discards it (SPEC sections 3 and 5). The
// passage and the typed text render as text nodes only. Composition
// (IME) text is never forwarded to the session — only committed
// strings are scored, and the first commit starts the monotonic
// timer. The countdown is derived from that same clock, never from
// counting interval firings.

import { AttemptSession, codePoints, comparePositions, reviewMistakes } from "./core/typing.mjs";
import { PASSAGES } from "./passages.mjs";
import { translate } from "./i18n.mjs";

export function createApp(doc, env = {}) {
  const lang = doc.documentElement?.lang === "en" ? "en" : "zh-Hant";
  const t = (code, params) => translate(lang, code, params);
  const $ = (id) => doc.querySelector(`#${id}`);
  const nowMs = env.nowMs ?? (() => performance.now());
  const setIntervalFn = env.setInterval ?? globalThis.setInterval.bind(globalThis);
  const clearIntervalFn = env.clearInterval ?? globalThis.clearInterval.bind(globalThis);
  const confirmFn = env.confirm ?? ((message) => globalThis.confirm?.(message) ?? true);
  const random = env.random ?? Math.random;

  const els = {
    duration30: $("duration-30"),
    duration60: $("duration-60"),
    plangEn: $("plang-en"),
    plangZh: $("plang-zh"),
    passageView: $("passage-view"),
    passageName: $("passage-name"),
    input: $("typing-input"),
    timeLeft: $("time-left"),
    progressBar: $("progress-bar"),
    newPassage: $("new-passage"),
    pasteNote: $("paste-note"),
    results: $("results"),
    noResult: $("no-result"),
    grossLabel: $("metric-gross-label"),
    gross: $("metric-gross"),
    netLabel: $("metric-net-label"),
    net: $("metric-net"),
    accuracy: $("metric-accuracy"),
    elapsed: $("metric-elapsed"),
    reviewView: $("review-view"),
    mistakesHeading: $("mistakes-heading"),
    mistakeList: $("mistake-list"),
    retrySame: $("retry-same"),
    retryNew: $("retry-new"),
    announce: $("announce"),
  };

  const decks = {
    en: { passages: PASSAGES.en, used: [], last: null },
    zh: { passages: PASSAGES.zh, used: [], last: null },
  };

  function draw(deck) {
    if (deck.used.length >= deck.passages.length) deck.used = [];
    const pool = deck.passages.filter((_, index) => !deck.used.includes(index));
    const pick = pool[Math.floor(random() * pool.length)];
    deck.used.push(deck.passages.indexOf(pick));
    deck.last = pick;
    return pick;
  }

  let plang = "en";
  let passage = null;
  let session = null;
  let timerId = null;
  let composing = false;
  let pasteNoted = false;
  let announcedTen = false;

  function selectedDuration() {
    return els.duration60.checked ? 60 : 30;
  }

  function setControlsLocked(locked) {
    for (const el of [els.duration30, els.duration60, els.plangEn, els.plangZh]) {
      el.disabled = locked;
    }
  }

  function renderPassage() {
    els.passageView.textContent = "";
    const typedPoints = session ? codePoints(session.typed) : [];
    const correctness = session
      ? comparePositions(passage.text, session.typed)
      : [];
    codePoints(passage.text).forEach((ch, index) => {
      const span = doc.createElement("span");
      let cls = "ch untyped";
      if (index < typedPoints.length) cls = correctness[index] ? "ch correct" : "ch incorrect";
      if (session && !session.locked && index === typedPoints.length) cls += " current";
      span.className = cls;
      span.textContent = ch;
      els.passageView.appendChild(span);
    });
    els.passageName.textContent = t("PASSAGE_SOURCE", { title: passage.title });
  }

  function renderClock() {
    if (!session) return;
    const left = session.remainingSeconds();
    els.timeLeft.textContent = t("TIME_LEFT", { seconds: Math.ceil(left) });
    const total = session.durationSeconds;
    const pct = total === 0 ? 0 : Math.min(100, Math.max(0, (left / total) * 100));
    els.progressBar.style.width = `${pct}%`;
    if (!announcedTen && session.state === "running" && left <= 10 && left > 0) {
      announcedTen = true;
      els.announce.textContent = t("ANNOUNCE_TEN");
    }
  }

  function stopTimer() {
    if (timerId !== null) {
      clearIntervalFn(timerId);
      timerId = null;
    }
  }

  function finish() {
    stopTimer();
    setControlsLocked(false);
    els.input.disabled = true;
    renderPassage();
    renderClock();
    const result = session.result();
    els.announce.textContent =
      session.endReason === "completion" ? t("ANNOUNCE_DONE") : t("ANNOUNCE_END");
    els.results.hidden = false;
    if (!result || result.noResult) {
      els.noResult.hidden = false;
      els.noResult.textContent = t("NO_CHARS");
      return;
    }
    els.noResult.hidden = true;
    const isCpm = result.unit === "CPM";
    els.grossLabel.textContent = t(isCpm ? "GROSS_CPM" : "GROSS_WPM");
    els.netLabel.textContent = t(isCpm ? "NET_CPM" : "NET_WPM");
    els.gross.textContent = String(result.grossDisplay);
    els.net.textContent = String(result.netDisplay);
    els.accuracy.textContent = result.accuracyDisplay;
    els.elapsed.textContent = result.elapsedSeconds.toFixed(1);
    // Textual review: colours are backed by the mistake list below,
    // which needs no colour perception (SPEC sections 3 and 5).
    els.reviewView.textContent = "";
    const correctness = comparePositions(passage.text, session.typed);
    const typedPoints = codePoints(session.typed);
    codePoints(passage.text).forEach((ch, index) => {
      const span = doc.createElement("span");
      span.className =
        index >= typedPoints.length
          ? "ch untyped"
          : correctness[index]
            ? "ch correct"
            : "ch incorrect";
      span.textContent = ch;
      els.reviewView.appendChild(span);
    });
    const review = reviewMistakes(passage.text, session.typed);
    els.mistakesHeading.textContent = t("MISTAKES_HEADING");
    els.mistakeList.textContent = "";
    if (review.entries.length === 0) {
      const li = doc.createElement("li");
      li.textContent = t("NONE");
      els.mistakeList.appendChild(li);
    }
    for (const entry of review.entries) {
      const li = doc.createElement("li");
      li.textContent =
        review.kind === "words"
          ? t("MISTAKE_WORD", entry)
          : t("MISTAKE_CHAR", entry);
      els.mistakeList.appendChild(li);
    }
  }

  function onTick() {
    if (!session) return;
    session.checkExpiry();
    renderClock();
    if (session.locked) finish();
  }

  function startTimerIfNeeded() {
    if (timerId === null && session && session.state === "running") {
      timerId = setIntervalFn(onTick, 50);
    }
  }

  function commitFromInput() {
    if (!session || session.locked) return;
    const wasSetup = session.state === "setup";
    session.setTyped(els.input.value ?? "");
    els.input.value = session.typed;
    renderPassage();
    if (wasSetup && session.state !== "setup") {
      setControlsLocked(true);
      els.announce.textContent = t("ANNOUNCE_START");
      startTimerIfNeeded();
    }
    renderClock();
    if (session.locked) finish();
  }

  function setup(nextPassage) {
    stopTimer();
    passage = nextPassage;
    session = new AttemptSession({
      passage: passage.text,
      durationSeconds: selectedDuration(),
      now: nowMs,
    });
    composing = false;
    announcedTen = false;
    els.input.disabled = false;
    els.input.value = "";
    els.results.hidden = true;
    els.announce.textContent = "";
    setControlsLocked(false);
    renderPassage();
    renderClock();
  }

  function confirmDiscard() {
    if (session && session.state === "running") {
      return confirmFn(t("CONFIRM_DISCARD"));
    }
    return true;
  }

  els.input.addEventListener("input", () => {
    if (!composing) commitFromInput();
  });
  els.input.addEventListener("compositionstart", () => {
    composing = true;
  });
  els.input.addEventListener("compositionend", () => {
    composing = false;
    commitFromInput();
  });
  els.input.addEventListener("paste", (event) => {
    event.preventDefault?.();
    if (!pasteNoted) {
      pasteNoted = true;
      els.pasteNote.textContent = t("PASTE_REFUSED");
    }
  });
  els.newPassage.addEventListener("click", () => {
    if (!confirmDiscard()) return;
    setup(draw(decks[plang]));
  });
  els.retrySame.addEventListener("click", () => setup(passage));
  els.retryNew.addEventListener("click", () => setup(draw(decks[plang])));
  const onPlangChange = () => {
    const next = els.plangZh.checked ? "zh" : "en";
    if (next === plang) return;
    if (!confirmDiscard()) {
      if (plang === "zh") els.plangZh.checked = true;
      else els.plangEn.checked = true;
      return;
    }
    plang = next;
    setup(draw(decks[plang]));
  };
  els.plangEn.addEventListener("change", onPlangChange);
  els.plangZh.addEventListener("change", onPlangChange);
  const onDurationChange = () => {
    if (!confirmDiscard()) return;
    setup(passage);
  };
  els.duration30.addEventListener("change", onDurationChange);
  els.duration60.addEventListener("change", onDurationChange);

  setup(draw(decks[plang]));
  return { setup, getSession: () => session, els };
}

const isBrowser = typeof document !== "undefined" && typeof window !== "undefined";
if (isBrowser) {
  createApp(document);
}
