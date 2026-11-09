import { compareLists } from './core/compare.mjs';

export const RESULT_KEYS = Object.freeze(['aOnly', 'bOnly', 'intersection', 'merged']);
export const DEFAULT_REQUEST = Object.freeze({ aText: '', bText: '', trimItems: true, ignoreCase: false });

export function createListState({ writeClipboard, onChange = () => {} } = {}) {
  let revision = 0;
  let copyIdentity = 0;
  let request = { ...DEFAULT_REQUEST };
  let value = null;
  let error = null;
  let phase = 'idle';
  let copies = {};
  const snapshot = () => ({ revision, request: { ...request }, value, error, phase, copies: { ...copies } });
  const emit = () => onChange(snapshot());
  function invalidate() {
    revision += 1;
    copyIdentity += 1;
    value = null;
    error = null;
    phase = 'idle';
    copies = {};
  }
  return {
    snapshot,
    setInput(field, text) {
      if (!['aText', 'bText'].includes(field) || typeof text !== 'string') throw new TypeError('Invalid input field');
      request[field] = text;
      invalidate();
      emit();
    },
    setOption(field, checked) {
      if (!['trimItems', 'ignoreCase'].includes(field) || typeof checked !== 'boolean') throw new TypeError('Invalid option');
      request[field] = checked;
      invalidate();
      emit();
    },
    loadExample() {
      request = { ...DEFAULT_REQUEST, aText: 'Ada\nBo\n\nAda', bText: 'bo\nCy\nAda' };
      invalidate();
      emit();
    },
    clear() {
      request = { ...DEFAULT_REQUEST };
      invalidate();
      emit();
    },
    compare() {
      invalidate();
      const result = compareLists(request);
      if (result.ok) { value = result.value; phase = 'success'; }
      else { error = result.error; phase = 'error'; }
      emit();
      return result;
    },
    async copy(section) {
      if (!RESULT_KEYS.includes(section) || !value || value.results[section].length === 0) return false;
      const text = value.results[section].map(item => item.text).join('\n');
      const capturedRevision = revision;
      const identity = ++copyIdentity;
      copies = { [section]: { status: 'pending', text: '' } };
      emit();
      try {
        if (typeof writeClipboard !== 'function') throw new Error('Clipboard unavailable');
        await writeClipboard(text);
        if (capturedRevision !== revision || identity !== copyIdentity || !value) return false;
        copies = { [section]: { status: 'success', text: '' } };
      } catch {
        if (capturedRevision !== revision || identity !== copyIdentity || !value) return false;
        copies = { [section]: { status: 'fallback', text } };
      }
      emit();
      return true;
    }
  };
}
