// Controller for the Regex Tester and Replacer.
//
// The pattern and the test text are data: they are rendered only as
// text nodes and <mark> elements built from the core's result model,
// never by concatenating markup strings. Nothing is stored, sent,
// logged, or placed in the URL or the title; leaving the page throws
// everything away (SPEC sections 3 and 5).

import { presetById, runMatch, runReplace } from "./core/regex.mjs";
import { errorMessage, translate } from "./i18n.mjs";

function defaultClipboard() {
  return globalThis.navigator?.clipboard ?? null;
}

export function createApp(doc, env = {}) {
  const lang = doc.documentElement?.lang === "en" ? "en" : "zh-Hant";
  const t = (code, params) => translate(lang, code, params);
  const $ = (id) => doc.querySelector(`#${id}`);
  const clipboard = env.clipboard ?? defaultClipboard();
  const setTimeoutFn = env.setTimeout ?? globalThis.setTimeout.bind(globalThis);
  const clearTimeoutFn = env.clearTimeout ?? globalThis.clearTimeout.bind(globalThis);
  const debounceMs = env.debounceMs ?? 150;

  const els = {
    pattern: $("pattern"),
    patternError: $("pattern-error"),
    flagG: $("flag-g"),
    flagI: $("flag-i"),
    flagM: $("flag-m"),
    flagS: $("flag-s"),
    flagU: $("flag-u"),
    flagY: $("flag-y"),
    text: $("sample-text"),
    highlight: $("highlight-view"),
    matchList: $("match-list"),
    footer: $("result-footer"),
    replaceToggle: $("replace-toggle"),
    replacePanel: $("replace-panel"),
    replacement: $("replacement"),
    replaceResult: $("replace-result"),
    replaceCount: $("replace-count"),
    copyResult: $("copy-result"),
    clear: $("clear-button"),
    statusNote: $("status-note"),
    announce: $("announce"),
  };
  const flagEls = { g: els.flagG, i: els.flagI, m: els.flagM, s: els.flagS, u: els.flagU, y: els.flagY };
  const presetButtons = {
    email: $("preset-email"),
    date: $("preset-date"),
    order: $("preset-order"),
    log: $("preset-log"),
  };

  let timer = null;
  let selectedNumber = 0;
  let markByNumber = new Map();

  function clearChildren(node) {
    node.textContent = "";
  }

  function readFlags() {
    const flags = {};
    for (const [flag, el] of Object.entries(flagEls)) flags[flag] = Boolean(el.checked);
    return flags;
  }

  function renderHighlight(text, matches) {
    clearChildren(els.highlight);
    markByNumber = new Map();
    let cursor = 0;
    for (const match of matches) {
      if (match.startUnit > cursor) {
        els.highlight.appendChild(doc.createTextNode(text.slice(cursor, match.startUnit)));
      }
      if (match.zeroWidth) {
        const caret = doc.createElement("span");
        caret.setAttribute("class", match.number === selectedNumber ? "caret selected" : "caret");
        caret.setAttribute("title", t("ZERO_WIDTH_AT", { pos: match.startCp }));
        caret.setAttribute("data-position", String(match.startCp));
        caret.addEventListener("click", () => selectMatch(match.number));
        els.highlight.appendChild(caret);
        markByNumber.set(match.number, caret);
      } else {
        const mark = doc.createElement("mark");
        if (match.number === selectedNumber) mark.setAttribute("class", "selected");
        mark.textContent = text.slice(match.startUnit, match.endUnit);
        mark.addEventListener("click", () => selectMatch(match.number));
        els.highlight.appendChild(mark);
        markByNumber.set(match.number, mark);
      }
      cursor = match.endUnit;
    }
    if (cursor < text.length) {
      els.highlight.appendChild(doc.createTextNode(text.slice(cursor)));
    }
  }

  function renderMatchList(matches) {
    clearChildren(els.matchList);
    for (const match of matches) {
      const item = doc.createElement("div");
      item.setAttribute("class", "match-item");
      const head = doc.createElement("button");
      head.setAttribute("type", "button");
      head.setAttribute("class", "match-head");
      head.textContent =
        `${t("MATCH_HEADING", { number: match.number })} · ` +
        `${t("POSITION_UNITS", { start: match.startUnit, end: match.endUnit })} · ` +
        `${t("POSITION_POINTS", { start: match.startCp, end: match.endCp })}`;
      head.addEventListener("click", () => selectMatch(match.number));
      item.appendChild(head);
      const matched = doc.createElement("div");
      matched.setAttribute("class", "match-text mono");
      matched.textContent = match.zeroWidth
        ? t("ZERO_WIDTH_AT", { pos: match.startCp })
        : match.text;
      item.appendChild(matched);
      if (match.groups.length > 0) {
        const table = doc.createElement("ul");
        table.setAttribute("class", "group-table");
        for (const group of match.groups) {
          const row = doc.createElement("li");
          const label = group.name
            ? `${t("GROUP_LABEL", { number: group.number })} (${group.name})`
            : t("GROUP_LABEL", { number: group.number });
          const value = group.value === null
            ? t("DID_NOT_PARTICIPATE")
            : group.value === ""
              ? t("EMPTY_GROUP")
              : group.value;
          row.textContent = `${label}: ${value}`;
          table.appendChild(row);
        }
        item.appendChild(table);
      }
      els.matchList.appendChild(item);
    }
  }

  function selectMatch(number) {
    selectedNumber = number;
    for (const [n, el] of markByNumber) {
      const isCaret = el.getAttribute("data-position") !== null;
      el.setAttribute("class", isCaret
        ? (n === number ? "caret selected" : "caret")
        : (n === number ? "selected" : ""));
    }
    const target = markByNumber.get(number);
    if (target && typeof target.scrollIntoView === "function") {
      target.scrollIntoView();
    }
  }

  function renderReplace(pattern, flags, text) {
    if (els.replacePanel.hidden) return;
    try {
      const outcome = runReplace({
        pattern,
        flags,
        text,
        replacement: els.replacement.value,
      });
      els.replaceResult.textContent = outcome.result;
      els.replaceCount.textContent = t("REPLACE_COUNT", { count: outcome.count });
    } catch (error) {
      els.replaceResult.textContent = "";
      els.replaceCount.textContent = errorMessage(lang, error);
    }
  }

  function showError(message, text) {
    els.patternError.textContent = message;
    renderHighlight(text, []);
    renderMatchList([]);
    els.footer.textContent = "";
    els.replaceResult.textContent = "";
    els.replaceCount.textContent = "";
  }

  function refresh() {
    timer = null;
    const pattern = els.pattern.value;
    const text = els.text.value;
    const flags = readFlags();
    els.patternError.textContent = "";
    let outcome;
    try {
      outcome = runMatch({ pattern, flags, text });
    } catch (error) {
      if (error instanceof SyntaxError) {
        // The engine's message, verbatim (SPEC 3): never a silent
        // "0 matches" for an unparseable pattern.
        showError(t("ERROR_PREFIX") + error.message, text);
      } else {
        showError(errorMessage(lang, error), text);
      }
      return;
    }
    selectedNumber = 0;
    renderHighlight(text, outcome.matches);
    renderMatchList(outcome.matches);
    if (outcome.matches.length === 0) {
      els.footer.textContent = t("NO_MATCHES");
    } else {
      const summary = t("MATCH_COUNT", { count: outcome.matches.length, ms: outcome.elapsedMs });
      els.footer.textContent = outcome.capped ? `${summary} — ${t("CAP_NOTICE")}` : summary;
    }
    renderReplace(pattern, flags, text);
  }

  function schedule() {
    if (timer !== null) clearTimeoutFn(timer);
    timer = setTimeoutFn(refresh, debounceMs);
  }

  for (const el of [els.pattern, els.text, els.replacement]) {
    el.addEventListener("input", schedule);
  }
  for (const el of Object.values(flagEls)) {
    el.addEventListener("change", schedule);
  }
  for (const [id, button] of Object.entries(presetButtons)) {
    button.addEventListener("click", () => {
      const preset = presetById(id);
      if (!preset) return;
      els.pattern.value = preset.pattern;
      els.text.value = preset.text;
      refresh();
    });
  }
  els.replaceToggle.addEventListener("click", () => {
    const open = els.replacePanel.hidden;
    els.replacePanel.hidden = !open;
    els.replaceToggle.setAttribute("aria-expanded", open ? "true" : "false");
    refresh();
  });
  els.copyResult.addEventListener("click", async () => {
    if (!clipboard || typeof clipboard.writeText !== "function") {
      els.statusNote.textContent = t("COPY_FAILED");
      return;
    }
    try {
      await clipboard.writeText(els.replaceResult.textContent);
      els.statusNote.textContent = t("COPIED");
    } catch {
      els.statusNote.textContent = t("COPY_FAILED");
    }
  });
  els.clear.addEventListener("click", () => {
    els.pattern.value = "";
    els.text.value = "";
    els.replacement.value = "";
    for (const [flag, el] of Object.entries(flagEls)) el.checked = flag === "g";
    els.replacePanel.hidden = true;
    els.replaceToggle.setAttribute("aria-expanded", "false");
    els.statusNote.textContent = t("CLEARED");
    refresh();
  });

  refresh();

  return { refresh, selectMatch };
}

const isBrowser = typeof document !== "undefined" && typeof window !== "undefined";
if (isBrowser) {
  createApp(document);
}
