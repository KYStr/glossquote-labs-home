// Browser wiring for Module Dependency Reduction.
// The worker bootstrap below is a FIXED string: the only value interpolated
// into it is the absolute URL of the shipped core module, derived from
// import.meta.url. User content never participates in code, and no eval,
// new Function, or dynamic import is used anywhere.
import { createController } from './core/controller.mjs';
import { serializeReport } from './core/graph.mjs';
import { pickStrings, format } from './strings.mjs';

const PAGE_SIZE = 25;
const DOWNLOAD_NAME = 'dependency-reduction-report.json';
const DOWNLOAD_REVOKE_MS = 30000;

// First fixture from docs/specs/dependency-reduction/fixtures.json
// (alternate-witness). Embedded as fixed content; the example is labelled
// as such and only runs when the user presses the audit button.
const EXAMPLE = {
  modules: 'D\nC\nB\nA',
  edges: 'A>D\nA>C\nC>D\nB>D\nA>B',
};

function workerSource(coreUrl) {
  return `import { run } from ${JSON.stringify(coreUrl)};\n`
    + 'self.onmessage = (event) => {\n'
    + '  const data = event.data;\n'
    + '  const outcome = run({ modules: data.modules, edges: data.edges });\n'
    + '  self.postMessage({ generation: data.generation, outcome });\n'
    + '};\n';
}

function createWorkerRunner() {
  let worker = null;
  let blobUrl = null;

  function terminate() {
    if (worker) {
      worker.terminate();
      worker = null;
    }
    if (blobUrl) {
      URL.revokeObjectURL(blobUrl);
      blobUrl = null;
    }
  }

  function runTask(input) {
    return new Promise((resolve) => {
      try {
        const coreUrl = new URL('./core/graph.mjs', import.meta.url).href;
        blobUrl = URL.createObjectURL(
          new Blob([workerSource(coreUrl)], { type: 'text/javascript' }),
        );
        worker = new Worker(blobUrl, { type: 'module' });
      } catch {
        resolve({ ok: false, error: { code: 'WORKER_ERROR', field: null, row: null } });
        return;
      }
      worker.onmessage = (event) => {
        const data = event.data;
        terminate();
        resolve(data.outcome);
      };
      worker.onerror = () => {
        terminate();
        resolve({ ok: false, error: { code: 'WORKER_ERROR', field: null, row: null } });
      };
      worker.postMessage({
        modules: input.modules,
        edges: input.edges,
        generation: input.generation,
      });
    });
  }

  return { runTask, terminate };
}

const lang = document.documentElement.lang === 'en' ? 'en' : 'zh-Hant';
const t = pickStrings(lang);

const modulesInput = document.getElementById('modules');
const edgesInput = document.getElementById('edges');
const auditButton = document.getElementById('audit');
const cancelButton = document.getElementById('cancel');
const exampleButton = document.getElementById('example');
const resetButton = document.getElementById('reset');
const downloadButton = document.getElementById('download');
const statusRegion = document.getElementById('status');
const errorRegion = document.getElementById('error');
const resultsRegion = document.getElementById('results');
const formRegion = document.getElementById('audit-form');

const workerRunner = createWorkerRunner();
let downloadUrl = null;
let downloadTimer = null;

function revokeDownload() {
  if (downloadTimer) {
    clearTimeout(downloadTimer);
    downloadTimer = null;
  }
  if (downloadUrl) {
    URL.revokeObjectURL(downloadUrl);
    downloadUrl = null;
  }
}

function el(tag, text) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  return node;
}

function errorMessage(error) {
  const key = `err${error.code}`;
  return Object.prototype.hasOwnProperty.call(t, key) ? t[key] : t.errINTERNAL;
}

function renderError(error) {
  errorRegion.replaceChildren();
  if (!error) {
    errorRegion.hidden = true;
    modulesInput.removeAttribute('aria-errormessage');
    edgesInput.removeAttribute('aria-errormessage');
    modulesInput.removeAttribute('aria-invalid');
    edgesInput.removeAttribute('aria-invalid');
    return;
  }
  errorRegion.hidden = false;
  const parts = [errorMessage(error)];
  if (error.field) {
    parts.push(t.errorField + '：' + (error.field === 'modules' ? t.errorModules : t.errorEdges));
  }
  if (error.row !== null && error.row !== undefined) {
    parts.push(format(t.errorRow, { row: error.row }));
  }
  errorRegion.appendChild(el('p', parts.join(' ')));
  const target = error.field === 'edges' ? edgesInput : modulesInput;
  if (error.field) {
    target.setAttribute('aria-invalid', 'true');
    target.setAttribute('aria-errormessage', 'error');
  }
}

function paginatedTable(container, title, headers, rows, renderRow) {
  container.replaceChildren();
  const heading = el('h3', title);
  container.appendChild(heading);
  if (rows.length === 0) return;
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  let page = 0;
  const tableWrap = el('div');
  tableWrap.className = 'table-scroll';
  const table = el('table');
  const thead = el('thead');
  const headRow = el('tr');
  for (const header of headers) headRow.appendChild(el('th', header));
  thead.appendChild(headRow);
  table.appendChild(thead);
  const tbody = el('tbody');
  table.appendChild(tbody);
  tableWrap.appendChild(table);
  container.appendChild(tableWrap);
  const pager = el('div');
  pager.className = 'pager';
  const prev = el('button', t.pagePrev);
  prev.type = 'button';
  const next = el('button', t.pageNext);
  next.type = 'button';
  const label = el('span');
  label.setAttribute('aria-live', 'polite');
  pager.append(prev, label, next);
  if (totalPages > 1) container.appendChild(pager);

  function renderPage() {
    tbody.replaceChildren();
    const start = page * PAGE_SIZE;
    for (const row of rows.slice(start, start + PAGE_SIZE)) {
      tbody.appendChild(renderRow(row));
    }
    label.textContent = format(t.pageOf, { page: page + 1, pages: totalPages });
    prev.disabled = page === 0;
    next.disabled = page >= totalPages - 1;
  }
  prev.addEventListener('click', () => {
    if (page > 0) {
      page -= 1;
      renderPage();
    }
  });
  next.addEventListener('click', () => {
    if (page < totalPages - 1) {
      page += 1;
      renderPage();
    }
  });
  renderPage();
}

function renderResults(result) {
  resultsRegion.replaceChildren();
  const summary = el('p');
  summary.className = 'summary';
  if (result.status === 'cycle') {
    summary.textContent = format(t.statusSuccessCycle, {});
    resultsRegion.appendChild(summary);
    const cycleBox = el('section');
    cycleBox.setAttribute('aria-label', t.cycleHeading);
    cycleBox.appendChild(el('p', t.cycleIntro));
    const rows = result.cycle.map((name, index) => ({ step: index + 1, name }));
    paginatedTable(
      cycleBox,
      t.cycleHeading,
      [t.colStep, t.colModule],
      rows,
      (row) => {
        const tr = el('tr');
        tr.appendChild(el('td', String(row.step)));
        tr.appendChild(el('td', row.name));
        return tr;
      },
    );
    resultsRegion.appendChild(cycleBox);
    return;
  }
  summary.textContent = format(t.statusSuccessAcyclic, {
    stages: result.stages.length,
    redundant: result.redundant.length,
  });
  resultsRegion.appendChild(summary);

  const stagesBox = el('section');
  stagesBox.setAttribute('aria-label', t.stagesHeading);
  stagesBox.appendChild(el('p', t.stagesIntro));
  paginatedTable(
    stagesBox,
    t.stagesHeading,
    [t.colStage, t.colModules],
    result.stages.map((members, index) => ({ stage: index + 1, members })),
    (row) => {
      const tr = el('tr');
      tr.appendChild(el('td', String(row.stage)));
      tr.appendChild(el('td', row.members.join(', ')));
      return tr;
    },
  );
  resultsRegion.appendChild(stagesBox);

  const redundantBox = el('section');
  redundantBox.setAttribute('aria-label', t.redundantHeading);
  redundantBox.appendChild(el('p', t.redundantIntro));
  if (result.redundant.length === 0) {
    redundantBox.appendChild(el('p', t.redundantNone));
  } else {
    paginatedTable(
      redundantBox,
      t.redundantHeading,
      [t.colFrom, t.colTo, t.colVia],
      result.redundant,
      (row) => {
        const tr = el('tr');
        tr.appendChild(el('td', row.from));
        tr.appendChild(el('td', row.to));
        tr.appendChild(el('td', row.via.join(' → ')));
        return tr;
      },
    );
  }
  resultsRegion.appendChild(redundantBox);
}

let lastState = 'empty';

function render(snapshot) {
  const { state, result, error } = snapshot;
  // Focus moves to the first error field only when a submission fails.
  const justFailed = state === 'error' && lastState !== 'error';
  lastState = state;
  formRegion.setAttribute('aria-busy', state === 'busy' ? 'true' : 'false');
  auditButton.disabled = state === 'busy';
  cancelButton.hidden = state !== 'busy';
  exampleButton.disabled = state === 'busy';
  resetButton.disabled = state === 'busy';

  if (state === 'busy') {
    statusRegion.textContent = t.statusBusy;
  } else if (state === 'dirty') {
    statusRegion.textContent = t.statusDirty;
  } else if (state === 'cancelled') {
    statusRegion.textContent = t.statusCancelled;
  } else if (state === 'success' && result) {
    statusRegion.textContent = result.status === 'cycle'
      ? t.statusSuccessCycle
      : format(t.statusSuccessAcyclic, {
        stages: result.stages.length,
        redundant: result.redundant.length,
      });
  } else if (state === 'error' && error) {
    statusRegion.textContent = error.code === 'WORKER_ERROR' || error.code === 'INTERNAL'
      ? t.statusWorkerError
      : t.statusError;
  } else {
    statusRegion.textContent = t.statusEmpty;
  }

  if (state === 'error') {
    renderError(error);
    if (justFailed && error && error.field) {
      const target = error.field === 'edges' ? edgesInput : modulesInput;
      target.focus();
    }
  } else {
    renderError(null);
  }

  if (state === 'success' && result) {
    renderResults(result);
    resultsRegion.hidden = false;
    const serialized = serializeReport(result);
    if (serialized.ok) {
      downloadButton.disabled = false;
      downloadButton.hidden = false;
      downloadButton.dataset.report = serialized.text;
    } else {
      downloadButton.disabled = true;
      downloadButton.hidden = false;
      const note = el('p', t.downloadDisabledNote);
      note.className = 'notice';
      resultsRegion.appendChild(note);
    }
  } else {
    resultsRegion.hidden = true;
    resultsRegion.replaceChildren();
    downloadButton.hidden = true;
    downloadButton.disabled = true;
    delete downloadButton.dataset.report;
    revokeDownload();
  }
}

const controller = createController(
  (input) => workerRunner.runTask(input),
  {
    onAbandon: () => workerRunner.terminate(),
    onChange: (snapshot) => render(snapshot),
  },
);

function readDraft() {
  return { modules: modulesInput.value, edges: edgesInput.value };
}

modulesInput.addEventListener('input', () => {
  controller.setDraft(readDraft());
});
edgesInput.addEventListener('input', () => {
  controller.setDraft(readDraft());
});

auditButton.addEventListener('click', () => {
  controller.run();
});

cancelButton.addEventListener('click', () => {
  controller.cancel();
});

exampleButton.addEventListener('click', () => {
  modulesInput.value = EXAMPLE.modules;
  edgesInput.value = EXAMPLE.edges;
  controller.setDraft({ ...EXAMPLE });
  statusRegion.textContent = t.exampleLoaded;
  modulesInput.focus();
});

resetButton.addEventListener('click', () => {
  modulesInput.value = '';
  edgesInput.value = '';
  controller.reset();
  modulesInput.focus();
});

downloadButton.addEventListener('click', () => {
  const text = downloadButton.dataset.report;
  if (!text) return;
  revokeDownload();
  const blob = new Blob([text], { type: 'application/json;charset=utf-8' });
  downloadUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = DOWNLOAD_NAME;
  document.body.appendChild(link);
  link.click();
  link.remove();
  downloadTimer = setTimeout(revokeDownload, DOWNLOAD_REVOKE_MS);
});

window.addEventListener('pagehide', () => {
  workerRunner.terminate();
  revokeDownload();
});

window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    modulesInput.value = '';
    edgesInput.value = '';
    controller.reset();
  }
});

render(controller.snapshot());
