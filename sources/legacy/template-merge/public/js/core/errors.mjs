export const LIMITS = Object.freeze({
  maxBytes: 1_048_576, maxRows: 1000, maxColumns: 30,
  maxCodeUnits: 32_768, maxCombinedBytes: 8_388_608,
});

// Error messages are fixed codes; details never include cell values or raw input.
export class ToolError extends Error {
  constructor(code, details = {}) {
    super(code);
    this.name = 'ToolError';
    this.code = code;
    this.details = details;
  }
}

export function abortIfNeeded(signal, isCurrent = () => true) {
  if (signal?.aborted || !isCurrent()) throw new ToolError('CANCELLED');
}
