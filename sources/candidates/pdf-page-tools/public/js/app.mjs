// Controller for the PDF Page Tools.
//
// File bytes live only in page memory: nothing is stored, sent, logged
// or placed in the URL or the title. File names are rendered as text
// nodes only, so a hostile file name cannot inject markup. Downloads
// are Blobs with revoked object URLs, one per generated output.

import {
  checkFileSize,
  hasPdfHeader,
  planExtract,
  planMerge,
  planRotate,
  planSplit,
  validateInspectedFile,
} from "./core/pdftools.mjs";
import * as realEngine from "./core/engine.mjs";
import { errorMessage, translate } from "./i18n.mjs";

export function createApp(doc, env = {}) {
  const lang = doc.documentElement?.lang === "en" ? "en" : "zh-Hant";
  const t = (code, params) => translate(lang, code, params);
  const $ = (id) => doc.querySelector(`#${id}`);
  const engine = env.engine ?? realEngine;
  const yieldNow = env.yieldNow ?? (() => new Promise((resolve) => setTimeout(resolve, 0)));
  const now = env.now ?? (() => performance.now());
  const scheduleRevoke = env.setTimeout ?? globalThis.setTimeout.bind(globalThis);

  const els = {
    fileInput: $("file-input"),
    dropZone: $("drop-zone"),
    fileList: $("file-list"),
    fileErrors: $("file-errors"),
    controlsMerge: $("controls-merge"),
    rangeBlock: $("range-block"),
    rangeInput: $("range-input"),
    rangeError: $("range-error"),
    splitOptions: $("split-options"),
    splitCombined: $("split-combined"),
    splitPergroup: $("split-pergroup"),
    rotateOptions: $("rotate-options"),
    angleSelect: $("angle-select"),
    plan: $("plan"),
    generate: $("generate-button"),
    progress: $("progress-note"),
    downloads: $("download-list"),
    startOver: $("start-over"),
    statusNote: $("status-note"),
    announce: $("announce"),
  };
  const tabs = {
    merge: $("tab-merge"),
    split: $("tab-split"),
    extract: $("tab-extract"),
    rotate: $("tab-rotate"),
  };

  const state = { mode: "merge", files: [] };
  let fileSeq = 0;
  let dragId = null;

  function codedError(code) {
    const error = new Error(code);
    error.code = code;
    return error;
  }

  function formatSize(bytes) {
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${bytes} B`;
  }

  function validFiles() {
    return state.files.filter((file) => file.status === "ok");
  }

  async function addFiles(fileListLike) {
    for (const file of [...fileListLike]) {
      const entry = {
        id: (fileSeq += 1),
        name: String(file?.name ?? ""),
        size: 0,
        status: "error",
        errorCode: "CORRUPT",
        bytes: null,
        pageCount: 0,
        rotations: [],
      };
      try {
        if (typeof file?.size === "number" && file.size > 0) checkFileSize(file.size);
        const bytes = new Uint8Array(await file.arrayBuffer());
        entry.size = bytes.length;
        checkFileSize(bytes.length);
        if (!hasPdfHeader(bytes)) throw codedError("NOT_PDF");
        const facts = await engine.inspectPdf(bytes);
        const valid = validateInspectedFile(facts);
        entry.status = "ok";
        entry.errorCode = null;
        entry.bytes = bytes;
        entry.pageCount = valid.pageCount;
        entry.rotations = valid.rotations;
      } catch (error) {
        entry.errorCode = typeof error?.code === "string" ? error.code : "CORRUPT";
        entry.bytes = null;
      }
      state.files.push(entry);
    }
    render();
  }

  function removeFile(id) {
    state.files = state.files.filter((file) => file.id !== id);
    render();
  }

  function moveFile(id, direction) {
    const valid = validFiles();
    const position = valid.findIndex((file) => file.id === id);
    const swapWith = position + direction;
    if (position < 0 || swapWith < 0 || swapWith >= valid.length) return;
    const a = state.files.indexOf(valid[position]);
    const b = state.files.indexOf(valid[swapWith]);
    [state.files[a], state.files[b]] = [state.files[b], state.files[a]];
    render();
  }

  function computePlan() {
    const mode = state.mode;
    if (mode === "merge") {
      const files = validFiles();
      if (files.length < 2) return { plan: null, hint: t("PLAN_NEED_FILES", { count: 2 }) };
      const plan = planMerge(files);
      return {
        plan,
        summary: t("PLAN_MERGE", { files: files.length, pages: plan.totalPages, name: plan.outputName }),
        outputs: [{ outputName: plan.outputName, kind: "merge" }],
      };
    }
    const file = validFiles()[0];
    if (!file) return { plan: null, hint: t("PLAN_NEED_FILES", { count: 1 }) };
    const expression = els.rangeInput.value;
    if (mode === "split") {
      const plan = planSplit(file, expression, Boolean(els.splitPergroup.checked));
      return {
        plan,
        summary: els.splitPergroup.checked
          ? t("PLAN_SPLIT_PER_GROUP", { groups: plan.groups.length, pages: plan.totalPages, count: plan.outputs.length })
          : t("PLAN_SPLIT_COMBINED", { groups: plan.groups.length, pages: plan.totalPages, name: plan.outputs[0].outputName }),
        outputs: plan.outputs.map((output) => ({ ...output, kind: "extract" })),
      };
    }
    if (mode === "extract") {
      const plan = planExtract(file, expression);
      return {
        plan,
        summary: t("PLAN_EXTRACT", { order: plan.pages.join(", "), name: plan.outputs[0].outputName }),
        outputs: plan.outputs.map((output) => ({ ...output, kind: "extract" })),
      };
    }
    const angle = Number(els.angleSelect.value);
    const plan = planRotate(file, expression, angle);
    return {
      plan,
      summary: t("PLAN_ROTATE", {
        count: plan.totalPages,
        page: plan.sample.page,
        from: plan.sample.from,
        to: plan.sample.to,
        name: plan.outputs[0].outputName,
      }),
      outputs: [{ outputName: plan.outputs[0].outputName, kind: "rotate", pages: plan.pages, angle }],
    };
  }

  function rowFor(file) {
    const row = doc.createElement("li");
    row.setAttribute("class", "file-row");
    row.setAttribute("draggable", "true");
    const name = doc.createElement("span");
    name.setAttribute("class", "file-name");
    name.textContent = file.name;
    const meta = doc.createElement("span");
    meta.setAttribute("class", "file-meta");
    meta.textContent = t("FILE_META", { pages: file.pageCount, size: formatSize(file.size) });
    row.appendChild(name);
    row.appendChild(meta);
    const up = doc.createElement("button");
    up.setAttribute("type", "button");
    up.textContent = t("MOVE_UP");
    up.addEventListener("click", () => moveFile(file.id, -1));
    const down = doc.createElement("button");
    down.setAttribute("type", "button");
    down.textContent = t("MOVE_DOWN");
    down.addEventListener("click", () => moveFile(file.id, 1));
    const remove = doc.createElement("button");
    remove.setAttribute("type", "button");
    remove.textContent = t("REMOVE");
    remove.addEventListener("click", () => removeFile(file.id));
    row.appendChild(up);
    row.appendChild(down);
    row.appendChild(remove);
    row.addEventListener("dragstart", () => {
      dragId = file.id;
    });
    row.addEventListener("dragover", (event) => {
      if (typeof event?.preventDefault === "function") event.preventDefault();
    });
    row.addEventListener("drop", (event) => {
      if (typeof event?.preventDefault === "function") event.preventDefault();
      if (dragId === null || dragId === file.id) return;
      const from = state.files.findIndex((entry) => entry.id === dragId);
      const to = state.files.findIndex((entry) => entry.id === file.id);
      if (from < 0 || to < 0) return;
      const [moved] = state.files.splice(from, 1);
      state.files.splice(to, 0, moved);
      dragId = null;
      render();
    });
    return row;
  }

  function renderFiles() {
    els.fileList.textContent = "";
    els.fileErrors.textContent = "";
    for (const file of state.files) {
      if (file.status === "ok") {
        els.fileList.appendChild(rowFor(file));
      } else {
        const row = doc.createElement("li");
        row.setAttribute("class", "file-error-row");
        const label = doc.createElement("span");
        label.textContent = `${file.name} — ${errorMessage(lang, { code: file.errorCode })}`;
        const remove = doc.createElement("button");
        remove.setAttribute("type", "button");
        remove.textContent = t("REMOVE");
        remove.addEventListener("click", () => removeFile(file.id));
        row.appendChild(label);
        row.appendChild(remove);
        els.fileErrors.appendChild(row);
      }
    }
  }

  function render() {
    for (const [mode, tab] of Object.entries(tabs)) {
      tab.setAttribute("aria-selected", mode === state.mode ? "true" : "false");
    }
    els.controlsMerge.hidden = state.mode !== "merge";
    els.rangeBlock.hidden = state.mode === "merge";
    els.splitOptions.hidden = state.mode !== "split";
    els.rotateOptions.hidden = state.mode !== "rotate";
    renderFiles();
    els.rangeError.textContent = "";
    try {
      const outcome = computePlan();
      els.plan.textContent = outcome.summary ?? outcome.hint ?? "";
      els.generate.disabled = !outcome.plan;
      return outcome;
    } catch (error) {
      if (typeof error?.code === "string" && error.code.startsWith("RANGE")) {
        els.rangeError.textContent = errorMessage(lang, error);
      } else {
        els.plan.textContent = errorMessage(lang, error);
      }
      els.generate.disabled = true;
      return { plan: null };
    }
  }

  function defaultDownload(name, bytes) {
    const blob = new Blob([bytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const anchor = doc.createElement("a");
    anchor.setAttribute("href", url);
    anchor.setAttribute("download", name);
    if (doc.body && typeof doc.body.appendChild === "function") doc.body.appendChild(anchor);
    anchor.click();
    if (typeof anchor.remove === "function") anchor.remove();
    scheduleRevoke(() => URL.revokeObjectURL(url), 1000);
  }
  const download = env.download ?? defaultDownload;

  async function generate() {
    const outcome = render();
    if (!outcome.plan) return;
    const started = now();
    const outputs = outcome.outputs;
    let done = 0;
    try {
      for (const output of outputs) {
        els.progress.textContent = t("PROGRESS", { done, total: outputs.length });
        await yieldNow();
        let bytes;
        if (output.kind === "merge") {
          bytes = await engine.mergePdfs(validFiles().map((file) => file.bytes));
        } else if (output.kind === "extract") {
          bytes = await engine.extractPages(validFiles()[0].bytes, output.pages);
        } else {
          bytes = await engine.rotatePages(validFiles()[0].bytes, output.pages, output.angle);
        }
        download(output.outputName, bytes);
        const item = doc.createElement("li");
        item.textContent = output.outputName;
        els.downloads.appendChild(item);
        done += 1;
      }
      els.progress.textContent = t("PROGRESS", { done, total: outputs.length });
      const message = t("GENERATED", { count: done, ms: Math.max(0, Math.round(now() - started)) });
      els.statusNote.textContent = message;
      els.announce.textContent = message;
    } catch (error) {
      els.statusNote.textContent = t("GENERATE_FAILED", { message: errorMessage(lang, error) });
    }
  }

  for (const [mode, tab] of Object.entries(tabs)) {
    tab.addEventListener("click", () => {
      state.mode = mode;
      render();
    });
  }
  els.fileInput.addEventListener("change", async () => {
    const files = els.fileInput.files ?? [];
    els.fileInput.value = "";
    await addFiles(files);
  });
  els.dropZone.addEventListener("dragover", (event) => {
    if (typeof event?.preventDefault === "function") event.preventDefault();
  });
  els.dropZone.addEventListener("drop", async (event) => {
    if (typeof event?.preventDefault === "function") event.preventDefault();
    await addFiles(event?.dataTransfer?.files ?? []);
  });
  els.rangeInput.addEventListener("input", render);
  els.splitCombined.addEventListener("change", render);
  els.splitPergroup.addEventListener("change", render);
  els.angleSelect.addEventListener("change", render);
  els.generate.addEventListener("click", generate);
  els.startOver.addEventListener("click", () => {
    state.files = [];
    els.rangeInput.value = "";
    els.downloads.textContent = "";
    els.progress.textContent = "";
    els.statusNote.textContent = t("CLEARED");
    els.announce.textContent = t("CLEARED");
    render();
  });

  render();

  return { addFiles, generate, render, state };
}

const isBrowser = typeof document !== "undefined" && typeof window !== "undefined";
if (isBrowser) {
  createApp(document);
}
