// QR Code Maker controller. Binds the form controls to the pure core:
// every keystroke (debounced) re-derives the payload, re-encodes the
// symbol and repaints the preview from the module matrix. Downloads act
// only on the currently displayed symbol. Nothing is stored or sent.

import {
  QrError,
  buildWifiPayload,
  capacityInfo,
  contrastWarning,
  encodeQr,
  makeFilename,
  parseHexColor,
  renderPixels,
  svgString,
  utf8ByteLength,
} from "./core/qr.mjs";
import { encodePng } from "./core/png.mjs";
import { translate } from "./i18n.mjs";

const DEBOUNCE_MS = 120;
const MODULE_PX = 8;
const BLACK = [0, 0, 0];
const WHITE = [255, 255, 255];

export function createApp(doc, env = {}) {
  const createObjectURL = env.createObjectURL ?? ((blob) => URL.createObjectURL(blob));
  const revokeObjectURL = env.revokeObjectURL ?? ((url) => URL.revokeObjectURL(url));
  const now = env.now ?? (() => new Date());
  const clipboard = env.clipboard ?? (typeof navigator !== "undefined" ? navigator.clipboard : undefined);
  const lang = doc.documentElement && doc.documentElement.lang && doc.documentElement.lang.startsWith("en") ? "en" : "zh-Hant";
  const t = (code, params) => translate(lang, code, params);

  const el = {
    textTab: doc.querySelector("#mode-text-tab"),
    wifiTab: doc.querySelector("#mode-wifi-tab"),
    textPanel: doc.querySelector("#panel-text"),
    wifiPanel: doc.querySelector("#panel-wifi"),
    inputText: doc.querySelector("#input-text"),
    wifiSsid: doc.querySelector("#wifi-ssid"),
    wifiSecurity: doc.querySelector("#wifi-security"),
    wifiPassword: doc.querySelector("#wifi-password"),
    wifiHidden: doc.querySelector("#wifi-hidden"),
    ecRadios: [doc.querySelector("#ec-l"), doc.querySelector("#ec-m"), doc.querySelector("#ec-q"), doc.querySelector("#ec-h")],
    margin: doc.querySelector("#margin"),
    marginValue: doc.querySelector("#margin-value"),
    pngSize: doc.querySelector("#png-size"),
    fgColor: doc.querySelector("#fg-color"),
    bgColor: doc.querySelector("#bg-color"),
    warning1: doc.querySelector("#contrast-warning"),
    warning2: doc.querySelector("#contrast-warning-2"),
    bytes: doc.querySelector("#readout-bytes"),
    version: doc.querySelector("#readout-version"),
    remaining: doc.querySelector("#readout-remaining"),
    canvas: doc.querySelector("#preview-canvas"),
    previewAlt: doc.querySelector("#preview-alt"),
    stateMessage: doc.querySelector("#state-message"),
    downloadPng: doc.querySelector("#download-png"),
    downloadSvg: doc.querySelector("#download-svg"),
    copy: doc.querySelector("#copy-payload"),
    copyStatus: doc.querySelector("#copy-status"),
    clear: doc.querySelector("#clear-button"),
  };

  const state = {
    mode: "text",
    text: "",
    wifi: { ssid: "", security: "WPA", password: "", hidden: false },
    ec: "M",
    margin: 4,
    pngSize: 1024,
    fg: "#000000",
    bg: "#ffffff",
  };
  let current = null; // { payload, symbol } of the displayed symbol
  let debounceTimer = null;

  function currentPayload() {
    if (state.mode === "text") return state.text;
    return buildWifiPayload(state.wifi);
  }

  function setDownloadsEnabled(enabled) {
    el.downloadPng.disabled = !enabled;
    el.downloadSvg.disabled = !enabled;
    el.copy.disabled = !enabled;
  }

  function updateWarnings() {
    const fg = parseHexColor(state.fg) ?? BLACK;
    const bg = parseHexColor(state.bg) ?? WHITE;
    const warn = contrastWarning(fg, bg);
    el.warning1.hidden = !warn;
    el.warning2.hidden = !warn;
  }

  function showMessage(text) {
    el.stateMessage.textContent = text;
    el.stateMessage.hidden = text === "";
  }

  function draw(symbol) {
    const total = symbol.size + state.margin * 2;
    el.canvas.width = total * MODULE_PX;
    el.canvas.height = total * MODULE_PX;
    const ctx = el.canvas.getContext("2d");
    ctx.fillStyle = state.bg;
    ctx.fillRect(0, 0, el.canvas.width, el.canvas.height);
    ctx.fillStyle = state.fg;
    for (let y = 0; y < symbol.size; y += 1) {
      for (let x = 0; x < symbol.size; x += 1) {
        if (symbol.modules[y][x] === 1) {
          ctx.fillRect((x + state.margin) * MODULE_PX, (y + state.margin) * MODULE_PX, MODULE_PX, MODULE_PX);
        }
      }
    }
  }

  function render() {
    updateWarnings();
    let payload = null;
    let error = null;
    try {
      payload = currentPayload();
    } catch (err) {
      error = err;
    }
    if (error === null && payload === "") {
      current = null;
      el.canvas.hidden = true;
      el.previewAlt.textContent = "";
      showMessage(t("PLACEHOLDER"));
      el.bytes.textContent = "0";
      el.version.textContent = "–";
      el.remaining.textContent = "–";
      setDownloadsEnabled(false);
      return;
    }
    if (error === null) {
      const byteLength = utf8ByteLength(payload);
      el.bytes.textContent = String(byteLength);
      const info = capacityInfo(byteLength, state.ec);
      if (info.version === 0) {
        error = new QrError("CAPACITY_EXCEEDED", { limit: info.capacity, actual: byteLength });
        el.version.textContent = "–";
        el.remaining.textContent = String(info.remaining);
      } else {
        const symbol = encodeQr(payload, state.ec);
        current = { payload, symbol };
        el.canvas.hidden = false;
        draw(symbol);
        el.previewAlt.textContent = t("PREVIEW_PREFIX") + [...payload].slice(0, 40).join("");
        showMessage("");
        el.version.textContent = String(info.version);
        el.remaining.textContent = String(info.remaining);
        setDownloadsEnabled(true);
        return;
      }
    }
    // Error state: the message replaces the symbol; no stale symbol stays.
    current = null;
    el.canvas.hidden = true;
    el.previewAlt.textContent = "";
    if (error instanceof QrError) {
      showMessage(t(error.code, error.params));
      if (error.code !== "CAPACITY_EXCEEDED") {
        el.bytes.textContent = "–";
        el.version.textContent = "–";
        el.remaining.textContent = "–";
      }
    } else {
      showMessage(String(error && error.message ? error.message : error));
    }
    setDownloadsEnabled(false);
  }

  function scheduleRender() {
    if (debounceTimer !== null) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      render();
    }, DEBOUNCE_MS);
  }

  function download(blob, filename) {
    const url = createObjectURL(blob);
    const anchor = doc.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    doc.body.append(anchor);
    anchor.click();
    anchor.remove();
    revokeObjectURL(url);
  }

  function setMode(mode) {
    state.mode = mode;
    el.textPanel.hidden = mode !== "text";
    el.wifiPanel.hidden = mode !== "wifi";
    el.textTab.setAttribute("aria-selected", mode === "text" ? "true" : "false");
    el.wifiTab.setAttribute("aria-selected", mode === "wifi" ? "true" : "false");
    render();
  }

  el.textTab.addEventListener("click", () => setMode("text"));
  el.wifiTab.addEventListener("click", () => setMode("wifi"));
  el.inputText.addEventListener("input", () => {
    state.text = el.inputText.value;
    scheduleRender();
  });
  const wifiChanged = () => {
    state.wifi = {
      ssid: el.wifiSsid.value,
      security: el.wifiSecurity.value,
      password: el.wifiPassword.value,
      hidden: el.wifiHidden.checked === true,
    };
    scheduleRender();
  };
  el.wifiSsid.addEventListener("input", wifiChanged);
  el.wifiSecurity.addEventListener("change", wifiChanged);
  el.wifiPassword.addEventListener("input", wifiChanged);
  el.wifiHidden.addEventListener("change", wifiChanged);
  for (const radio of el.ecRadios) {
    radio.addEventListener("change", () => {
      if (radio.checked) {
        state.ec = radio.value;
        render();
      }
    });
  }
  el.margin.addEventListener("input", () => {
    const value = Number.parseInt(el.margin.value, 10);
    state.margin = Number.isFinite(value) ? Math.min(8, Math.max(0, value)) : 4;
    el.marginValue.textContent = String(state.margin);
    render();
  });
  el.pngSize.addEventListener("change", () => {
    const value = Number.parseInt(el.pngSize.value, 10);
    state.pngSize = Number.isFinite(value) ? Math.min(4096, Math.max(256, value)) : 1024;
    el.pngSize.value = String(state.pngSize);
  });
  el.fgColor.addEventListener("input", () => {
    state.fg = el.fgColor.value;
    render();
  });
  el.bgColor.addEventListener("input", () => {
    state.bgColor = el.bgColor.value;
    render();
  });

  el.downloadPng.addEventListener("click", () => {
    if (!current) return;
    const pixels = renderPixels(current.symbol.modules, {
      margin: state.margin,
      size: state.pngSize,
      foreground: parseHexColor(state.fg) ?? BLACK,
      background: parseHexColor(state.bg) ?? WHITE,
    });
    const png = encodePng(pixels.width, pixels.height, pixels.data);
    download(new Blob([png], { type: "image/png" }), makeFilename(now(), "png"));
  });
  el.downloadSvg.addEventListener("click", () => {
    if (!current) return;
    const svg = svgString(current.symbol.modules, {
      margin: state.margin,
      foreground: state.fg,
      background: state.bg,
    });
    download(new Blob([svg], { type: "image/svg+xml" }), makeFilename(now(), "svg"));
  });
  el.copy.addEventListener("click", async () => {
    if (!current) return;
    if (!clipboard || typeof clipboard.writeText !== "function") {
      el.copyStatus.textContent = t("COPY_FAILED");
      return;
    }
    try {
      await clipboard.writeText(current.payload);
      el.copyStatus.textContent = t("COPIED");
    } catch {
      el.copyStatus.textContent = t("COPY_FAILED");
    }
  });
  el.clear.addEventListener("click", () => {
    if (state.mode === "text") {
      state.text = "";
      el.inputText.value = "";
    } else {
      state.wifi = { ssid: "", security: "WPA", password: "", hidden: false };
      el.wifiSsid.value = "";
      el.wifiSecurity.value = "WPA";
      el.wifiPassword.value = "";
      el.wifiHidden.checked = false;
    }
    el.copyStatus.textContent = "";
    render();
  });

  render();
  return { render, getCurrent: () => current, elements: el, state };
}

if (typeof document !== "undefined" && document.querySelector("#input-text")) {
  createApp(document);
}
