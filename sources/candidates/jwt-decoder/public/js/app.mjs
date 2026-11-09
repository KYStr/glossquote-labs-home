// Controller for the JWT Decoder and Claims Inspector.
//
// The token and everything decoded from it are untrusted data: they
// are rendered only as text nodes built from the core's result model,
// never by concatenating markup strings. Nothing is stored, sent,
// logged, or placed in the URL or the title; leaving the page throws
// everything away (SPEC sections 3 and 5). The signature is never
// verified — the banner in the page and the fixed note under the
// signature segment say so in both languages.

import { decodeJwt, JwtError } from "./core/jwt.mjs";
import { errorMessage, translate } from "./i18n.mjs";

function defaultClipboard() {
  return globalThis.navigator?.clipboard ?? null;
}

function defaultFormatLocal(lang) {
  const formatter = new Intl.DateTimeFormat(lang === "en" ? "en" : "zh-Hant", {
    dateStyle: "medium",
    timeStyle: "medium",
    timeZoneName: "short",
  });
  return (seconds) => formatter.format(new Date(seconds * 1000));
}

export function createApp(doc, env = {}) {
  const lang = doc.documentElement?.lang === "en" ? "en" : "zh-Hant";
  const t = (code, params) => translate(lang, code, params);
  const $ = (id) => doc.querySelector(`#${id}`);
  const clipboard = env.clipboard ?? defaultClipboard();
  const setTimeoutFn = env.setTimeout ?? globalThis.setTimeout.bind(globalThis);
  const clearTimeoutFn = env.clearTimeout ?? globalThis.clearTimeout.bind(globalThis);
  const debounceMs = env.debounceMs ?? 150;
  const nowSeconds = env.nowSeconds ?? (() => Math.floor(Date.now() / 1000));
  const formatLocal = env.formatLocal ?? defaultFormatLocal(lang);

  const els = {
    input: $("token-input"),
    clear: $("clear-button"),
    inputError: $("input-error"),
    results: $("results"),
    statusLine: $("status-line"),
    checkedAt: $("checked-at"),
    headerSummary: $("header-summary"),
    headerJson: $("header-json"),
    copyHeader: $("copy-header"),
    payloadJson: $("payload-json"),
    copyPayload: $("copy-payload"),
    claimsBody: $("claims-body"),
    signatureText: $("signature-text"),
    signatureMeta: $("signature-meta"),
    copyNote: $("copy-note"),
  };

  let pendingTimer = null;
  let currentModel = null;

  function partLabel(part) {
    if (part === "header") return t("PART_HEADER");
    if (part === "payload") return t("PART_PAYLOAD");
    return t("PART_SIGNATURE");
  }

  function relPhrase(relative) {
    const unitKey = {
      days: "UNIT_DAYS",
      hours: "UNIT_HOURS",
      minutes: "UNIT_MINUTES",
      seconds: "UNIT_SECONDS",
    }[relative.unit];
    return t(unitKey, { value: relative.value });
  }

  function timeAnnotation(name, time) {
    const rel = relPhrase(time.relative);
    const phraseKey = `${name.toUpperCase()}_${time.tense === "past" ? "PAST" : "FUTURE"}`;
    const phrase = t(phraseKey, { rel });
    return `${t("LOCAL_TIME")}: ${formatLocal(time.seconds)} · UTC: ${time.utc} · ${phrase}`;
  }

  function renderClaims(model) {
    els.claimsBody.textContent = "";
    for (const row of model.claims) {
      const tr = doc.createElement("tr");
      const nameCell = doc.createElement("td");
      nameCell.textContent = row.name;
      const valueCell = doc.createElement("td");
      valueCell.textContent = JSON.stringify(row.value);
      const noteCell = doc.createElement("td");
      if (row.time) {
        noteCell.textContent = timeAnnotation(row.name, row.time);
      } else if (row.warning === "NOT_NUMERICDATE") {
        noteCell.textContent = `${row.name} ${t("NOT_NUMERICDATE")}`;
      } else if (row.audience?.list) {
        noteCell.textContent = t("AUD_LIST", { count: row.audience.count });
      } else {
        noteCell.textContent = "";
      }
      tr.appendChild(nameCell);
      tr.appendChild(valueCell);
      tr.appendChild(noteCell);
      els.claimsBody.appendChild(tr);
    }
  }

  function renderSummary(model) {
    els.headerSummary.textContent = "";
    for (const item of model.headerSummary) {
      const line = doc.createElement("p");
      const shown = item.isString ? item.value : JSON.stringify(item.value);
      line.textContent = item.isString
        ? `${item.name}: ${shown}`
        : `${item.name}: ${shown} ${t("NONSTRING_NOTE")}`;
      els.headerSummary.appendChild(line);
    }
  }

  function showEmpty() {
    currentModel = null;
    els.results.hidden = true;
    els.inputError.textContent = "";
  }

  function showError(error) {
    currentModel = null;
    els.results.hidden = true;
    if (error instanceof JwtError) {
      const params = { ...error.params };
      if (params.part) params.part = partLabel(params.part);
      let code = error.code;
      if (code === "INVALID_JSON" && params.position !== null && params.position !== undefined) {
        code = "INVALID_JSON_POSITION";
      }
      els.inputError.textContent = errorMessage(lang, code, params);
    } else {
      els.inputError.textContent = String(error?.message ?? error);
    }
  }

  function showModel(model) {
    currentModel = model;
    els.inputError.textContent = "";
    els.results.hidden = false;
    els.statusLine.textContent = t(`STATUS_${model.status}`);
    els.checkedAt.textContent = t("CHECKED_AT", {
      time: formatLocal(model.checkedAtSeconds),
    });
    renderSummary(model);
    els.headerJson.textContent = model.headerJson;
    els.payloadJson.textContent = model.payloadJson;
    renderClaims(model);
    els.signatureText.textContent = model.signatureText;
    els.signatureMeta.textContent =
      model.signatureBytes === 0
        ? `${t("EMPTY_SIGNATURE")} · ${t("BYTES", { count: 0 })}`
        : t("BYTES", { count: model.signatureBytes });
  }

  function run() {
    pendingTimer = null;
    const value = els.input.value ?? "";
    if (value.trim() === "") {
      showEmpty();
      return;
    }
    try {
      const model = decodeJwt(value, nowSeconds());
      if (model.empty) showEmpty();
      else showModel(model);
    } catch (error) {
      showError(error);
    }
  }

  function schedule() {
    if (pendingTimer !== null) clearTimeoutFn(pendingTimer);
    pendingTimer = setTimeoutFn(run, debounceMs);
  }

  async function copyPane(which) {
    if (!currentModel || !clipboard) {
      els.copyNote.textContent = t("COPY_FAILED");
      return;
    }
    const text = which === "header" ? currentModel.headerJson : currentModel.payloadJson;
    try {
      await clipboard.writeText(text);
      els.copyNote.textContent = t("COPIED");
    } catch {
      els.copyNote.textContent = t("COPY_FAILED");
    }
  }

  els.input.addEventListener("input", schedule);
  els.clear.addEventListener("click", () => {
    if (pendingTimer !== null) {
      clearTimeoutFn(pendingTimer);
      pendingTimer = null;
    }
    els.input.value = "";
    showEmpty();
    els.copyNote.textContent = t("CLEARED");
  });
  els.copyHeader.addEventListener("click", () => copyPane("header"));
  els.copyPayload.addEventListener("click", () => copyPane("payload"));

  showEmpty();
  return { run, schedule };
}

// Browser bootstrap: the pages load this module directly.
const isBrowser = typeof document !== "undefined" && typeof window !== "undefined";
if (isBrowser) {
  createApp(document);
}
