import { visibleName, serializeJSON, serializeTXT } from './core/report.js';

export const COPY = Object.freeze({
  'zh-Hant': {
    choose: '選取檔案', add: '加入檔案', scan: '開始掃描', rescan: '重新掃描', scanning: '掃描中…', remove: '移除',
    noSelection: '尚未選取檔案。', selected: (count, bytes) => `已選 ${count} 個檔案，合計 ${bytes}。`,
    empty: '選取檔案後即可開始。', sourcesChanged: '來源清單已變更，舊分析與保留選擇已清除。請重新掃描。',
    canceled: '已取消掃描，未產生部分報告。可修改來源或重新掃描。', validating: '正在檢查檔案數量與大小…',
    hashing: (completed, total) => `正在計算 SHA-256：${completed} / ${total} 個檔案。`,
    verifying: total => `${total} / ${total} 個檔案已完成雜湊，正在逐 byte 確認候選內容；完成前不提供報告。`,
    ready: '✓ 內容比對完成。請確認各組保留項目，再下載清單。', keeperChanged: '✓ 保留項目已更新；清單預覽與後續下載會採用目前選擇。',
    selectedFiles: '已選檔案', unique: '不同內容', duplicateGroups: '重複群組', duplicates: '重複副本', savings: '預估可節省',
    group: number => `群組 ${number}`, duplicate: '完全相同', singleton: '唯一內容', keep: '✓ 保留', duplicateCopy: '重複副本',
    source: index => `來源 #${index}`, groupSize: (count, bytes) => `${count} 個來源，每份 ${bytes}`, hash: '檢視 SHA-256',
    singleKeep: '✓ 保留（唯一來源）', keeperFor: (index, name) => `保留來源 #${index}：${name}`,
    unsupported: '此瀏覽器缺少本機分析需要的 File、Worker 或 Web Crypto。請使用支援這些功能的新版瀏覽器；未讀取任何檔案。',
    downloadRequested: '已將本機報告交給瀏覽器下載。請確認下載清單；工具無法驗證是否已存入磁碟。',
    downloadFailed: '無法建立或開始下載報告。來源檔未變更；請再試一次，或重新掃描。',
    errors: {
      NO_FILES: '請先選取至少一個檔案，再開始掃描。',
      TOO_MANY_FILES: '超過 200 個檔案，這批選取已清除。請重新選取 200 個以內的檔案；未讀取內容。',
      FILE_TOO_LARGE: '有檔案超過單檔 32 MiB。請移除下列來源後重試；未讀取內容。',
      TOTAL_SIZE_LIMIT: '合計超過 128 MiB。請移除部分來源後重試；未讀取內容。',
      READ_FAILED: '無法讀取檔案或啟動本機分析。來源未變更；請重新選檔，並使用支援 Worker 與 Web Crypto 的新版瀏覽器。',
      DIGEST_FAILED: '無法完成 SHA-256 計算，未產生部分報告。請重新選檔再試，或更新瀏覽器。',
      VERIFY_FAILED: '無法完成逐 byte 驗證，未產生部分報告。請重新選取來源再試。',
      CANCELED: '已取消掃描，未產生部分報告。可重新掃描。'
    }, affected: indexes => `來源序號：${indexes}。`
  },
  en: {
    choose: 'Choose files', add: 'Add files', scan: 'Start scan', rescan: 'Scan again', scanning: 'Scanning…', remove: 'Remove',
    noSelection: 'No files selected.', selected: (count, bytes) => `${count} ${count === '1' ? 'file' : 'files'} selected, ${bytes} total.`,
    empty: 'Choose files to get started.', sourcesChanged: 'Sources changed. The old analysis and keeper choices were cleared. Scan again.',
    canceled: 'Scan canceled. No partial report was created. Edit the sources or scan again.', validating: 'Checking file count and sizes…',
    hashing: (completed, total) => `Calculating SHA-256: ${completed} / ${total} ${total === '1' ? 'file' : 'files'}.`,
    verifying: total => `${total} / ${total} ${total === '1' ? 'file' : 'files'} hashed. Verifying candidate bytes; reports stay unavailable until this finishes.`,
    ready: '✓ Content comparison finished. Check the keeper in each group, then download a list.', keeperChanged: '✓ Keeper updated. The preview and future downloads use your current choices.',
    selectedFiles: 'Selected files', unique: 'Unique contents', duplicateGroups: 'Duplicate groups', duplicates: 'Duplicate copies', savings: 'Potential savings',
    group: number => `Group ${number}`, duplicate: 'Byte-identical', singleton: 'Unique content', keep: '✓ Keep', duplicateCopy: 'Duplicate copy',
    source: index => `Source #${index}`, groupSize: (count, bytes) => `${count} ${count === '1' ? 'source' : 'sources'}, ${bytes} each`, hash: 'View SHA-256',
    singleKeep: '✓ Keep (only source)', keeperFor: (index, name) => `Keep source #${index}: ${name}`,
    unsupported: 'This browser lacks File, Worker or Web Crypto support needed for local analysis. Use a current browser that supports them. No files have been read.',
    downloadRequested: 'The local report was handed to your browser for download. Check your downloads; this tool cannot verify a disk save.',
    downloadFailed: 'The report could not be created or downloaded. Source files are unchanged. Try again or scan again.',
    errors: {
      NO_FILES: 'Choose at least one file before starting the scan.',
      TOO_MANY_FILES: 'More than 200 files were selected. This selection was cleared. Choose up to 200 files; no contents were read.',
      FILE_TOO_LARGE: 'A file exceeds the 32 MiB per-file limit. Remove the sources below and retry; no contents were read.',
      TOTAL_SIZE_LIMIT: 'The total exceeds 128 MiB. Remove some sources and retry; no contents were read.',
      READ_FAILED: 'A file could not be read or local analysis could not start. Sources are unchanged. Select them again in a current browser with Worker and Web Crypto support.',
      DIGEST_FAILED: 'SHA-256 calculation failed. No partial report was created. Select the files again or update your browser.',
      VERIFY_FAILED: 'Byte verification failed. No partial report was created. Select the sources again and retry.',
      CANCELED: 'Scan canceled. No partial report was created. You can scan again.'
    }, affected: indexes => `Source indexes: ${indexes}.`
  }
});

export const formatNumber = (value, language) => new Intl.NumberFormat(language).format(value);
export function formatBytes(bytes, language) {
  const exact = formatNumber(bytes, language);
  if (bytes < 1024) return `${exact} bytes`;
  const unit = bytes < 1048576 ? 'KiB' : 'MiB', divisor = unit === 'KiB' ? 1024 : 1048576;
  const readable = new Intl.NumberFormat(language, { maximumFractionDigits: 2 }).format(bytes / divisor);
  return `${readable} ${unit} (${exact} bytes)`;
}
export function formatError(error, language) {
  const copy = COPY[language];
  return (copy.errors[error.code] ?? copy.errors.READ_FAILED) + (error.fileIndexes.length ? ` ${copy.affected(error.fileIndexes.map(index => formatNumber(index, language)).join(', '))}` : '');
}

export function groupModels(result) {
  return result.groups.map(group => ({ ...group, canChoose: group.memberSourceIndexes.length > 1,
    members: group.memberSourceIndexes.map(index => {
      const file = result.files[index];
      return { sourceIndex: index, visibleName: visibleName(file.name), isKeeper: index === group.keeperSourceIndex };
    }) }));
}

// Report syntax retains line/tab separators. Names already have JSON escapes;
// additionally reveal bidi and C1 controls in the visual preview only.
export const visibleReport = text => text.replace(/[\u007f-\u009f\u061c\u200e\u200f\u202a-\u202e\u2066-\u206f]/g, visibleName);

export function createUI(document, language, session) {
  const copy = COPY[language], get = id => document.getElementById(id);
  const make = (tag, text, className) => {
    const element = document.createElement(tag);
    if (text !== undefined) element.textContent = text;
    if (className) element.className = className;
    return element;
  };
  let lastFiles = null, lastResult = null, renderedJob = null, supported = true;
  const memberElements = new Map();
  function renderSources(files) {
    const list = get('source-list'); list.replaceChildren();
    for (const file of files) {
      const row = make('li', undefined, 'source-row'), info = make('div', undefined, 'source-info');
      info.append(make('span', `#${formatNumber(file.sourceIndex, language)}`, 'data'), make('bdi', visibleName(file.name), 'filename'), make('span', formatBytes(file.sizeBytes, language), 'size'));
      const button = make('button', copy.remove, 'quiet'); button.type = 'button';
      button.setAttribute('aria-label', `${copy.remove} ${copy.source(file.sourceIndex)}: ${visibleName(file.name)}`);
      button.addEventListener('click', () => session.removeFile(file.sourceIndex));
      row.append(info, button); list.append(row);
    }
    get('selection-count').textContent = `${formatNumber(files.length, language)} / 200`;
    get('selection-summary').textContent = files.length ? copy.selected(formatNumber(files.length, language), formatBytes(files.reduce((total, item) => total + item.sizeBytes, 0), language)) : copy.noSelection;
    get('empty-sources').hidden = files.length > 0;
  }
  function renderGroups(result) {
    const models = groupModels(result);
    if (renderedJob !== result.jobId) {
      const container = get('groups'); container.replaceChildren(); memberElements.clear();
      models.forEach((group, index) => {
        const fieldset = make('fieldset', undefined, 'content-group');
        fieldset.append(make('legend', `${copy.group(formatNumber(index + 1, language))} · ${group.canChoose ? copy.duplicate : copy.singleton}`));
        fieldset.append(make('p', copy.groupSize(formatNumber(group.members.length, language), formatBytes(group.sizeBytes, language)), 'group-meta'));
        for (const member of group.members) {
          const row = make(group.canChoose ? 'label' : 'div', undefined, 'member-row');
          let input;
          if (group.canChoose) {
            input = make('input'); input.type = 'radio'; input.name = `keeper-${group.groupId}`; input.value = String(member.sourceIndex);
            input.setAttribute('aria-label', copy.keeperFor(member.sourceIndex, member.visibleName));
            input.addEventListener('change', () => { if (input.checked) session.selectKeeper(group.groupId, member.sourceIndex); });
            row.append(input);
          }
          const content = make('span', undefined, 'member-copy');
          const status = make('span', '', 'member-status');
          content.append(make('span', `#${formatNumber(member.sourceIndex, language)}`, 'data'), make('bdi', member.visibleName, 'filename'), status);
          row.append(content); fieldset.append(row); memberElements.set(member.sourceIndex, { row, input, status, canChoose: group.canChoose });
        }
        const details = make('details'), summary = make('summary', copy.hash);
        details.append(summary, make('p', group.sha256, 'hash')); fieldset.append(details); container.append(fieldset);
      });
      renderedJob = result.jobId;
    }
    for (const group of models) for (const member of group.members) {
      const rendered = memberElements.get(member.sourceIndex);
      rendered.row.classList.toggle('is-keeper', member.isKeeper);
      if (rendered.input) rendered.input.checked = member.isKeeper;
      rendered.status.textContent = group.canChoose ? (member.isKeeper ? copy.keep : copy.duplicateCopy) : copy.singleKeep;
    }
    const summary = get('summary'); summary.replaceChildren();
    for (const [label, value] of [
      [copy.selectedFiles, result.summary.selectedFileCount], [copy.unique, result.summary.uniqueContentCount],
      [copy.duplicateGroups, result.groups.filter(group => group.memberSourceIndexes.length > 1).length],
      [copy.duplicates, result.summary.duplicateFileCount], [copy.savings, formatBytes(result.summary.savedBytes, language)]
    ]) { const pair = make('div'); pair.append(make('dt', label), make('dd', typeof value === 'number' ? formatNumber(value, language) : value)); summary.append(pair); }
    get('no-duplicates').hidden = result.summary.duplicateFileCount !== 0;
  }
  function renderPreview(result) {
    if (result?.status === 'ready' && get('report-preview').open) {
      get('json-preview').textContent = visibleReport(serializeJSON(result)); get('txt-preview').textContent = visibleReport(serializeTXT(result));
    } else { get('json-preview').textContent = ''; get('txt-preview').textContent = ''; }
  }
  return {
    setSupported(value) { supported = value; get('capability-error').hidden = value; get('capability-error').textContent = value ? '' : copy.unsupported; get('files').disabled = !value; },
    announce(message) { get('feedback').textContent = message; },
    renderPreview,
    render(snapshot) {
      const { state, files, result, error, progress, notice } = snapshot;
      const busy = ['validating', 'hashing', 'verifying', 'cancelling'].includes(state);
      if (files !== lastFiles) { renderSources(files); lastFiles = files; }
      get('scan').disabled = busy || !files.length || !supported;
      get('scan').textContent = busy ? copy.scanning : result ? copy.rescan : copy.scan;
      get('scan').classList.toggle('primary', !busy && files.length > 0 && !result);
      get('file-label').classList.toggle('primary', files.length === 0 && supported);
      get('choose-label').textContent = files.length ? copy.add : copy.choose;
      get('reset').disabled = !files.length && !error;
      get('progress-panel').hidden = !busy;
      get('scan-progress').max = progress?.totalFiles || 1; get('scan-progress').value = progress?.completedFiles || 0;
      get('error').hidden = !error; get('error').textContent = error ? `! ${formatError(error, language)}` : '';
      let feedback = copy[notice] ?? copy.empty;
      if (state === 'validating') feedback = copy.validating;
      if (state === 'hashing') feedback = copy.hashing(formatNumber(progress?.completedFiles ?? 0, language), formatNumber(progress?.totalFiles ?? files.length, language));
      if (state === 'verifying') feedback = copy.verifying(formatNumber(files.length, language));
      if (error) feedback = '';
      get('feedback').textContent = typeof feedback === 'string' ? feedback : '';
      get('results').hidden = !result;
      get('download-json').disabled = !result; get('download-txt').disabled = !result;
      if (result !== lastResult) {
        if (result) renderGroups(result);
        else {
          get('groups').replaceChildren(); get('summary').replaceChildren(); memberElements.clear(); renderedJob = null;
          get('report-preview').open = false;
        }
        renderPreview(result); lastResult = result;
      }
    }
  };
}
