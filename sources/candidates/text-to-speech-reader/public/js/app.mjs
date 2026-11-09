// DOM layer for the Text-to-Speech Reader.
//
// Text is data: the sentence list is built with text nodes only, so
// pasted markup can never become markup (SPEC section 5). All playback
// decisions live in the speech controller (public/js/controller.mjs)
// over the platform speechSynthesis; this file only wires controls,
// voices, progress and announcements to it.

import {
  buildChunks,
  codePointLength,
  segmentText,
  TEXT_LIMIT,
} from "./core/tts.mjs";
import { createSpeechController } from "./controller.mjs";
import { errorMessage, translate } from "./i18n.mjs";

const LANG = document.documentElement.lang === "en" ? "en" : "zh-Hant";
const t = (code, params) => translate(LANG, code, params);
const $ = (id) => document.querySelector(`#${id}`);

const supported =
  typeof window.speechSynthesis !== "undefined" &&
  typeof window.SpeechSynthesisUtterance === "function";

if (!supported) {
  // SPEC section 3: an unsupported browser shows only the panel.
  $("unsupported-panel").hidden = false;
} else {
  $("reader-panel").hidden = false;
  initReader(window.speechSynthesis);
}

function initReader(synth) {
  const textInput = $("text-input");
  const fileInput = $("file-input");
  const charCount = $("char-count");
  const voiceSelect = $("voice-select");
  const voicesStatus = $("voices-status");
  const networkNotice = $("network-notice");
  const rateInput = $("rate-input");
  const rateValue = $("rate-value");
  const pitchInput = $("pitch-input");
  const pitchValue = $("pitch-value");
  const playButton = $("play-button");
  const pauseButton = $("pause-button");
  const resumeButton = $("resume-button");
  const stopButton = $("stop-button");
  const clearButton = $("clear-button");
  const progressText = $("progress-text");
  const progressMeter = $("progress-meter");
  const errorBox = $("error-box");
  const sentenceList = $("sentence-list");
  const liveRegion = $("live-region");

  let voices = [];
  let selectedVoice = null;
  let built = { sentences: [], chunks: [] };
  let lastAnnouncedSentence = 0;
  let previousState = "idle";

  const controller = createSpeechController({
    synth,
    createUtterance: (text) => new SpeechSynthesisUtterance(text),
    getSettings: () => ({
      voice: selectedVoice,
      rate: Number(rateInput.value),
      pitch: Number(pitchInput.value),
    }),
    onStateChange: (state) => renderTransport(state),
    onProgress: (progress) => renderProgress(progress),
    onError: (name) => {
      showError(t("UTTERANCE_ERROR", { name }));
      announce(t("UTTERANCE_ERROR", { name }));
    },
  });

  function announce(message) {
    liveRegion.textContent = message;
  }

  function showError(message) {
    errorBox.textContent = message;
    errorBox.hidden = false;
  }

  function clearError() {
    errorBox.textContent = "";
    errorBox.hidden = true;
  }

  function hasPlayableText() {
    return (
      textInput.value.trim() !== "" &&
      codePointLength(textInput.value) <= TEXT_LIMIT
    );
  }

  function renderTransport(state) {
    const idle = state === "idle";
    playButton.disabled = !idle || !hasPlayableText() || !selectedVoice;
    pauseButton.hidden = state !== "speaking";
    resumeButton.hidden = state !== "paused";
    stopButton.disabled = idle;
    if (state === "paused" && previousState === "speaking") {
      announce(t("ANNOUNCE_PAUSED", {
        current: lastAnnouncedSentence || 1,
        total: built.sentences.length,
      }));
    }
    if (state === "idle" && previousState !== "idle") {
      // Finished vs stopped is distinguished in renderProgress/announce
      // by the completion percentage; the stop button announces itself.
    }
    previousState = state;
  }

  function renderProgress(progress) {
    const items = sentenceList.querySelectorAll("li");
    items.forEach((item, index) => {
      const active =
        progress.currentChunk >= 0 && index === progress.sentence - 1;
      item.classList.toggle("current", active);
      if (active) item.setAttribute("aria-current", "true");
      else item.removeAttribute("aria-current");
    });
    if (progress.totalChars === 0 || progress.totalSentences === 0) {
      progressText.textContent = t("PROGRESS_IDLE");
      progressMeter.value = 0;
      return;
    }
    if (progress.currentChunk === -1 && progress.percent === 0) {
      progressText.textContent = t("PROGRESS_IDLE");
      progressMeter.value = 0;
      lastAnnouncedSentence = 0;
      return;
    }
    progressText.textContent = t("PROGRESS", {
      current: progress.sentence,
      total: progress.totalSentences,
      percent: progress.percent,
    });
    progressMeter.value = progress.percent;
    if (progress.state === "speaking" && progress.sentence !== lastAnnouncedSentence) {
      lastAnnouncedSentence = progress.sentence;
      announce(t("ANNOUNCE_PLAYING", {
        current: progress.sentence,
        total: progress.totalSentences,
      }));
    }
    if (
      progress.state === "idle" &&
      progress.percent === 100 &&
      lastAnnouncedSentence !== 0
    ) {
      lastAnnouncedSentence = 0;
      announce(t("ANNOUNCE_FINISHED", { total: progress.totalSentences }));
    }
  }

  function renderSentenceList(sentences) {
    const items = sentences.map((sentence, index) => {
      const item = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.className = "sentence-button";
      button.textContent = sentence; // text node only: never markup
      button.addEventListener("click", () => {
        // SPEC section 3: clicking a sentence while idle starts
        // playback from that sentence.
        if (controller.state !== "idle") return;
        clearError();
        controller.playFromSentence(index);
      });
      item.append(button);
      return item;
    });
    sentenceList.replaceChildren(...items);
  }

  function refreshPreview() {
    // SPEC section 3: editing text during playback stops playback.
    if (controller.state !== "idle") controller.stop();
    const text = textInput.value;
    charCount.textContent = t("CHAR_COUNT", { count: codePointLength(text) });
    renderSentenceList(segmentText(text));
    try {
      built = buildChunks(text);
      controller.load(built.chunks, built.sentences.length);
      if (errorBox.dataset.code === "TEXT_TOO_LONG") clearError();
    } catch (error) {
      built = { sentences: segmentText(text), chunks: [] };
      controller.load([], 0);
      if (error && error.code === "TEXT_TOO_LONG") {
        errorBox.dataset.code = "TEXT_TOO_LONG";
        showError(errorMessage(LANG, error));
      }
    }
    renderTransport(controller.state);
  }

  function pickDefaultVoice() {
    const primary = LANG === "en" ? "en" : "zh";
    return (
      voices.find(
        (voice) =>
          voice.lang && voice.lang.toLowerCase().startsWith(primary),
      ) ??
      voices.find((voice) => voice.default) ??
      voices[0] ??
      null
    );
  }

  function refreshVoices() {
    const list = synth.getVoices();
    if (!list || list.length === 0) {
      voicesStatus.textContent =
        voices.length === 0 ? t("VOICES_LOADING") : voicesStatus.textContent;
      return;
    }
    const previousURI = selectedVoice ? selectedVoice.voiceURI : null;
    voices = list;
    const options = voices.map((voice, index) => {
      const option = document.createElement("option");
      option.value = String(index);
      option.textContent = `${voice.name} — ${voice.lang} · ${
        voice.localService ? t("LOCAL") : t("NETWORK")
      }`;
      return option;
    });
    voiceSelect.replaceChildren(...options);
    selectedVoice =
      voices.find((voice) => voice.voiceURI === previousURI) ??
      pickDefaultVoice();
    voiceSelect.value = String(voices.indexOf(selectedVoice));
    voicesStatus.textContent = "";
    updateNetworkNotice();
    renderTransport(controller.state);
  }

  function updateNetworkNotice() {
    // SPEC section 3/6: the disclosure shows when the selected voice
    // is a network voice, so it is always seen before such a voice
    // first speaks.
    networkNotice.hidden = !(selectedVoice && !selectedVoice.localService);
  }

  voiceSelect.addEventListener("change", () => {
    selectedVoice = voices[Number(voiceSelect.value)] ?? null;
    updateNetworkNotice();
    renderTransport(controller.state);
  });

  textInput.addEventListener("input", refreshPreview);

  fileInput.addEventListener("change", () => {
    const file = fileInput.files && fileInput.files[0];
    fileInput.value = "";
    if (!file) return;
    file.arrayBuffer().then((buffer) => {
      let text;
      try {
        // SPEC section 4: a picked file is read locally and decoded
        // as UTF-8; a decode failure is a named error.
        text = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
      } catch {
        showError(translate(LANG, "FILE_DECODE"));
        return;
      }
      if (controller.state !== "idle") controller.stop();
      textInput.value = text;
      refreshPreview();
    });
  });

  rateInput.addEventListener("input", () => {
    rateValue.textContent = `${Number(rateInput.value).toFixed(1)}×`;
  });
  pitchInput.addEventListener("input", () => {
    pitchValue.textContent = Number(pitchInput.value).toFixed(1);
  });

  playButton.addEventListener("click", () => {
    clearError();
    try {
      built = buildChunks(textInput.value);
    } catch (error) {
      showError(errorMessage(LANG, error));
      return;
    }
    controller.load(built.chunks, built.sentences.length);
    controller.play(0);
  });
  pauseButton.addEventListener("click", () => controller.pause());
  resumeButton.addEventListener("click", () => controller.resume());
  stopButton.addEventListener("click", () => {
    controller.stop();
    announce(t("ANNOUNCE_STOPPED"));
  });
  clearButton.addEventListener("click", () => {
    if (controller.state !== "idle") controller.stop();
    textInput.value = "";
    clearError();
    refreshPreview();
    announce(t("CLEARED"));
    textInput.focus();
  });

  // SPEC section 3: leaving the page cancels speech.
  window.addEventListener("pagehide", () => synth.cancel());
  window.addEventListener("beforeunload", () => synth.cancel());

  if (typeof synth.addEventListener === "function") {
    synth.addEventListener("voiceschanged", refreshVoices);
  } else {
    synth.onvoiceschanged = refreshVoices;
  }
  refreshVoices();
  // SPEC section 3: a 1-second fallback re-poll, so the list never
  // hangs empty when voices exist but voiceschanged never fired.
  window.setTimeout(() => {
    if (voices.length === 0) refreshVoices();
  }, 1000);

  rateValue.textContent = `${Number(rateInput.value).toFixed(1)}×`;
  pitchValue.textContent = Number(pitchInput.value).toFixed(1);
  refreshPreview();
}
