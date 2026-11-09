import { exactRecord, validateMaskList, normalizeMask } from './geometry.mjs';

const sourceKeys = ['format', 'width', 'height', 'orientation', 'visualWidth', 'visualHeight', 'pixelCount'];
const stateKeys = ['phase', 'source', 'masks', 'selectedId', 'sourceRevision', 'maskRevision', 'jobId', 'output', 'error', 'notice'];
const phases = ['idle', 'checking-header', 'decoding', 'ready-no-mask', 'ready', 'generating', 'output-ready', 'recoverable-error', 'unsupported', 'disposed'];
export const ERROR_CODES = Object.freeze([
  'FILE_REQUIRED', 'FILE_EMPTY', 'FILE_TOO_LARGE', 'UNSUPPORTED_FORMAT', 'HEADER_TRUNCATED', 'HEADER_INVALID', 'HEADER_UNSAFE', 'ANIMATED_PNG',
  'DIMENSION_INVALID', 'DIMENSION_LIMIT', 'PIXEL_LIMIT', 'JPEG_MODE_UNSUPPORTED', 'EXIF_INVALID', 'ORIENTATION_UNSUPPORTED', 'DECODE_FAILED',
  'DECODE_DIMENSION_MISMATCH', 'RESOURCE_UNAVAILABLE', 'MASK_REQUIRED', 'MASK_LIMIT', 'MASK_INVALID', 'MASK_OUT_OF_BOUNDS', 'MASK_ZERO_AREA',
  'GENERATION_CANCELLED', 'ENCODE_FAILED', 'OUTPUT_INVALID', 'STALE_RESULT',
]);
export function initialState() {
  return { phase: 'idle', source: null, masks: [], selectedId: null, sourceRevision: 0, maskRevision: 0, jobId: 0, output: null, error: null, notice: null };
}
export function sourceMetadataValid(source) {
  return exactRecord(source, sourceKeys) && ['png', 'jpeg'].includes(source.format) &&
    [source.width, source.height, source.visualWidth, source.visualHeight].every(value => Number.isSafeInteger(value) && value >= 1 && value <= 8192) &&
    Number.isSafeInteger(source.orientation) && source.orientation >= 1 && source.orientation <= 8 &&
    source.pixelCount === source.width * source.height && source.pixelCount <= 16_000_000 &&
    source.visualWidth === (source.orientation >= 5 ? source.height : source.width) && source.visualHeight === (source.orientation >= 5 ? source.width : source.height);
}
export function jobToken(state) { return { jobId: state.jobId, sourceRevision: state.sourceRevision, maskRevision: state.maskRevision }; }
export function isCurrentJob(state, token) {
  return exactRecord(token, ['jobId', 'sourceRevision', 'maskRevision']) && state.phase !== 'disposed' &&
    token.jobId === state.jobId && token.sourceRevision === state.sourceRevision && token.maskRevision === state.maskRevision;
}
const readyPhase = state => state.source ? (state.masks.length ? 'ready' : 'ready-no-mask') : 'idle';
const outputKeys = ['width', 'height', 'mime', 'bytes'];
function validOutput(output, source) {
  return source && exactRecord(output, outputKeys) && output.width === source.visualWidth && output.height === source.visualHeight &&
    output.mime === 'image/png' && Number.isSafeInteger(output.bytes) && output.bytes > 0;
}
function validState(state) {
  if (!exactRecord(state, stateKeys) || !phases.includes(state.phase) ||
      ![state.sourceRevision, state.maskRevision, state.jobId].every(value => Number.isSafeInteger(value) && value >= 0 && value < Number.MAX_SAFE_INTEGER - 2) ||
      ![null, 'cancelled', 'cleared'].includes(state.notice) ||
      (state.error !== null && (!exactRecord(state.error, ['code', 'path']) || !ERROR_CODES.includes(state.error.code) || typeof state.error.path !== 'string'))) return false;
  if (state.source !== null && !sourceMetadataValid(state.source)) return false;
  if (!validateMaskList(state.masks, state.source?.visualWidth ?? 1, state.source?.visualHeight ?? 1).ok || (!state.source && state.masks.length)) return false;
  if (state.selectedId !== null && !state.masks.some(mask => mask.id === state.selectedId)) return false;
  if (state.output !== null) {
    if (!exactRecord(state.output, [...outputKeys, 'previewLoaded']) || typeof state.output.previewLoaded !== 'boolean') return false;
    const { previewLoaded, ...output } = state.output;
    if (!validOutput(output, state.source)) return false;
  }
  return true;
}
const actionKeys = {
  'select-start': [], 'header-passed': ['token'], 'select-success': ['token', 'source'], 'select-failure': ['token', 'code'],
  'add-mask': ['mask'], 'update-mask': ['mask'], 'delete-mask': ['id'], 'select-mask': ['id'], 'undo-mask': [], 'clear-masks': [],
  'invalidate-output': [], 'report-error': ['code', 'path'], 'generate-start': [], 'generate-success': ['token', 'output'],
  'generate-failure': ['token', 'code'], 'preview-loaded': ['token'], 'preview-failure': ['token'], 'cancel-generation': [],
  'clear-source': [], pagehide: [], pageshow: ['persisted'],
};
function invalidate(state) { return { ...state, jobId: state.jobId + 1, output: null, error: null, notice: null, phase: readyPhase(state) }; }
function withError(state, code, path = '') {
  return { ...state, error: { code: ERROR_CODES.includes(code) ? code : 'HEADER_UNSAFE', path }, notice: null, phase: state.source ? 'recoverable-error' : 'unsupported' };
}
function reset(state, phase = 'idle', notice = null) {
  return { ...initialState(), sourceRevision: state.sourceRevision + 1, maskRevision: state.maskRevision + 1, jobId: state.jobId + 1, phase, notice };
}

export function reduceEditorState(input, action) {
  try {
    if (!validState(input)) return withError(initialState(), 'HEADER_UNSAFE', 'state');
    const state = input;
    if (!action || !exactRecord(action, Reflect.ownKeys(action)) || !Object.hasOwn(actionKeys, action.type) ||
        !exactRecord(action, ['type', ...actionKeys[action.type]])) return withError(invalidate(state), 'HEADER_UNSAFE', 'action');
    if (state.phase === 'disposed' && !['pageshow', 'pagehide', 'clear-source'].includes(action.type)) return state;
    switch (action.type) {
      case 'select-start': return reset(state, 'checking-header');
      case 'header-passed': return isCurrentJob(state, action.token) && state.phase === 'checking-header' ? { ...state, phase: 'decoding' } : state;
      case 'select-success':
        if (!isCurrentJob(state, action.token) || state.phase !== 'decoding') return state;
        return sourceMetadataValid(action.source) ? { ...state, source: { ...action.source }, phase: 'ready-no-mask', error: null } : withError(state, 'HEADER_UNSAFE');
      case 'select-failure': return isCurrentJob(state, action.token) ? withError(state, action.code) : state;
      case 'invalidate-output': return invalidate(state);
      case 'report-error': return withError(invalidate(state), action.code, ['x', 'y', 'width', 'height', 'id', 'mask', 'masks', 'file', ''].includes(action.path) ? action.path : '');
      case 'select-mask': return state.masks.some(mask => mask.id === action.id) ? { ...state, selectedId: action.id, error: null } : state;
      case 'add-mask': case 'update-mask': case 'delete-mask': case 'undo-mask': case 'clear-masks': {
        const next = { ...invalidate(state), maskRevision: state.maskRevision + 1 };
        if (!state.source) return withError(next, 'MASK_REQUIRED');
        let masks = state.masks;
        if (action.type === 'add-mask' || action.type === 'update-mask') {
          if (action.type === 'add-mask') {
            const proposed = validateMaskList([...masks, action.mask], state.source.visualWidth, state.source.visualHeight);
            if (!proposed.ok) return withError(next, proposed.error.code, proposed.error.path);
          }
          const normalized = normalizeMask(action.mask, state.source.visualWidth, state.source.visualHeight);
          if (!normalized.ok) return withError(next, normalized.error.code, normalized.error.path);
          const index = masks.findIndex(mask => mask.id === normalized.mask.id);
          if (action.type === 'add-mask') masks = [...masks, normalized.mask];
          else if (index !== -1) masks = masks.map((mask, at) => at === index ? normalized.mask : mask);
          else return withError(next, 'MASK_INVALID', 'id');
        } else if (action.type === 'delete-mask') {
          if (typeof action.id !== 'string' || !masks.some(mask => mask.id === action.id)) return withError(next, 'MASK_INVALID', 'id');
          masks = masks.filter(mask => mask.id !== action.id);
        } else if (action.type === 'undo-mask') masks = masks.slice(0, -1);
        else masks = [];
        const checked = validateMaskList(masks, state.source.visualWidth, state.source.visualHeight);
        if (!checked.ok) return withError(next, checked.error.code, checked.error.path);
        const selectedId = ['add-mask', 'update-mask'].includes(action.type) ? action.mask.id : masks.some(mask => mask.id === state.selectedId) ? state.selectedId : masks.at(-1)?.id ?? null;
        return { ...next, masks: checked.masks, selectedId, phase: masks.length ? 'ready' : 'ready-no-mask' };
      }
      case 'generate-start': {
        const next = invalidate(state);
        if (!state.source) return withError(next, 'FILE_REQUIRED', 'file');
        const checked = validateMaskList(state.masks, state.source.visualWidth, state.source.visualHeight);
        if (!checked.ok) return withError(next, checked.error.code, checked.error.path);
        if (!checked.masks.length) return withError(next, 'MASK_REQUIRED', 'masks');
        return { ...next, phase: 'generating' };
      }
      case 'generate-success':
        if (!isCurrentJob(state, action.token) || state.phase !== 'generating') return state;
        return validOutput(action.output, state.source) ? { ...state, phase: 'output-ready', output: { ...action.output, previewLoaded: false }, error: null } : withError(invalidate(state), 'OUTPUT_INVALID');
      case 'generate-failure': return isCurrentJob(state, action.token) && state.phase === 'generating' ? withError(invalidate(state), action.code) : state;
      case 'preview-loaded': return isCurrentJob(state, action.token) && state.output ? { ...state, output: { ...state.output, previewLoaded: true } } : state;
      case 'preview-failure': return isCurrentJob(state, action.token) && state.output ? withError(invalidate(state), 'OUTPUT_INVALID') : state;
      case 'cancel-generation': return state.phase === 'generating' ? { ...invalidate(state), notice: 'cancelled' } : state;
      case 'clear-source': return reset(state, 'idle', 'cleared');
      case 'pagehide': return reset(state, 'disposed');
      case 'pageshow': return action.persisted === true ? reset(state) : state;
      default: return state;
    }
  } catch { return { ...initialState(), error: { code: 'HEADER_UNSAFE', path: 'action' }, phase: 'unsupported' }; }
}
