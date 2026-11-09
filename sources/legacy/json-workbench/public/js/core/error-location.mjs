const POSITIONAL_ERROR_CODES = new Set(['INVALID_JSON','INVALID_UNICODE','DUPLICATE_KEY']);

// An offset belongs only to the current error and the exact textarea value.
export function currentErrorOffset(session, currentSource = session?.source) {
  if (session?.status !== 'error' || typeof currentSource !== 'string' || currentSource !== session.source || !POSITIONAL_ERROR_CODES.has(session.error?.code)) return null;
  const offset = session.error.offset;
  return Number.isInteger(offset) && offset >= 0 && offset <= currentSource.length ? offset : null;
}
