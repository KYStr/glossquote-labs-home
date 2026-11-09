export const LIMITS = Object.freeze({
  count: 30, fileBytes: 8_388_608, totalBytes: 67_108_864,
  imagePixels: 16_000_000, edge: 8192, sheetPixels: 16_000_000,
  pngBytes: 67_108_864, textBytes: 131_072,
});

export class ImageInputError extends Error {
  constructor(code, details = {}) {
    super(code);
    this.name = 'ImageInputError';
    this.code = code;
    this.details = details;
  }
}

export function fail(code, details) { throw new ImageInputError(code, details); }

export function assertCurrent({ signal, generation, isCurrent = () => true } = {}) {
  if (signal?.aborted || !isCurrent(generation)) fail('CANCELLED');
}

export function clearCanvas(canvas) {
  if (canvas) { canvas.width = 0; canvas.height = 0; }
}
