import { folderPaths } from './core/organizer.js';
export function element(document, tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}
export function pathLabel(path, text) { return path.length ? path.map(segment => JSON.stringify(segment)).join(' / ') : text.root; }
export function renderFolders(document, container, job, text, selectedPath, onSelect) {
  container.replaceChildren();
  const all = element(document, 'button', text.allFolders, 'folder-button');
  all.type = 'button';
  all.setAttribute('aria-pressed', selectedPath === null ? 'true' : 'false');
  all.addEventListener('click', () => onSelect(null));
  container.append(all);
  const counts = new Map();
  for (const bookmark of job.bookmarks) { const key = JSON.stringify(bookmark.folderPath); counts.set(key, (counts.get(key) ?? 0) + 1); }
  const root = { path: [], children: new Map() };
  for (const path of folderPaths(job)) {
    let node = root;
    for (let index = 0; index < path.length; index++) {
      let child = node.children.get(path[index]);
      if (!child) { child = { name: path[index], path: path.slice(0, index + 1), children: new Map() }; node.children.set(child.name, child); }
      node = child;
    }
  }
  const branch = node => {
    const list = element(document, 'ul');
    const row = element(document, 'li');
    const count = counts.get(JSON.stringify(node.path)) ?? 0;
    const button = element(document, 'button', `${node.name ?? text.root} (${count})`, 'folder-button');
    button.type = 'button';
    button.setAttribute('aria-label', pathLabel(node.path, text) + ` (${count})`);
    button.setAttribute('aria-pressed', JSON.stringify(selectedPath) === JSON.stringify(node.path) ? 'true' : 'false');
    button.addEventListener('click', () => onSelect(node.path));
    row.append(button);
    for (const child of node.children.values()) row.append(branch(child));
    list.append(row);
    return list;
  };
  container.append(branch(root));
}
export function fillPathSelect(document, select, job, text, rootAllowed = true) {
  select.replaceChildren();
  for (const path of folderPaths(job)) {
    if (!rootAllowed && !path.length) continue;
    const option = element(document, 'option', pathLabel(path, text));
    option.value = JSON.stringify(path);
    select.append(option);
  }
}
export function renderBookmarks(document, container, job, text, { query = '', mode = 'all', path = null, onInclude, onKeeper, onKeepOnly, onMove }) {
  container.replaceChildren();
  const normalized = query.toLocaleLowerCase();
  const groups = new Map(job.duplicateGroups.map(item => [item.groupId, item]));
  const shown = job.bookmarks.filter(item => {
    if (mode === 'duplicates' && groups.get(item.duplicateGroupId).memberSourceIndexes.length < 2) return false;
    if (mode === 'excluded' && item.included) return false;
    if (path !== null && !(path.length === 0 ? item.folderPath.length === 0 : path.every((segment, index) => item.folderPath[index] === segment))) return false;
    return !normalized || item.title.toLocaleLowerCase().includes(normalized) || item.href.toLocaleLowerCase().includes(normalized);
  });
  const visibleGroups = new Map();
  for (const bookmark of shown) {
    if (!visibleGroups.has(bookmark.duplicateGroupId)) visibleGroups.set(bookmark.duplicateGroupId, []);
    visibleGroups.get(bookmark.duplicateGroupId).push(bookmark);
  }
  for (const [groupId, members] of visibleGroups) {
    const group = groups.get(groupId);
    const duplicate = group.memberSourceIndexes.length > 1;
    const section = element(document, 'section', undefined, 'url-group');
    if (duplicate) {
      const header = element(document, 'div', undefined, 'group-heading');
      const heading = element(document, 'h3', `${text.duplicateGroup} · ${text.groupCount(group.memberSourceIndexes.length)}`);
      const action = element(document, 'button', text.keepSelected);
      action.type = 'button'; action.id = `keep-${groupId}`;
      action.addEventListener('click', () => onKeepOnly(groupId));
      header.append(heading, action);
      section.append(header, element(document, 'p', group.exactHref, 'url'));
    }
    for (const bookmark of members) {
      const row = element(document, 'article', undefined, 'bookmark-row');
      if (!bookmark.included) row.classList.add('excluded');
      const title = bookmark.title || text.titleEmpty;
      row.append(element(document, 'p', `${text.sourceIndex} ${bookmark.sourceIndex}`, 'source-index'), element(document, duplicate ? 'h4' : 'h3', title), element(document, 'p', bookmark.href, 'url'));
      const paths = element(document, 'div', undefined, 'paths');
      paths.append(element(document, 'p', `${text.original}: ${pathLabel(bookmark.originalFolderPath, text)}`), element(document, 'p', `${text.current}: ${pathLabel(bookmark.folderPath, text)}`));
      row.append(paths);
      const controls = element(document, 'div', undefined, 'row-controls');
      const includeLabel = element(document, 'label', undefined, 'check-label');
      const include = element(document, 'input');
      include.type = 'checkbox'; include.id = `include-${bookmark.sourceIndex}`; include.checked = bookmark.included;
      include.setAttribute('aria-label', `${text.include}: ${title} (${bookmark.sourceIndex})`);
      include.addEventListener('change', () => { const requested = include.checked; if (!requested) include.checked = true; onInclude(bookmark.sourceIndex, requested); });
      includeLabel.append(include, element(document, 'span', text.include)); controls.append(includeLabel);
      if (duplicate) {
        const keeperLabel = element(document, 'label', undefined, 'check-label');
        const keeper = element(document, 'input');
        keeper.type = 'radio'; keeper.name = `keeper-${groupId}`; keeper.id = `keeper-${bookmark.sourceIndex}`; keeper.checked = bookmark.suggestedKeeper;
        keeper.setAttribute('aria-label', `${text.suggested}: ${title} (${bookmark.sourceIndex})`);
        keeper.addEventListener('change', () => onKeeper(groupId, bookmark.sourceIndex));
        keeperLabel.append(keeper, element(document, 'span', text.suggested)); controls.append(keeperLabel);
      }
      const move = element(document, 'button', text.move);
      move.type = 'button'; move.id = `move-${bookmark.sourceIndex}`;
      move.setAttribute('aria-label', `${text.move}: ${title} (${bookmark.sourceIndex})`);
      move.addEventListener('click', () => onMove(bookmark.sourceIndex));
      controls.append(move); row.append(controls); section.append(row);
    }
    container.append(section);
  }
  if (!shown.length) container.append(element(document, 'p', job.bookmarks.length ? text.noMatches : text.emptyTree, 'empty-state'));
  return shown.length;
}
