import { validateInput, fail } from './schema.mjs';

const safeNumber = value => {
  if (value < 0n || value > BigInt(Number.MAX_SAFE_INTEGER)) throw new RangeError('Derived integer outside supported range');
  return Number(value);
};
const ceilDiv = (n, d) => (n + d - 1n) / d;
const nonnegative = n => n > 0n ? n : 0n;

// Every decision and display rounding operation is integer arithmetic.
export function derive([D, L, C], [U, S, R, P]) {
  const target = U * (L + C) + R * D;
  const stock = S * D;
  const need = nonnegative(target - stock);
  const denominator = D * P;
  const packs = ceilDiv(need, denominator);
  const shortage = nonnegative(U * L - stock);
  const milli = (2n * U * 1000n + D) / (2n * D);
  return {
    averageDailyUse: { numeratorUnits: safeNumber(U), denominatorDays: safeNumber(D), roundedTo3: `${milli / 1000n}.${String(milli % 1000n).padStart(3, '0')}` },
    targetNumeratorUnitDays: safeNumber(target),
    stockNumeratorUnitDays: safeNumber(stock),
    needNumeratorUnitDays: safeNumber(need),
    packDenominatorUnitDays: safeNumber(denominator),
    packsToOrder: safeNumber(packs),
    orderUnits: safeNumber(packs * P),
    shortageNumeratorUnitDays: safeNumber(shortage),
    shortageBeforeArrivalUnits: safeNumber(ceilDiv(shortage, D)),
    runwayWholeDays: U > 0n ? safeNumber(stock / U) : null,
  };
}

export function calculateRestockPlan(input) {
  const parsed = validateInput(input);
  if (!parsed.ok) return parsed;
  const items = [];
  for (let i = 0; i < parsed.rows.length; i++) {
    const { id, name, unit, quantities } = parsed.rows[i];
    let derived;
    try { derived = derive(parsed.days, quantities); } catch (error) {
      if (error instanceof RangeError) return fail('CALCULATION_RANGE', `items[${i}]`);
      throw error;
    }
    items.push({ id, name, unit, observedUseUnits: safeNumber(quantities[0]), currentStockUnits: safeNumber(quantities[1]), safetyReserveUnits: safeNumber(quantities[2]), packSizeUnits: safeNumber(quantities[3]), ...derived });
  }
  return { ok: true, result: { schemaVersion: 1, assumptions: { observationDays: safeNumber(parsed.days[0]), leadDays: safeNumber(parsed.days[1]), coverageDays: safeNumber(parsed.days[2]), arrivalTiming: 'end-of-lead-period', usageModel: 'fixed-average' }, items } };
}
