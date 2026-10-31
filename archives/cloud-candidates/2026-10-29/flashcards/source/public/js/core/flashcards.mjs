// 核心僅處理有限純資料；任何錯誤不攜帶題答或原始例外。
export const LIMITS = Object.freeze({ units: 200_000, bytes: 262_144, cards: 200, face: 2_000 });
const RATINGS = Object.freeze(['unreviewed', 'again', 'remembered']);
const fail = (code, record = null) => ({ ok: false, code, record });
const good = value => ({ ok: true, value });

// 先驗 UTF-16 配對，避免 TextEncoder 悄悄用替代字元改寫內容。
export function validateSource(source) {
  if (typeof source !== 'string') return fail('SCHEMA');
  if (source.length > LIMITS.units) return fail('TOO_LARGE');
  for (let i = 0; i < source.length; i++) {
    const unit = source.charCodeAt(i);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = source.charCodeAt(++i);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return fail('UNICODE');
    } else if (unit >= 0xdc00 && unit <= 0xdfff) return fail('UNICODE');
  }
  if (typeof TextEncoder !== 'function') return fail('UNSUPPORTED');
  if (new TextEncoder().encode(source).byteLength > LIMITS.bytes) return fail('TOO_LARGE');
  return good(source);
}

// 題答不 trim 或正規化；trim 只用來拒絕完全空白的一面。
function validFace(value) {
  return typeof value === 'string' && value.trim().length > 0 &&
    [...value].length <= LIMITS.face && !/[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/u.test(value) &&
    validateSource(value).ok;
}

// 有界 CSV 狀態機：bare/start/quoted/afterQuote，拒絕寬鬆修補。
export function parseCSV(source) {
  const checked = validateSource(source);
  if (!checked.ok) return checked;
  const text = source.replace(/^\ufeff/u, '').replace(/\r\n|\r/gu, '\n');
  const rows = [];
  let row = [], field = '', state = 'start';
  const finishField = () => { row.push(field); field = ''; state = 'start'; };
  const finishRow = () => { finishField(); rows.push(row); row = []; };
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (state === 'quoted') {
      if (char === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else state = 'afterQuote';
      } else field += char;
      continue;
    }
    if (char === ',') {
      finishField();
      if (row.length >= 2) return fail('COLUMNS', rows.length + 1);
    } else if (char === '\n') {
      finishRow();
      if (rows.length > LIMITS.cards + 1) return fail('CARD_COUNT');
    } else if (char === '"') {
      if (state !== 'start') return fail('CSV', rows.length + 1);
      state = 'quoted';
    } else {
      if (state === 'afterQuote') return fail('CSV', rows.length + 1);
      field += char; state = 'bare';
    }
  }
  if (state === 'quoted') return fail('CSV', rows.length + 1);
  // 一個末尾換行只結束最後記錄；多餘空行在迴圈內仍保留並拒絕。
  if (text.length > 0 && (text.at(-1) !== '\n' || state !== 'start' || row.length > 0 || field)) finishRow();
  if (!rows.length || rows[0].length !== 2 || rows[0][0] !== 'question' || rows[0][1] !== 'answer') return fail('HEADER', 1);
  if (rows.length < 2 || rows.length > LIMITS.cards + 1) return fail('CARD_COUNT');
  const cards = [];
  for (let i = 1; i < rows.length; i++) {
    if (rows[i].length !== 2) return fail('COLUMNS', i + 1);
    if (!validFace(rows[i][0]) || !validFace(rows[i][1])) return fail('FACE', i + 1);
    cards.push(Object.freeze({ id: i, question: rows[i][0], answer: rows[i][1] }));
  }
  return good(Object.freeze(cards));
}

// 自有 data descriptor 驗 exact shape；不執行 getter，Proxy 例外由外層接住。
function fields(object, names, array = false) {
  if (object === null || typeof object !== 'object') throw new Error('SCHEMA');
  const prototype = Object.getPrototypeOf(object);
  if (array ? prototype !== Array.prototype : prototype !== Object.prototype && prototype !== null) throw new Error('SCHEMA');
  const descriptors = Object.getOwnPropertyDescriptors(object);
  const keys = Reflect.ownKeys(descriptors);
  if (keys.length !== names.length || !keys.every(key => typeof key === 'string' && names.includes(key))) throw new Error('SCHEMA');
  const out = Object.create(null);
  for (const name of names) {
    const descriptor = descriptors[name];
    if (!descriptor || !Object.hasOwn(descriptor, 'value') || descriptor.enumerable !== !(array && name === 'length')) throw new Error('SCHEMA');
    out[name] = descriptor.value;
  }
  return out;
}

// 陣列不可稀疏、加額外屬性或 accessor；上限在逐項巡訪前確認。
function arrayValues(array, minimum, maximum) {
  if (!Array.isArray(array)) throw new Error('SCHEMA');
  const length = Object.getOwnPropertyDescriptor(array, 'length')?.value;
  if (!Number.isSafeInteger(length) || length < minimum || length > maximum) throw new Error('SCHEMA');
  const data = fields(array, ['length', ...Array.from({ length }, (_, i) => String(i))], true);
  return Array.from({ length }, (_, i) => data[i]);
}

export function inspectCards(input) {
  try {
    const cards = arrayValues(input, 1, LIMITS.cards).map((item, i) => {
      const card = fields(item, ['id', 'question', 'answer']);
      if (card.id !== i + 1 || !validFace(card.question) || !validFace(card.answer)) throw new Error('SCHEMA');
      return { id: card.id, question: card.question, answer: card.answer };
    });
    // 匯出/洗牌入口也有總量界限，不能繞過 parser 製造無界模型。
    const joined = cards.map(card => `${card.question}\n${card.answer}`).join('\n');
    if (!validateSource(joined).ok) return fail('SCHEMA');
    return good(cards);
  } catch { return fail('SCHEMA'); }
}

// 無偏取樣；最多 128 次，來源故障時不回部分排列。
function shuffled(cards, nextUint32) {
  const order = cards.map(card => card.id);
  try {
    for (let i = order.length - 1; i > 0; i--) {
      const range = i + 1;
      const limit = Math.floor(4294967296 / range) * range;
      let chosen = -1;
      for (let attempt = 0; attempt < 128; attempt++) {
        const sample = nextUint32();
        if (!Number.isInteger(sample) || sample < 0 || sample > 4294967295) throw new Error('RANDOM');
        if (sample < limit) { chosen = sample % range; break; }
      }
      if (chosen < 0) throw new Error('RANDOM');
      [order[i], order[chosen]] = [order[chosen], order[i]];
    }
    return good(order);
  } catch { return fail('RANDOM'); }
}

// 正式入口不接受 seed/callback；單卡不需要抽樣，兩卡以上必須使用 Crypto。
export function createOrder(input, shuffle) {
  const checked = inspectCards(input);
  if (!checked.ok || typeof shuffle !== 'boolean') return fail('SCHEMA');
  if (!shuffle) return good(checked.value.map(card => card.id));
  return shuffled(checked.value, () => {
    const slot = new Uint32Array(1);
    globalThis.crypto.getRandomValues(slot);
    return slot[0];
  });
}

// 此 seam 只供 literals 測試，產品 app 不可匯入。
export function shuffleForTest(input, nextUint32) {
  const checked = inspectCards(input);
  if (!checked.ok || typeof nextUint32 !== 'function') return fail('SCHEMA');
  return shuffled(checked.value, nextUint32);
}

// 匯出前重新核對所有欄位，拒絕未知資料與非排列 order。
export function inspectPractice(input) {
  try {
    const data = fields(input, ['cards', 'ratings', 'order', 'position', 'revealed']);
    const cards = inspectCards(data.cards);
    if (!cards.ok) return fail('SCHEMA');
    const count = cards.value.length;
    const ratings = arrayValues(data.ratings, count, count);
    const order = arrayValues(data.order, count, count);
    if (!ratings.every(rating => RATINGS.includes(rating)) ||
      !order.every(id => Number.isInteger(id) && id >= 1 && id <= count) || new Set(order).size !== count ||
      !Number.isInteger(data.position) || data.position < 1 || data.position > count || typeof data.revealed !== 'boolean') return fail('SCHEMA');
    return good({ cards: cards.value, ratings, order, position: data.position, revealed: data.revealed });
  } catch { return fail('SCHEMA'); }
}

export function progressJSON(input) {
  const checked = inspectPractice(input);
  if (!checked.ok) return checked;
  const { cards, ratings, order, position, revealed } = checked.value;
  return good(JSON.stringify({ schemaVersion: 1, cards: cards.map((card, i) => ({ ...card, rating: ratings[i] })), order, position, revealed }, null, 2) + '\n');
}

// TXT 的使用者每行縮排，清楚區別題答內容與固定結構標題。
export function printableText(input, locale) {
  const checked = inspectCards(input);
  if (!checked.ok || !['zh-Hant', 'en'].includes(locale)) return fail('SCHEMA');
  const zh = locale === 'zh-Hant';
  const lines = [zh ? '問答卡 — 可列印文字' : 'Flashcards — printable text', ''];
  // 保留原分隔碼點；LF/U+2028/U+2029後都加縮排，防止冒充結構行。
  const indent = value => value.replace(/(^|[\n\u2028\u2029])/gu, '$1  ');
  for (const card of checked.value) {
    lines.push(`${zh ? '卡片' : 'Card'} ${card.id}`, zh ? '題目：' : 'Question:');
    lines.push(indent(card.question));
    lines.push(zh ? '答案：' : 'Answer:');
    lines.push(indent(card.answer), '');
  }
  return good(lines.join('\n'));
}
