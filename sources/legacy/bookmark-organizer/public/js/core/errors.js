export const PROFILE = 'netscape-bookmark-html-profile-v1';
export const ERROR_CODES = Object.freeze(['INPUT_TOO_LARGE', 'INVALID_ENCODING', 'UNSUPPORTED_MARKUP', 'UNSUPPORTED_ATTRIBUTE', 'INVALID_ENTITY', 'INVALID_STRUCTURE', 'DEPTH_LIMIT', 'TOO_MANY_BOOKMARKS', 'INVALID_URL', 'UNSAFE_URL', 'CANCELED']);
export class BookmarkError extends Error {
  constructor(code, offset = 0) {
    super(code);
    this.code = code;
    this.offset = offset;
  }
}
export function fail(code, offset = 0) { throw new BookmarkError(code, offset); }
export function errorResult(jobId, error) {
  const code = ERROR_CODES.includes(error?.code) ? error.code : 'INVALID_STRUCTURE';
  return { schemaVersion: 1, jobId, status: 'error', error: { code, offset: Number.isSafeInteger(error?.offset) ? error.offset : 0, messageKey: code }, bookmarks: [], duplicateGroups: [], exportHtml: null, backupJson: null };
}
