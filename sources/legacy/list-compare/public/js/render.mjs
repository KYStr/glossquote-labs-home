export function renderRows(document, container, items, section, wording) {
  const fragment = document.createDocumentFragment();
  for (const item of items) {
    const row = document.createElement('li');
    const text = document.createElement('span');
    text.className = 'item-text';
    text.textContent = item.text;
    const provenance = document.createElement('small');
    provenance.className = 'provenance';
    provenance.textContent = section === 'intersection'
      ? wording.sharedSource(item)
      : wording.source(item);
    row.append(text, provenance);
    fragment.append(row);
  }
  container.replaceChildren(fragment);
}
