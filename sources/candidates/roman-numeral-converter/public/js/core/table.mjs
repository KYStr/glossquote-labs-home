// The greedy conversion table from SPEC section 4, shipped as the single
// auditable data source for generation, breakdowns and the on-page
// reference table. Order is normative: strictly descending by value, with
// each subtractive pair immediately before the entry it modifies.
export const GREEDY_TABLE = Object.freeze([
  Object.freeze({ value: 1000, symbols: "M" }),
  Object.freeze({ value: 900, symbols: "CM" }),
  Object.freeze({ value: 500, symbols: "D" }),
  Object.freeze({ value: 400, symbols: "CD" }),
  Object.freeze({ value: 100, symbols: "C" }),
  Object.freeze({ value: 90, symbols: "XC" }),
  Object.freeze({ value: 50, symbols: "L" }),
  Object.freeze({ value: 40, symbols: "XL" }),
  Object.freeze({ value: 10, symbols: "X" }),
  Object.freeze({ value: 9, symbols: "IX" }),
  Object.freeze({ value: 5, symbols: "V" }),
  Object.freeze({ value: 4, symbols: "IV" }),
  Object.freeze({ value: 1, symbols: "I" }),
]);

export const SYMBOL_VALUES = Object.freeze({
  I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000,
});
