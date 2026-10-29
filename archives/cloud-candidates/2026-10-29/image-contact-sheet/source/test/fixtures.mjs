// 下列 bytes 只驗證預檢，不宣稱是真正可解碼的影像。
export function png(width = 4, height = 3, extra = []) {
  const chunk = (kind, data) => {
    const output = new Uint8Array(data.length + 12); new DataView(output.buffer).setUint32(0,data.length);
    output.set(new TextEncoder().encode(kind),4); output.set(data,8); return output;
  };
  const header = new Uint8Array(13); const view = new DataView(header.buffer); view.setUint32(0,width); view.setUint32(4,height); header[8] = 8; header[9] = 6;
  const chunks = [new Uint8Array([137,80,78,71,13,10,26,10]),chunk('IHDR',header),...extra.map(([kind, data]) => chunk(kind,data)),chunk('IDAT',new Uint8Array([1])),chunk('IEND',new Uint8Array())];
  const bytes = new Uint8Array(chunks.reduce((n,item) => n + item.length,0)); let offset = 0;
  for (const item of chunks) { bytes.set(item,offset); offset += item.length; } return bytes;
}
export function tiff(orientation = 1, little = true) {
  const bytes = new Uint8Array(26); bytes.set(little ? [73,73] : [77,77]); const view = new DataView(bytes.buffer);
  view.setUint16(2,42,little); view.setUint32(4,8,little); view.setUint16(8,1,little); view.setUint16(10,0x112,little); view.setUint16(12,3,little); view.setUint32(14,1,little); view.setUint16(18,orientation,little); return bytes;
}
export function jpeg(width = 4, height = 3, orientation = 1, marker = 0xc0) {
  const exif = tiff(orientation); const bytes = [255,216,255,225,0,34,69,120,105,102,0,0,...exif,255,marker,0,17,8,height >> 8,height & 255,width >> 8,width & 255,3,1,17,0,2,17,0,3,17,0,255,218,0,12,3,1,0,2,17,3,17,0,63,0,1,255,217];
  return new Uint8Array(bytes);
}
