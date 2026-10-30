// 純核心只處理規格限定的資料物件，不讀取瀏覽器或外部狀態。
const ROOT = ['columns', 'rows', 'rowHeight', 'gap', 'blocks']; // 根欄位固定。
const FIELDS = ['rowStart', 'columnStart', 'rowEnd', 'columnEnd']; // 區塊欄位及驗證順序固定。
const failure = (code, field, index = null, blocks = null) => ({ ok: false, error: { code, field, index, blocks } }); // 錯誤不攜原始輸入。
function dataObject(value, keys) { // 描述符檢查不求值 getter；Proxy 不在有限 API 契約內。
  if (!value || typeof value !== 'object' || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) return false; // 拒非普通物件。
  const ds = Object.getOwnPropertyDescriptors(value); // 只讀描述符。
  return Reflect.ownKeys(ds).length === keys.length && keys.every(k => ds[k]?.enumerable && Object.hasOwn(ds[k], 'value')); // 拒額外字串或 Symbol 及 accessor。
} // 形狀檢查結束。
function integer(raw, min, max, field, index = null) { // 按長度、格式、範圍順序驗證。
  if (!raw.length) return failure('E_REQUIRED', field, index); // 空字串優先。
  if (raw.length > 3) return failure('E_RAW_LENGTH', field, index); // UTF16 長度不截短。
  if (!/^(?:0|[1-9][0-9]*|-[1-9][0-9]*)$/.test(raw)) return failure('E_INTEGER', field, index); // 不接受 trim 或非 canonical 表示。
  const value = Number(raw); // 僅在嚴格格式成功後轉換。
  return value < min || value > max ? failure('E_RANGE', field, index) : { ok: true, value }; // 範圍包含端點。
} // 整數解析結束。
export function generateLayout(raw) { // 有界同步交易；所有結構先於數值。
  if (!dataObject(raw, ROOT) || ROOT.slice(0, 4).some(k => typeof raw[k] !== 'string') || !Array.isArray(raw.blocks)) return failure('E_SCHEMA', 'root'); // 根型別優先。
  const list = raw.blocks; // 陣列長度是標準資料欄。
  if (list.length < 1 || list.length > 12) return failure('E_BLOCK_COUNT', 'blocks'); // 超量不讀元素。
  const ds = Object.getOwnPropertyDescriptors(list); // 不觸發元素 getter。
  if (Reflect.ownKeys(ds).length !== list.length + 1 || Array.from({ length: list.length }, (_, i) => String(i)).some(k => !ds[k]?.enumerable || !Object.hasOwn(ds[k], 'value'))) return failure('E_SCHEMA', 'blocks'); // 拒洞、附加鍵和 accessor。
  for (let i = 0; i < list.length; i++) { // 完整掃描結構，再進數值。
    if (!dataObject(list[i], FIELDS) || FIELDS.some(k => typeof list[i][k] !== 'string')) return failure('E_SCHEMA', 'block', i); // 固定第一個結構錯。
  } // 所有結構完成。
  const value = {}; // 只建立標準化輸出。
  for (const [k, min, max] of [['columns', 1, 6], ['rows', 1, 6], ['rowHeight', 24, 160], ['gap', 0, 32]]) { // 固定全域順序。
    const r = integer(raw[k], min, max, k); if (!r.ok) return r; value[k] = r.value; // 首錯即返。
  } // 全域成功。
  const blocks = []; // 區塊不攜 UI ID。
  for (let i = 0; i < list.length; i++) { // 保持來源序。
    const b = { number: i + 1 }; // 連續一基序號。
    for (const [k, min, max] of [['rowStart', 1, value.rows], ['columnStart', 1, value.columns], ['rowEnd', 2, value.rows + 1], ['columnEnd', 2, value.columns + 1]]) { // 四欄先於起訖關係。
      const r = integer(list[i][k], min, max, k, i); if (!r.ok) return r; b[k] = r.value; // 不自動搬動或夾值。
    } // 本塊數值成功。
    if (b.rowStart >= b.rowEnd) return failure('E_ORDER', 'rowEnd', i); // 列關係先驗。
    if (b.columnStart >= b.columnEnd) return failure('E_ORDER', 'columnEnd', i); // 再驗欄。
    b.rowSpan = b.rowEnd - b.rowStart; b.columnSpan = b.columnEnd - b.columnStart; b.cells = b.rowSpan * b.columnSpan; blocks.push(Object.freeze(b)); // 半開格子面積。
  } // 全部數值完成。
  for (let i = 0; i < blocks.length - 1; i++) for (let j = i + 1; j < blocks.length; j++) { // 固定 pair 順序。
    const a = blocks[i], b = blocks[j]; // 不以視覺順序近似。
    if (Math.min(a.rowEnd, b.rowEnd) > Math.max(a.rowStart, b.rowStart) && Math.min(a.columnEnd, b.columnEnd) > Math.max(a.columnStart, b.columnStart)) return failure('E_OVERLAP', 'rowStart', j, [i, j]); // 共邊角合法。
  } // 重疊驗證完成。
  const lines = ['.grid-layout { /* 容器：使用明確網格與固定類別 */', '  display: grid; /* 排版：啟用二維網格 */', `  grid-template-columns: repeat(${value.columns}, minmax(0, 1fr)); /* 欄：等比例且允許縮小 */`, `  grid-template-rows: repeat(${value.rows}, ${value.rowHeight}px); /* 列：固定數量與像素高度 */`, `  gap: ${value.gap}px; /* 間距：欄與列使用同一數值 */`, '} /* 容器規則結束 */']; // 固定六行模板。
  for (const b of blocks) lines.push(`.grid-layout > .grid-item-${b.number} { /* 區塊${b.number}：對應直接子元素 */`, `  grid-row: ${b.rowStart} / ${b.rowEnd}; /* 列線：起點包含、終點不含 */`, `  grid-column: ${b.columnStart} / ${b.columnEnd}; /* 欄線：起點包含、終點不含 */`, `} /* 區塊${b.number}規則結束 */`); // 每塊四行及固定 selector。
  const css = lines.join('\n') + '\n'; // UTF8 無 BOM、最後 LF。
  if (new TextEncoder().encode(css).length > 8192) return failure('E_OUTPUT_LIMIT', 'output'); // 不截斷防守邊界。
  const occupiedCells = blocks.reduce((sum, b) => sum + b.cells, 0); // gap 不算空格。
  return { ok: true, value: Object.freeze({ ...value, blocks: Object.freeze(blocks), occupiedCells, emptyCells: value.rows * value.columns - occupiedCells, css }) }; // 不可變完整快照。
} // 純核心結束。
