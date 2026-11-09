import { tokenize } from './tokenizer.js';
import { decodeInput } from './utf8.js';
import { decodeEntities } from './entities.js';
import { validateHref } from './urls.js';
import { validatePath, groupBookmarks } from './organizer.js';
import { PROFILE, fail, errorResult } from './errors.js';
const ATTRS = { H3: ['ADD_DATE', 'LAST_MODIFIED', 'PERSONAL_TOOLBAR_FOLDER'], A: ['HREF', 'ADD_DATE', 'LAST_MODIFIED', 'ICON_URI', 'ICON', 'SHORTCUTURL', 'LAST_CHARSET'], META: ['HTTP-EQUIV', 'CONTENT'] };
export function parseText(source, { jobId = 'job-1', sourceName = '', sourceBytes = new TextEncoder().encode(source).byteLength, canceled = () => false } = {}) {
  const tokens = tokenize(source);
  let current = tokens.next().value;
  let previous = null;
  const bookmarks = [];
  const folders = [];
  const checkCanceled = () => { if (canceled()) fail('CANCELED', current.offset); };
  const take = () => { checkCanceled(); const value = current; if (value.kind !== 'text' || !/^[\t\n\r ]*$/.test(value.value)) previous = value; if (value.kind !== 'eof') current = tokens.next().value; return value; };
  const whitespace = () => { while (current.kind === 'text' && /^[\t\n\r ]*$/.test(current.value)) take(); };
  const at = (kind, name) => current.kind === kind && current.name === name;
  const attributes = token => {
    for (const name of Object.keys(token.attrs)) {
      if (!(ATTRS[token.name] ?? []).includes(name)) fail('UNSUPPORTED_ATTRIBUTE', token.attrs[name].offset);
      if (!['ICON', 'ICON_URI'].includes(name)) decodeEntities(token.attrs[name].value, token.attrs[name].offset);
    }
  };
  const expect = (kind, name) => {
    if (!at(kind, name)) fail('INVALID_STRUCTURE', current.offset);
    attributes(current);
    return take();
  };
  const textElement = name => {
    const token = expect('start', name);
    let value = '';
    while (current.kind === 'text') { const text = take(); value += decodeEntities(text.value, text.offset); }
    if (!at('end', name)) fail('INVALID_STRUCTURE', current.offset);
    take();
    return { token, value };
  };
  const separator = () => {
    whitespace();
    if (at('start', 'P')) {
      attributes(current);
      const last = previous;
      const p = take();
      whitespace();
      if (!((last?.name === 'DL' && ['start', 'end'].includes(last.kind)) || at('end', 'DL'))) fail('INVALID_STRUCTURE', p.offset);
    }
  };
  const list = path => {
    expect('start', 'DL');
    // Explicit stack of folder paths is bounded to twelve levels by validatePath.
    separator();
    while (!at('end', 'DL')) {
      whitespace();
      if (at('start', 'P')) { separator(); if (at('end', 'DL')) break; }
      expect('start', 'DT');
      whitespace();
      if (at('start', 'A')) {
        const { token, value } = textElement('A');
        if (!Object.hasOwn(token.attrs, 'HREF')) fail('UNSUPPORTED_ATTRIBUTE', token.offset);
        const attribute = token.attrs.HREF;
        const href = validateHref(decodeEntities(attribute.value, attribute.offset), attribute.offset);
        if (bookmarks.length >= 3000) fail('TOO_MANY_BOOKMARKS', token.offset);
        bookmarks.push({ sourceIndex: bookmarks.length, title: value, href, originalFolderPath: path.slice(), folderPath: path.slice(), included: true, duplicateGroupId: null, suggestedKeeper: false });
      } else if (at('start', 'H3')) {
        const { token, value } = textElement('H3');
        const folder = validatePath([...path, value], token.offset);
        folders.push(folder);
        whitespace();
        if (at('start', 'DL')) { list(folder); separator(); }
      } else fail('INVALID_STRUCTURE', current.offset);
      whitespace();
      if (at('end', 'DT')) take();
      whitespace();
      if (at('start', 'P')) separator();
      whitespace();
      if (!(at('start', 'DT') || at('end', 'DL'))) fail('INVALID_STRUCTURE', current.offset);
    }
    expect('end', 'DL');
  };
  whitespace();
  if (current.kind === 'doctype') { take(); whitespace(); }
  const wrappers = new Set();
  while (current.kind === 'start' && ['META', 'TITLE', 'H1'].includes(current.name)) {
    const name = current.name;
    if (wrappers.has(name)) fail('INVALID_STRUCTURE', current.offset);
    wrappers.add(name);
    if (name === 'META') {
      const token = expect('start', 'META');
      if (Object.keys(token.attrs).length !== 2 || !/^Content-Type$/i.test(token.attrs['HTTP-EQUIV']?.value ?? '') || !/^text\/html; charset=UTF-8$/i.test(token.attrs.CONTENT?.value ?? '')) fail('INVALID_ENCODING', token.offset);
    } else textElement(name);
    whitespace();
  }
  list([]);
  separator();
  whitespace();
  if (current.kind !== 'eof') fail('INVALID_STRUCTURE', current.offset);
  const duplicateGroups = groupBookmarks(bookmarks);
  return { schemaVersion: 1, jobId, sourceName, sourceBytes, parserProfile: PROFILE, status: 'ready', bookmarks, duplicateGroups, folders, exportHtml: null, backupJson: null };
}
export function parseInput(bytes, options = {}) {
  try {
    const source = decodeInput(bytes);
    options.onPhase?.('tokenizing');
    return parseText(source, { ...options, sourceBytes: bytes.byteLength });
  }
  catch (error) { return errorResult(options.jobId ?? 'job-1', error); }
}
