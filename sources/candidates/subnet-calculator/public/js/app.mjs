// DOM layer and field-sync controller for the IPv4 Subnet Calculator.
//
// All arithmetic lives in the pure core (public/js/core/subnet.mjs).
// This layer keeps the prefix and dotted-netmask fields in sync (SPEC
// section 3), renders results as labelled text rows built from text
// nodes, and replaces any previous result with the error state when
// input is invalid — a stale result never stays visible.

import {
  analyze,
  binaryView,
  checkMembership,
  formatAddress,
  parseAddress,
  parseCidr,
  parseNetmask,
  parsePrefix,
  prefixToMask,
  splitSubnet,
} from "./core/subnet.mjs";
import { errorMessage, translate } from "./i18n.mjs";

const LANG = document.documentElement.lang === "en" ? "en" : "zh-Hant";
const t = (code, params) => translate(LANG, code, params);
const $ = (id) => document.querySelector(`#${id}`);
const formatCount = (n) => n.toLocaleString("en-US");

const addressInput = $("address-input");
const prefixInput = $("prefix-input");
const netmaskInput = $("netmask-input");
const addressError = $("address-error");
const prefixError = $("prefix-error");
const netmaskError = $("netmask-error");
const resultHint = $("result-hint");
const analysisPanel = $("analysis-panel");
const analysisRows = $("analysis-rows");
const analysisNote = $("analysis-note");
const copyButton = $("copy-button");
const copyStatus = $("copy-status");
const splitPanel = $("split-panel");
const childPrefixInput = $("child-prefix-input");
const splitError = $("split-error");
const splitSummary = $("split-summary");
const splitBody = $("split-body");
const memberPanel = $("member-panel");
const memberInput = $("member-input");
const memberError = $("member-error");
const memberVerdict = $("member-verdict");
const modeRadios = [$("mode-analysis"), $("mode-split"), $("mode-member")];

let model = null; // last successful analysis (result model, SPEC 5)
let debounceTimer = 0;

function setError(element, message) {
  element.textContent = message;
  element.hidden = message === "";
}

function currentMode() {
  if ($("mode-split").checked) return "split";
  if ($("mode-member").checked) return "member";
  return "analysis";
}

function currentPrefix() {
  return parsePrefix(prefixInput.value.trim());
}

function syncFromPrefix() {
  const prefix = currentPrefix();
  netmaskInput.value = formatAddress(prefixToMask(prefix));
  setError(prefixError, "");
  setError(netmaskError, "");
}

function syncFromNetmask() {
  const prefix = parseNetmask(netmaskInput.value.trim());
  prefixInput.value = String(prefix);
  setError(prefixError, "");
  setError(netmaskError, "");
}

function row(label, value) {
  const wrap = document.createElement("div");
  wrap.className = "result-row";
  const dt = document.createElement("dt");
  dt.textContent = label;
  const dd = document.createElement("dd");
  dd.textContent = value;
  wrap.append(dt, dd);
  return wrap;
}

function binaryRow(analysis) {
  const view = binaryView(analysis.address, analysis.prefix);
  const wrap = document.createElement("div");
  wrap.className = "result-row";
  const dt = document.createElement("dt");
  dt.textContent = t("ROW_BINARY");
  const dd = document.createElement("dd");
  const bits = document.createElement("div");
  bits.className = "mono";
  view.groups.forEach((group, groupIndex) => {
    const netLength = Math.max(0, Math.min(8, view.networkBits - groupIndex * 8));
    if (netLength > 0) {
      const net = document.createElement("span");
      net.className = "binary-net";
      net.textContent = group.slice(0, netLength);
      bits.append(net);
    }
    if (netLength < 8) {
      const host = document.createElement("span");
      host.textContent = group.slice(netLength);
      bits.append(host);
    }
    if (groupIndex < 3) bits.append(document.createTextNode("."));
  });
  const caption = document.createElement("div");
  caption.className = "note";
  caption.textContent = t("BINARY_CAPTION", {
    network: view.networkBits,
    host: view.hostBits,
  });
  dd.append(bits, caption);
  wrap.append(dt, dd);
  return wrap;
}

function renderAnalysis(analysis) {
  const dotted = formatAddress;
  const rows = [
    row(t("ROW_ENTERED"), `${dotted(analysis.address)}/${analysis.prefix}`),
    row(t("ROW_NETMASK"), dotted(analysis.netmask)),
    row(t("ROW_WILDCARD"), dotted(analysis.wildcard)),
    row(t("ROW_NETWORK"), dotted(analysis.network)),
    row(t("ROW_BROADCAST"), dotted(analysis.broadcast)),
    row(t("ROW_TOTAL"), formatCount(analysis.total)),
    row(t("ROW_USABLE"), formatCount(analysis.usable)),
    row(t("ROW_FIRST"), dotted(analysis.firstUsable)),
    row(t("ROW_LAST"), dotted(analysis.lastUsable)),
    row(t("ROW_PREFIX"), `/${analysis.prefix}`),
    row(t("ROW_CLASS"), analysis.historicalClass),
    row(t("ROW_CLASSIFICATION"), t(`CLASS_${analysis.classification}`)),
    binaryRow(analysis),
  ];
  analysisRows.replaceChildren(...rows);
  analysisNote.textContent =
    analysis.usableRule === "rfc3021"
      ? t("NOTE_RFC3021")
      : analysis.usableRule === "host"
        ? t("NOTE_HOST")
        : "";
  copyButton.disabled = false;
}

function clearResults() {
  model = null;
  analysisRows.replaceChildren();
  analysisNote.textContent = "";
  copyButton.disabled = true;
  splitBody.replaceChildren();
  splitSummary.textContent = "";
  memberVerdict.textContent = "";
}

function renderSplit(address, prefix) {
  setError(splitError, "");
  splitBody.replaceChildren();
  splitSummary.textContent = "";
  const childText = childPrefixInput.value.trim();
  if (childText === "") return;
  let childPrefix;
  try {
    childPrefix = parsePrefix(childText);
  } catch (error) {
    setError(splitError, errorMessage(LANG, error));
    return;
  }
  let result;
  try {
    result = splitSubnet(address, prefix, childPrefix);
  } catch (error) {
    setError(splitError, errorMessage(LANG, error));
    return;
  }
  splitSummary.textContent = result.capped
    ? t("SPLIT_CAPPED", { count: formatCount(result.count) })
    : t("SPLIT_COUNT", { count: formatCount(result.count) });
  const rows = result.children.map((child) => {
    const tr = document.createElement("tr");
    for (const value of [
      formatAddress(child.network),
      formatAddress(child.broadcast),
      formatAddress(child.firstUsable),
      formatAddress(child.lastUsable),
      formatCount(child.usable),
    ]) {
      const td = document.createElement("td");
      td.textContent = value;
      tr.append(td);
    }
    return tr;
  });
  splitBody.replaceChildren(...rows);
}

function renderMember(address, prefix) {
  setError(memberError, "");
  memberVerdict.textContent = "";
  const otherText = memberInput.value.trim();
  if (otherText === "") return;
  let other;
  try {
    other = parseAddress(otherText);
  } catch (error) {
    setError(memberError, errorMessage(LANG, error));
    return;
  }
  const verdict = checkMembership(address, prefix, other);
  memberVerdict.textContent = t(verdict.inside ? "MEMBER_INSIDE" : "MEMBER_OUTSIDE", {
    other: formatAddress(other),
    network: formatAddress(verdict.network),
    broadcast: formatAddress(verdict.broadcast),
  });
}

function recompute() {
  setError(addressError, "");
  const rawAddress = addressInput.value.trim();
  if (rawAddress === "") {
    clearResults();
    resultHint.hidden = false;
    return;
  }
  let address;
  let prefix;
  try {
    if (rawAddress.includes("/")) {
      const parsed = parseCidr(rawAddress);
      address = parsed.address;
      prefix = parsed.prefix;
    } else {
      address = parseAddress(rawAddress);
      prefix = currentPrefix();
    }
  } catch (error) {
    // Each problem is reported at its own field; CIDR suffix problems
    // are reported in the prefix field's terms (SPEC section 4).
    if (error.code && error.code.startsWith("PREFIX")) {
      setError(prefixError, errorMessage(LANG, error));
    } else if (error.code && error.code.startsWith("NETMASK")) {
      setError(netmaskError, errorMessage(LANG, error));
    } else {
      setError(addressError, errorMessage(LANG, error));
    }
    clearResults(); // SPEC section 3: no stale result under an error
    resultHint.hidden = true;
    return;
  }
  resultHint.hidden = true;
  model = analyze(address, prefix);
  renderAnalysis(model);
  renderSplit(address, prefix);
  renderMember(address, prefix);
}

function scheduleRecompute() {
  window.clearTimeout(debounceTimer);
  debounceTimer = window.setTimeout(recompute, 120); // SPEC 3: <= 150 ms
}

addressInput.addEventListener("input", scheduleRecompute);
addressInput.addEventListener("change", () => {
  // A pasted CIDR string fills both fields (SPEC section 3): once the
  // edit is committed, split it into the address and prefix fields.
  const raw = addressInput.value.trim();
  if (!raw.includes("/")) return;
  try {
    const parsed = parseCidr(raw);
    addressInput.value = formatAddress(parsed.address);
    prefixInput.value = String(parsed.prefix);
    syncFromPrefix();
    recompute();
  } catch {
    recompute();
  }
});
prefixInput.addEventListener("input", () => {
  try {
    syncFromPrefix();
  } catch (error) {
    setError(prefixError, errorMessage(LANG, error));
    return;
  }
  scheduleRecompute();
});
netmaskInput.addEventListener("input", () => {
  try {
    syncFromNetmask();
  } catch (error) {
    setError(netmaskError, errorMessage(LANG, error));
    return;
  }
  scheduleRecompute();
});
childPrefixInput.addEventListener("input", scheduleRecompute);
memberInput.addEventListener("input", scheduleRecompute);

for (const radio of modeRadios) {
  radio.addEventListener("change", () => {
    const mode = currentMode();
    analysisPanel.hidden = mode !== "analysis";
    splitPanel.hidden = mode !== "split";
    memberPanel.hidden = mode !== "member";
    recompute(); // mode switching preserves address and prefix (SPEC 3)
  });
}

copyButton.addEventListener("click", () => {
  if (!model) return;
  // SPEC section 5: the summary is generated from the result model,
  // never scraped from the DOM, and matches the screen exactly.
  const dotted = formatAddress;
  const lines = [
    `${t("ROW_ENTERED")}: ${dotted(model.address)}/${model.prefix}`,
    `${t("ROW_NETMASK")}: ${dotted(model.netmask)}`,
    `${t("ROW_WILDCARD")}: ${dotted(model.wildcard)}`,
    `${t("ROW_NETWORK")}: ${dotted(model.network)}`,
    `${t("ROW_BROADCAST")}: ${dotted(model.broadcast)}`,
    `${t("ROW_TOTAL")}: ${formatCount(model.total)}`,
    `${t("ROW_USABLE")}: ${formatCount(model.usable)}`,
    `${t("ROW_FIRST")}: ${dotted(model.firstUsable)}`,
    `${t("ROW_LAST")}: ${dotted(model.lastUsable)}`,
    `${t("ROW_PREFIX")}: /${model.prefix}`,
    `${t("ROW_CLASS")}: ${model.historicalClass}`,
    `${t("ROW_CLASSIFICATION")}: ${t(`CLASS_${model.classification}`)}`,
  ];
  if (model.usableRule === "rfc3021") lines.push(t("NOTE_RFC3021"));
  if (model.usableRule === "host") lines.push(t("NOTE_HOST"));
  const clipboard = navigator.clipboard;
  if (!clipboard || typeof clipboard.writeText !== "function") {
    copyStatus.textContent = t("COPY_FAILED");
    return;
  }
  clipboard.writeText(lines.join("\n")).then(
    () => { copyStatus.textContent = t("COPIED"); },
    () => { copyStatus.textContent = t("COPY_FAILED"); },
  );
});

// Initial state (SPEC section 3): prefix 24 prefilled as an editable
// starting value, netmask in sync, a hint instead of any result.
prefixInput.value = "24";
syncFromPrefix();
recompute();
