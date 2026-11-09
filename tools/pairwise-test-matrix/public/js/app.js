// Page wiring for the Pairwise Test Matrix tool. All user text is placed
// via textContent/value only. The controller owns state and generations;
// the Worker executor owns the background Worker. Downloads are built
// only on an explicit click, from the current successful snapshot.

import { createController } from './controller.mjs';
import { createWorkerExecutor } from './worker-executor.mjs';
import { STRINGS, errorMessage } from './strings.mjs';

const EXAMPLE_DIMENSIONS = 'A:0|1\nB:0|1\nC:0|1'; // fixtures.json first core case
const REPORT_FILENAME = 'pairwise-test-matrix-report.json';
const PAGE_SIZE = 25;

const lang = document.documentElement.lang === 'en' ? 'en' : 'zh-Hant';
const S = STRINGS[lang];

const $ = (id) => document.getElementById(id);
const els = {
  work: $('work'),
  dimensions: $('dimensions'),
  dimensionsError: $('dimensions-error'),
  run: $('run'),
  loadExample: $('load-example'),
  cancel: $('cancel'),
  reset: $('reset'),
  status: $('status'),
  results: $('results'),
  summary: $('summary'),
  casesHead: $('cases-head'),
  casesBody: $('cases-body'),
  tableWrap: $('table-wrap'),
  pager: $('pager'),
  prevPage: $('prev-page'),
  nextPage: $('next-page'),
  pageLabel: $('page-label'),
  download: $('download'),
};

const controller = createController(createWorkerExecutor());
let page = 1;
let downloadUrl = null;

function revokeDownload() {
  if (downloadUrl) {
    URL.revokeObjectURL(downloadUrl);
    downloadUrl = null;
  }
}

function pageCount(total) {
  return Math.max(1, Math.ceil(total / PAGE_SIZE));
}

function renderCases(result) {
  const total = result.cases.length;
  const pages = pageCount(total);
  if (page > pages) page = pages;
  const start = (page - 1) * PAGE_SIZE;
  const rows = result.cases.slice(start, start + PAGE_SIZE);

  els.casesHead.replaceChildren();
  const headRow = document.createElement('tr');
  const thIndex = document.createElement('th');
  thIndex.textContent = '#';
  headRow.appendChild(thIndex);
  for (const name of result.dimensions) {
    const th = document.createElement('th');
    th.textContent = name;
    headRow.appendChild(th);
  }
  const thGain = document.createElement('th');
  thGain.textContent = S.gainCol;
  headRow.appendChild(thGain);
  els.casesHead.appendChild(headRow);

  els.casesBody.replaceChildren();
  rows.forEach((c, i) => {
    const tr = document.createElement('tr');
    const tdIndex = document.createElement('td');
    tdIndex.textContent = String(start + i + 1);
    tr.appendChild(tdIndex);
    for (const v of c.values) {
      const td = document.createElement('td');
      td.textContent = v;
      tr.appendChild(td);
    }
    const tdGain = document.createElement('td');
    tdGain.textContent = `+${c.gain}`;
    tr.appendChild(tdGain);
    els.casesBody.appendChild(tr);
  });

  if (total > PAGE_SIZE) {
    els.pager.hidden = false;
    els.pageLabel.textContent = S.pageLabel(page, pages);
    els.prevPage.disabled = page <= 1;
    els.nextPage.disabled = page >= pages;
  } else {
    els.pager.hidden = true;
  }
}

function render(s) {
  els.work.setAttribute('aria-busy', s.state === 'busy' ? 'true' : 'false');
  els.run.disabled = s.state === 'busy';
  els.cancel.hidden = s.state !== 'busy';

  if (s.state === 'empty' && s.exampleLoaded) {
    els.status.textContent = S.exampleLoaded;
  } else if (s.state === 'empty') {
    els.status.textContent = S.statusEmpty;
  } else if (s.state === 'dirty') {
    els.status.textContent = S.statusDirty;
  } else if (s.state === 'busy') {
    els.status.textContent = S.statusBusy;
  } else if (s.state === 'cancelled') {
    els.status.textContent = S.statusCancelled;
  } else if (s.state === 'success' && s.result) {
    els.status.textContent = S.summary(s.result.cases.length, s.result.pairCount, s.result.spaceSize);
  } else if (s.state === 'error' && s.error) {
    els.status.textContent = `${S.errorLabel}：${errorMessage(S, s.error)}`;
  }

  if (s.state === 'error' && s.error) {
    els.dimensionsError.hidden = false;
    els.dimensionsError.textContent = errorMessage(S, s.error);
    els.dimensions.setAttribute('aria-invalid', 'true');
    if (document.activeElement === els.run) els.dimensions.focus();
  } else {
    els.dimensionsError.hidden = true;
    els.dimensionsError.textContent = '';
    els.dimensions.removeAttribute('aria-invalid');
  }

  if (s.state === 'success' && s.result) {
    els.results.hidden = false;
    els.summary.textContent = S.summary(s.result.cases.length, s.result.pairCount, s.result.spaceSize);
    renderCases(s.result);
  } else {
    els.results.hidden = true;
    if (s.state !== 'success') revokeDownload();
  }
}

controller.onChange(render);

els.dimensions.addEventListener('input', () => {
  controller.setDraft(els.dimensions.value);
});

els.run.addEventListener('click', () => {
  page = 1;
  controller.run();
});

els.loadExample.addEventListener('click', () => {
  els.dimensions.value = EXAMPLE_DIMENSIONS;
  controller.loadExample(EXAMPLE_DIMENSIONS);
  els.dimensions.focus();
});

els.cancel.addEventListener('click', () => {
  controller.cancel();
});

els.reset.addEventListener('click', () => {
  page = 1;
  controller.reset();
  els.dimensions.value = '';
  els.dimensions.focus();
});

els.prevPage.addEventListener('click', () => {
  const s = controller.snapshot();
  if (s.result && page > 1) {
    page -= 1;
    renderCases(s.result);
  }
});

els.nextPage.addEventListener('click', () => {
  const s = controller.snapshot();
  if (s.result && page < pageCount(s.result.cases.length)) {
    page += 1;
    renderCases(s.result);
  }
});

els.download.addEventListener('click', () => {
  const rep = controller.report();
  if (!rep || !rep.ok) {
    els.status.textContent = rep
      ? `${S.errorLabel}：${errorMessage(S, rep.error)}`
      : S.statusEmpty;
    return;
  }
  revokeDownload();
  const blob = new Blob([rep.text], { type: 'application/json;charset=utf-8' });
  downloadUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = REPORT_FILENAME;
  a.click();
  window.setTimeout(revokeDownload, 30000);
});

// Returning from the back-forward cache resets the page (SPEC).
window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    page = 1;
    controller.reset();
    els.dimensions.value = '';
  }
});

// Leaving the page discards work references and any download URL.
window.addEventListener('pagehide', () => {
  revokeDownload();
  const s = controller.snapshot();
  if (s.state === 'busy') controller.cancel();
});

render(controller.snapshot());
