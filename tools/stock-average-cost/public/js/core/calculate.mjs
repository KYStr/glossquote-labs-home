// Stock Average Cost Calculator — pure core.
// Spec: docs/specs/stock-average-cost/SPEC.md
// (spec-stock-average-cost-20261109, fixed candidate
// 879cad568897c5413f8e556311d5314c7b7e8a1b, v1, 2026-11-09).
// No DOM, network, or storage access. No imports: this module is embedded
// verbatim into the preview Worker by scripts/build.mjs.
//
// Money model (SPEC-pinned): every amount is an integer count of
// micro-units (1 µ = 0.0001 currency units) held in BigInt. No floating
// point ever touches a money path. Rounding is round-half-up and happens
// only where the SPEC allows: each trade's fee, a partial lot relief, and
// the average cost per share.

export const MAX_FEE_RATE_RAW = 4;
export const MAX_SHARES_RAW = 9;
export const MAX_PRICE_RAW = 12;
export const MAX_TRADES = 20;
export const MAX_REPORT_BYTES = 2097152;
export const REPORT_FILENAME = 'stock-average-cost-report.json';

const MAX_FEE_RATE_BPS = 1000n;
const MIN_SHARES = 1n;
const MAX_SHARES = 999999999n;
const MIN_PRICE_MICRO = 1n;
const MAX_PRICE_MICRO = 10000000000n; // 1,000,000.0000 in µ

const INTEGER_PATTERN = /^(0|[1-9][0-9]*)$/;
const PRICE_PATTERN = /^(0|[1-9][0-9]{0,6})(?:\.([0-9]{1,4}))?$/;

function fail(code, field, row) {
  return { ok: false, error: { code, field, row } };
}

function isPlainObject(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

// Reads an own data property without invoking accessors. Returns
// { found: true, value } or { found: false }.
function ownDataValue(obj, key) {
  const descriptor = Object.getOwnPropertyDescriptor(obj, key);
  if (descriptor === undefined || !('value' in descriptor)) return { found: false };
  return { found: true, value: descriptor.value };
}

function hasUnpairedSurrogate(text) {
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    if (code >= 0xd800 && code <= 0xdbff) {
      if (i + 1 >= text.length) return true;
      const next = text.charCodeAt(i + 1);
      if (next < 0xdc00 || next > 0xdfff) return true;
      i += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      return true;
    }
  }
  return false;
}

// roundHalfUpDiv(n, d) = floor((2n + d) / (2d)) for non-negative BigInts.
function roundHalfUpDiv(n, d) {
  return (2n * n + d) / (2n * d);
}

// µ integer → decimal string with exactly 4 fraction digits. Zero is
// "0.0000" (never "-0.0000"); no thousands separators; locale-free.
function formatMoney(micro) {
  const negative = micro < 0n;
  const abs = negative ? -micro : micro;
  const whole = abs / 10000n;
  const frac = abs % 10000n;
  return `${negative ? '-' : ''}${whole.toString()}.${frac.toString().padStart(4, '0')}`;
}

// Parses a grammar-valid price string to µ (BigInt). Caller has already
// matched PRICE_PATTERN.
function parsePriceMicro(raw) {
  const match = PRICE_PATTERN.exec(raw);
  const whole = BigInt(match[1]);
  const frac = match[2] === undefined ? 0n : BigInt(match[2].padEnd(4, '0'));
  return whole * 10000n + frac;
}

// Validates one raw integer field (feeRateBps / shares) in SPEC order:
// INPUT_LIMIT, UNICODE, EMPTY, INTEGER_FORMAT, RANGE.
// Returns { value: BigInt } or { error }.
function validateIntegerField(raw, { maxRaw, field, row, min, max }) {
  if (raw.length > maxRaw) return { error: fail('INPUT_LIMIT', field, row).error };
  if (hasUnpairedSurrogate(raw)) return { error: fail('UNICODE', field, row).error };
  if (raw === '') return { error: fail('EMPTY', field, row).error };
  if (!INTEGER_PATTERN.test(raw)) return { error: fail('INTEGER_FORMAT', field, row).error };
  const value = BigInt(raw);
  if (value < min || value > max) return { error: fail('RANGE', field, row).error };
  return { value };
}

// Core entry point: run({ feeRateBps, trades }) →
//   { ok: true, result } | { ok: false, error: { code, field, row } }
// Pure: the input is only read (via own-data descriptors), never mutated.
export function run(input) {
  // Step 0: overall shape. Unknown/missing fields, wrong types, accessors,
  // a non-array trades, or a malformed trade object are all SCHEMA.
  if (!isPlainObject(input)) return fail('SCHEMA', null, null);
  const inputKeys = Object.keys(input).sort();
  if (inputKeys.length !== 2 || inputKeys[0] !== 'feeRateBps' || inputKeys[1] !== 'trades') {
    return fail('SCHEMA', null, null);
  }
  const feeSlot = ownDataValue(input, 'feeRateBps');
  const tradesSlot = ownDataValue(input, 'trades');
  if (!feeSlot.found || !tradesSlot.found) return fail('SCHEMA', null, null);
  if (typeof feeSlot.value !== 'string') return fail('SCHEMA', null, null);
  if (!Array.isArray(tradesSlot.value)) return fail('SCHEMA', null, null);
  const trades = tradesSlot.value;
  for (let i = 0; i < trades.length; i += 1) {
    const trade = trades[i];
    if (!isPlainObject(trade)) return fail('SCHEMA', null, i + 1);
    const keys = Object.keys(trade).sort();
    if (keys.length !== 3 || keys[0] !== 'price' || keys[1] !== 'shares' || keys[2] !== 'side') {
      return fail('SCHEMA', null, i + 1);
    }
    for (const key of ['side', 'shares', 'price']) {
      const slot = ownDataValue(trade, key);
      if (!slot.found || typeof slot.value !== 'string') return fail('SCHEMA', null, i + 1);
    }
  }

  // Step 1: feeRateBps.
  const feeCheck = validateIntegerField(feeSlot.value, {
    maxRaw: MAX_FEE_RATE_RAW, field: 'feeRateBps', row: null, min: 0n, max: MAX_FEE_RATE_BPS,
  });
  if (feeCheck.error) return { ok: false, error: feeCheck.error };
  const feeRateBps = feeCheck.value;

  // Step 2: trade count.
  if (trades.length === 0) return fail('EMPTY', 'trades', null);
  if (trades.length > MAX_TRADES) return fail('ROW_LIMIT', 'trades', MAX_TRADES + 1);

  // Step 3: per-row field values, in row order: side, then shares, then
  // price. Shape was verified in step 0, so descriptor reads succeed.
  const parsed = [];
  for (let i = 0; i < trades.length; i += 1) {
    const row = i + 1;
    const trade = trades[i];
    const side = ownDataValue(trade, 'side').value;
    if (side !== 'buy' && side !== 'sell') return fail('ENUM', 'side', row);

    const sharesRaw = ownDataValue(trade, 'shares').value;
    const sharesCheck = validateIntegerField(sharesRaw, {
      maxRaw: MAX_SHARES_RAW, field: 'shares', row, min: MIN_SHARES, max: MAX_SHARES,
    });
    if (sharesCheck.error) return { ok: false, error: sharesCheck.error };

    const priceRaw = ownDataValue(trade, 'price').value;
    if (priceRaw.length > MAX_PRICE_RAW) return fail('INPUT_LIMIT', 'price', row);
    if (hasUnpairedSurrogate(priceRaw)) return fail('UNICODE', 'price', row);
    if (priceRaw === '') return fail('EMPTY', 'price', row);
    if (!PRICE_PATTERN.test(priceRaw)) return fail('DECIMAL_FORMAT', 'price', row);
    const priceMicro = parsePriceMicro(priceRaw);
    if (priceMicro < MIN_PRICE_MICRO || priceMicro > MAX_PRICE_MICRO) {
      return fail('RANGE', 'price', row);
    }

    parsed.push({ side, shares: sharesCheck.value, priceMicro });
  }

  // Step 4: simulate in row order with a FIFO lot queue.
  const lots = []; // { shares: BigInt, cost: BigInt µ }, oldest first.
  const sells = [];
  let totalFees = 0n;
  let totalRealizedPnl = 0n;
  let sharesHeld = 0n;

  for (let i = 0; i < parsed.length; i += 1) {
    const trade = parsed[i];
    const amount = trade.shares * trade.priceMicro;
    const fee = roundHalfUpDiv(amount * feeRateBps, 10000n);
    totalFees += fee;

    if (trade.side === 'buy') {
      lots.push({ shares: trade.shares, cost: amount + fee });
      sharesHeld += trade.shares;
      continue;
    }

    if (trade.shares > sharesHeld) return fail('OVERSOLD', 'trades', i + 1);
    const proceeds = amount - fee;
    let toRelieve = trade.shares;
    let costRelieved = 0n;
    while (toRelieve > 0n) {
      const lot = lots[0];
      if (toRelieve >= lot.shares) {
        // Whole lot relieved: settle at exactly its remaining cost so no
        // rounding residue survives.
        costRelieved += lot.cost;
        toRelieve -= lot.shares;
        sharesHeld -= lot.shares;
        lots.shift();
      } else {
        const part = roundHalfUpDiv(lot.cost * toRelieve, lot.shares);
        costRelieved += part;
        lot.cost -= part;
        lot.shares -= toRelieve;
        sharesHeld -= toRelieve;
        toRelieve = 0n;
      }
    }
    const realizedPnl = proceeds - costRelieved;
    totalRealizedPnl += realizedPnl;
    sells.push({
      row: i + 1,
      shares: Number(trade.shares),
      proceeds: formatMoney(proceeds),
      costRelieved: formatMoney(costRelieved),
      realizedPnl: formatMoney(realizedPnl),
    });
  }

  let totalCostBasis = 0n;
  for (const lot of lots) totalCostBasis += lot.cost;

  return {
    ok: true,
    result: {
      sells,
      totalRealizedPnl: formatMoney(totalRealizedPnl),
      totalFees: formatMoney(totalFees),
      totalSharesHeld: Number(sharesHeld),
      totalCostBasis: formatMoney(totalCostBasis),
      averageCostPerShare: sharesHeld > 0n
        ? formatMoney(roundHalfUpDiv(totalCostBasis, sharesHeld))
        : null,
      remainingLots: lots.map((lot) => ({
        shares: Number(lot.shares),
        costBasis: formatMoney(lot.cost),
      })),
    },
  };
}

// Deterministic JSON: compact, object own keys sorted recursively by UTF-16
// code units ascending, array order unchanged. Strings use JSON literal
// escaping; the input's toJSON is never consulted. Only plain JSON values
// are accepted; anything else is INTERNAL.
function stringifySorted(value) {
  if (value === null) return 'null';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError('non-finite number');
    return JSON.stringify(value);
  }
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'string') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((item) => stringifySorted(item)).join(',')}]`;
  }
  if (typeof value === 'object') {
    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) {
      throw new TypeError('non-plain object');
    }
    const keys = Object.keys(value).sort();
    const parts = keys.map(
      (key) => `${JSON.stringify(key)}:${stringifySorted(value[key])}`,
    );
    return `{${parts.join(',')}}`;
  }
  throw new TypeError('unserializable value');
}

// Serialize a run() result for download: compact sorted JSON, one trailing
// LF, UTF-8 without BOM. Enforces the 2,097,152-byte report cap.
// Returns { ok: true, text, bytes } or { ok: false, error }.
export function serializeReport(result) {
  let text;
  try {
    text = `${stringifySorted(result)}\n`;
  } catch {
    return { ok: false, error: { code: 'INTERNAL', field: null, row: null } };
  }
  const bytes = new TextEncoder().encode(text).length;
  if (bytes > MAX_REPORT_BYTES) {
    return { ok: false, error: { code: 'OUTPUT_LIMIT', field: null, row: null } };
  }
  return { ok: true, text, bytes };
}
