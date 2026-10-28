import { fail, assertCurrent, clearCanvas, ImageInputError } from './errors.mjs';
import { validateItems } from './image-preflight.mjs';
import { sheetLayout, fitContain, cellOrigin, labelLines } from './layout.mjs';
import { buildIndexText, validateOutputBytes } from './index-text.mjs';

function encodePng(canvas) {
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new ImageInputError('PNG_EXPORT_FAILED')), 'image/png');
    } catch { reject(new ImageInputError('PNG_EXPORT_FAILED')); }
  });
}

function drawLabel(ctx, index, name, x, y, showNames) {
  ctx.save();
  try {
    ctx.beginPath(); ctx.rect(x, y + 180, 240, 44); ctx.clip();
    ctx.fillStyle = '#111410'; ctx.textBaseline = 'top';
    ctx.font = 'bold 14px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(String(index + 1), x + 4, y + 192, 26);
    if (showNames) {
      ctx.font = '12px "Segoe UI", system-ui, sans-serif';
      const lines = labelLines(name, (s) => ctx.measureText(s).width);
      lines.forEach((line, i) => ctx.fillText(line, x + 32, y + 186 + i * 16, 204));
    }
  } finally { ctx.restore(); }
}

// This adapter calls native Canvas/ImageBitmap in the product. Node injects fakes only for lifecycle tests.
export async function generateContactSheet(items, options = {}, control = {}) {
  const { canvas, decode = (file) => globalThis.createImageBitmap(file, { imageOrientation: 'from-image' }),
    onProgress = () => {}, yieldControl = () => new Promise((resolve) => setTimeout(resolve, 0)) } = control;
  let indexText = null;
  try {
    assertCurrent(control);
    validateItems(items);
    const layout = sheetLayout(items.length, options.columns);
    indexText = buildIndexText(items);
    if (!canvas || typeof canvas.getContext !== 'function' || typeof canvas.toBlob !== 'function') fail('CANVAS_UNAVAILABLE');
    let ctx;
    try {
      canvas.width = layout.width; canvas.height = layout.height;
      ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx || canvas.width !== layout.width || canvas.height !== layout.height) fail('CANVAS_UNAVAILABLE');
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, layout.width, layout.height);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
    } catch { fail('CANVAS_UNAVAILABLE'); }
    for (const [index, item] of items.entries()) {
      assertCurrent(control);
      onProgress({ phase: 'rendering', index: index + 1, total: items.length });
      assertCurrent(control);
      let bitmap = null;
      try {
        try { bitmap = await decode(item.file); } catch {
          assertCurrent(control);
          fail('DECODE_FAILED', { index });
        }
        assertCurrent(control);
        if (!bitmap || typeof bitmap.close !== 'function') fail('DECODE_FAILED', { index });
        const m = item.metadata;
        if (bitmap.width !== m.visualWidth || bitmap.height !== m.visualHeight) fail('ORIENTATION_MISMATCH', { index });
        const { x, y } = cellOrigin(index, layout.columns);
        const fit = fitContain(m.visualWidth, m.visualHeight);
        try {
          ctx.drawImage(bitmap, x + fit.dx, y + fit.dy, fit.width, fit.height);
          ctx.strokeStyle = '#b8bbb2'; ctx.lineWidth = 1;
          ctx.strokeRect(x + 0.5, y + 180.5, 239, 43);
          drawLabel(ctx, index, item.file.name, x, y, options.showNames === true);
        } catch { fail('CANVAS_UNAVAILABLE', { index }); }
      } finally {
        if (typeof bitmap?.close === 'function') bitmap.close();
        bitmap = null;
      }
      // Yield between native decodes so a cancel/input event can be observed promptly.
      await yieldControl();
      assertCurrent(control);
    }
    onProgress({ phase: 'encoding', index: items.length, total: items.length });
    assertCurrent(control);
    const png = await encodePng(canvas);
    assertCurrent(control);
    if (png.type !== 'image/png') fail('PNG_EXPORT_FAILED');
    validateOutputBytes(png.size, 'png');
    return { png, indexText, ...layout, itemCount: items.length };
  } catch (error) {
    clearCanvas(canvas);
    indexText = null;
    if (error instanceof ImageInputError) throw error;
    fail('CANVAS_UNAVAILABLE');
  }
}
