// Controller for the Password Generator and Strength Checker.
//
// All secrets live only in page memory: nothing is stored, sent, logged
// or placed in the URL or title. The strength breakdown is rendered
// exclusively from the core's aggregate result fields, so the checked
// password itself is never quoted anywhere outside its masked field.

import {
  WORDLIST_SIZE,
  buildPool,
  checkStrength,
  createSampler,
  cryptoByteSource,
  formatBits,
  generatePassphrase,
  generatePassword,
  hasCryptoRandom,
} from "./core/password.mjs";
import { bandLabel, penaltyLabel, translate } from "./i18n.mjs";

function defaultClipboard() {
  return globalThis.navigator?.clipboard ?? null;
}

export function createApp(doc, env = {}) {
  const lang = doc.documentElement?.lang === "en" ? "en" : "zh-Hant";
  const t = (code, params) => translate(lang, code, params);
  const $ = (id) => doc.querySelector(`#${id}`);
  const cryptoObject = env.crypto ?? globalThis.crypto ?? null;
  const clipboard = env.clipboard ?? defaultClipboard();
  const setTimeoutFn = env.setTimeout ?? globalThis.setTimeout.bind(globalThis);
  const clearTimeoutFn = env.clearTimeout ?? globalThis.clearTimeout.bind(globalThis);
  const makeSampler = env.makeSampler ?? (() =>
    createSampler(cryptoByteSource(cryptoObject)));

  const els = {
    announce: $("announce"),
    statusNote: $("status-note"),
    cryptoWarning: $("crypto-warning"),
    wipe: $("wipe-button"),
    pwLength: $("pw-length"),
    pwLower: $("pw-lower"),
    pwUpper: $("pw-upper"),
    pwDigits: $("pw-digits"),
    pwSymbols: $("pw-symbols"),
    pwNoAmbiguous: $("pw-no-ambiguous"),
    pwCount: $("pw-count"),
    pwExpected: $("pw-expected"),
    pwReplaceNote: $("pw-replace-note"),
    pwGenerate: $("pw-generate"),
    pwError: $("pw-error"),
    pwList: $("pw-list"),
    ppWords: $("pp-words"),
    ppSeparator: $("pp-separator"),
    ppCapitalize: $("pp-capitalize"),
    ppDigit: $("pp-digit"),
    ppCount: $("pp-count"),
    ppExpected: $("pp-expected"),
    ppReplaceNote: $("pp-replace-note"),
    ppGenerate: $("pp-generate"),
    ppError: $("pp-error"),
    ppList: $("pp-list"),
    checkInput: $("check-input"),
    checkToggle: $("check-toggle"),
    checkError: $("check-error"),
    checkBreakdown: $("check-breakdown"),
    checkFinal: $("check-final"),
  };
  const tabs = {
    password: { tab: $("tab-password"), panel: $("panel-password") },
    passphrase: { tab: $("tab-passphrase"), panel: $("panel-passphrase") },
    check: { tab: $("tab-check"), panel: $("panel-check") },
  };

  function switchTab(name) {
    for (const [key, entry] of Object.entries(tabs)) {
      const active = key === name;
      entry.panel.hidden = !active;
      entry.tab.setAttribute("aria-selected", active ? "true" : "false");
    }
  }
  for (const [name, entry] of Object.entries(tabs)) {
    entry.tab.addEventListener("click", () => switchTab(name));
  }

  function clearChildren(node) {
    node.textContent = "";
  }

  function renderList(listEl, items) {
    clearChildren(listEl);
    for (const item of items) {
      const row = doc.createElement("div");
      row.setAttribute("class", "secret-row");
      const secret = doc.createElement("span");
      secret.setAttribute("class", "secret");
      secret.textContent = item.text;
      const bits = doc.createElement("span");
      bits.setAttribute("class", "bits");
      bits.textContent = `${formatBits(item.entropy)}`;
      const copy = doc.createElement("button");
      copy.setAttribute("type", "button");
      copy.setAttribute("class", "copy-button");
      copy.textContent = item.copyLabel;
      copy.addEventListener("click", async () => {
        if (!clipboard || typeof clipboard.writeText !== "function") {
          els.statusNote.textContent = t("COPY_FAILED");
          return;
        }
        try {
          await clipboard.writeText(item.text);
          els.statusNote.textContent = t("COPIED");
        } catch {
          els.statusNote.textContent = t("COPY_FAILED");
        }
      });
      row.appendChild(secret);
      row.appendChild(bits);
      row.appendChild(copy);
      listEl.appendChild(row);
    }
  }

  function batchCount(input) {
    const value = Number.parseInt(input.value, 10);
    if (!Number.isInteger(value)) return 1;
    return Math.min(10, Math.max(1, value));
  }

  function passwordOptions() {
    return {
      length: Number.parseInt(els.pwLength.value, 10),
      lower: els.pwLower.checked,
      upper: els.pwUpper.checked,
      digits: els.pwDigits.checked,
      symbols: els.pwSymbols.checked,
      excludeAmbiguous: els.pwNoAmbiguous.checked,
    };
  }

  function updatePasswordExpected() {
    const options = passwordOptions();
    try {
      const { poolSize } = buildPool(options);
      if (poolSize === 0 || !Number.isInteger(options.length)) {
        els.pwExpected.textContent = "";
        return;
      }
      els.pwExpected.textContent = formatBits(options.length * Math.log2(poolSize));
    } catch {
      els.pwExpected.textContent = "";
    }
  }

  function passphraseOptions() {
    return {
      wordCount: Number.parseInt(els.ppWords.value, 10),
      separator: els.ppSeparator.value,
      capitalizeOne: els.ppCapitalize.checked,
      trailingDigit: els.ppDigit.checked,
    };
  }

  function updatePassphraseExpected() {
    const options = passphraseOptions();
    if (!Number.isInteger(options.wordCount) || options.wordCount < 3 || options.wordCount > 10) {
      els.ppExpected.textContent = "";
      return;
    }
    let entropy = options.wordCount * Math.log2(WORDLIST_SIZE);
    if (options.capitalizeOne) entropy += Math.log2(options.wordCount);
    if (options.trailingDigit) entropy += Math.log2(10);
    els.ppExpected.textContent = formatBits(entropy);
  }

  function refuseIfNoCrypto(errorEl) {
    if (hasCryptoRandom(cryptoObject)) return false;
    errorEl.textContent = t("NO_CRYPTO");
    return true;
  }

  els.pwGenerate.addEventListener("click", () => {
    els.pwError.textContent = "";
    if (refuseIfNoCrypto(els.pwError)) return;
    try {
      const options = passwordOptions();
      const count = batchCount(els.pwCount);
      const sampler = makeSampler();
      const items = [];
      for (let i = 0; i < count; i += 1) {
        const item = generatePassword(options, sampler);
        items.push({ text: item.text, entropy: item.entropy, copyLabel: t("COPY") });
      }
      renderList(els.pwList, items);
      els.pwReplaceNote.textContent = t("REPLACE_NOTE", { count: items.length });
      els.announce.textContent = t("GENERATED", { bits: formatBits(items[0].entropy) });
    } catch (error) {
      els.pwError.textContent = t(error.code ?? "INTERNAL_REDRAW_EXHAUSTED");
    }
  });

  els.ppGenerate.addEventListener("click", () => {
    els.ppError.textContent = "";
    if (refuseIfNoCrypto(els.ppError)) return;
    try {
      const options = passphraseOptions();
      const count = batchCount(els.ppCount);
      const sampler = makeSampler();
      const items = [];
      for (let i = 0; i < count; i += 1) {
        const item = generatePassphrase(options, sampler);
        items.push({ text: item.text, entropy: item.entropy, copyLabel: t("COPY") });
      }
      renderList(els.ppList, items);
      els.ppReplaceNote.textContent = t("REPLACE_NOTE", { count: items.length });
      els.announce.textContent = t("GENERATED", { bits: formatBits(items[0].entropy) });
    } catch (error) {
      els.ppError.textContent = t(error.code ?? "INTERNAL_REDRAW_EXHAUSTED");
    }
  });

  let checkTimer = null;
  function runCheck() {
    const value = els.checkInput.value;
    els.checkError.textContent = "";
    clearChildren(els.checkBreakdown);
    els.checkFinal.textContent = "";
    if (value === "") {
      const line = doc.createElement("p");
      line.textContent = t("CHECK_EMPTY");
      els.checkBreakdown.appendChild(line);
      return;
    }
    let result;
    try {
      result = checkStrength(value);
    } catch (error) {
      els.checkError.textContent = t(error.code ?? "CHECK_TOO_LONG");
      return;
    }
    const base = doc.createElement("p");
    base.textContent = t("BASE_LINE", { bits: formatBits(result.baseBits), pool: result.basePool });
    els.checkBreakdown.appendChild(base);
    if (result.nonAscii) {
      const note = doc.createElement("p");
      note.textContent = t("NON_ASCII_NOTE");
      els.checkBreakdown.appendChild(note);
    }
    if (result.penalties.length === 0) {
      const none = doc.createElement("p");
      none.textContent = t("NO_PENALTY");
      els.checkBreakdown.appendChild(none);
    } else {
      for (const penalty of result.penalties) {
        const line = doc.createElement("p");
        line.textContent = t("PENALTY_LINE", {
          label: penaltyLabel(lang, penalty.code),
          amount: penalty.amount,
        });
        els.checkBreakdown.appendChild(line);
      }
    }
    els.checkFinal.textContent = t("FINAL_LINE", {
      bits: formatBits(result.finalBits),
      band: bandLabel(lang, result.band),
    });
  }
  els.checkInput.addEventListener("input", () => {
    if (checkTimer !== null) clearTimeoutFn(checkTimer);
    checkTimer = setTimeoutFn(runCheck, 150);
  });
  els.checkToggle.addEventListener("click", () => {
    els.checkInput.type = els.checkInput.type === "password" ? "text" : "password";
  });

  els.wipe.addEventListener("click", () => {
    clearChildren(els.pwList);
    clearChildren(els.ppList);
    els.pwReplaceNote.textContent = "";
    els.ppReplaceNote.textContent = "";
    els.pwError.textContent = "";
    els.ppError.textContent = "";
    els.checkInput.value = "";
    els.checkError.textContent = "";
    clearChildren(els.checkBreakdown);
    els.checkFinal.textContent = "";
    els.statusNote.textContent = "";
    els.announce.textContent = "";
  });

  for (const input of [
    els.pwLength, els.pwLower, els.pwUpper, els.pwDigits, els.pwSymbols, els.pwNoAmbiguous,
  ]) {
    input.addEventListener("input", updatePasswordExpected);
    input.addEventListener("change", updatePasswordExpected);
  }
  for (const input of [els.ppWords, els.ppSeparator, els.ppCapitalize, els.ppDigit]) {
    input.addEventListener("input", updatePassphraseExpected);
    input.addEventListener("change", updatePassphraseExpected);
  }

  if (!hasCryptoRandom(cryptoObject)) {
    els.cryptoWarning.hidden = false;
    els.cryptoWarning.textContent = t("NO_CRYPTO");
  }
  switchTab("password");
  updatePasswordExpected();
  updatePassphraseExpected();
  return { switchTab, runCheck };
}

if (typeof document !== "undefined") {
  createApp(document);
}
