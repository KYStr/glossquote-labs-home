// 只從已驗證的記憶體位元組建立 Blob，不建立任何 object URL。
export async function decodeImage(bytes, header, current = () => true) {
  let bitmap = null, canvas = null;
  try {
    bitmap = await createImageBitmap(new Blob([bytes], { type: header.mime }), { imageOrientation: 'from-image' });
    if (!current()) throw Error('CANCELLED');
    // 在配置 Canvas 前確認解碼器沒有回傳異常尺寸。
    if (!(bitmap.width === header.width && bitmap.height === header.height || bitmap.width === header.height && bitmap.height === header.width)) throw Error('CORRUPT');
    canvas = document.createElement('canvas'); canvas.width = bitmap.width; canvas.height = bitmap.height;
    const context = canvas.getContext('2d', { willReadFrequently: true, colorSpace: 'srgb' });
    if (!context) throw Error('DECODE');
    context.drawImage(bitmap, 0, 0);
    const data = context.getImageData(0, 0, bitmap.width, bitmap.height).data;
    return { width: bitmap.width, height: bitmap.height, data };
  } finally {
    // 成功、錯誤及取消都會關閉位圖並縮小臨時 backing store。
    bitmap?.close();
    if (canvas) canvas.width = canvas.height = 1;
  }
}
// 瀏覽器必要能力不齊全時顯示明確說明，而非嘗試遠端備援。
export function supported() {
  try { return typeof createImageBitmap === 'function' && typeof ImageData === 'function' && !!document.createElement('canvas').getContext('2d'); }
  catch { return false; }
}
