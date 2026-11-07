/**
 * Standalone specification audit calculation.
 * This is not the product implementation or a product acceptance test.
 */
import assert from "node:assert/strict";

const greedyTable = [
  [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"],
  [90, "XC"], [50, "L"], [40, "XL"], [10, "X"], [9, "IX"],
  [5, "V"], [4, "IV"], [1, "I"],
];
const symbolValue = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };

function encode(value) {
  if (!Number.isInteger(value) || value < 1 || value > 3999) return null;
  let remaining = value;
  let result = "";
  for (const [amount, symbols] of greedyTable) {
    while (remaining >= amount) {
      result += symbols;
      remaining -= amount;
    }
  }
  return result;
}

function looseValue(text) {
  return [...text].reduce((sum, symbol, index, chars) => {
    const value = symbolValue[symbol];
    const next = index + 1 < chars.length ? symbolValue[chars[index + 1]] : 0;
    return sum + (next > value ? -value : value);
  }, 0);
}

function isCanonical(text) {
  if (text.length === 0 || ![...text].every((symbol) => Object.hasOwn(symbolValue, symbol))) return false;
  const value = looseValue(text);
  return value >= 1 && value <= 3999 && encode(value) === text;
}

function breakdown(value) {
  let remaining = value;
  const groups = [];
  for (const [amount, symbols] of greedyTable) {
    while (remaining >= amount) {
      groups.push({ symbols, amount });
      remaining -= amount;
    }
  }
  return groups;
}

const conversionFixtures = [
  [1, "I"], [4, "IV"], [9, "IX"], [14, "XIV"], [40, "XL"],
  [44, "XLIV"], [49, "XLIX"], [58, "LVIII"], [90, "XC"], [99, "XCIX"],
  [400, "CD"], [444, "CDXLIV"], [500, "D"], [777, "DCCLXXVII"],
  [900, "CM"], [944, "CMXLIV"], [1994, "MCMXCIV"], [2026, "MMXXVI"],
  [2421, "MMCDXXI"], [3888, "MMMDCCCLXXXVIII"], [3999, "MMMCMXCIX"],
];

const invalidFixtures = [
  ["IIII", 4, "IV"], ["IC", 99, "XCIX"], ["IL", 49, "XLIX"],
  ["IIV", 5, "V"], ["IXIX", 18, "XVIII"], ["IXL", 39, "XXXIX"],
  ["VX", 5, "V"], ["LC", 50, "L"], ["DM", 500, "D"],
  ["VV", 10, "X"], ["LL", 100, "C"], ["DD", 1000, "M"],
  ["CCCC", 400, "CD"], ["XXXX", 40, "XL"], ["XM", 990, "CMXC"],
  ["MMMM", 4000, null],
];

for (const [value, expected] of conversionFixtures) {
  assert.equal(encode(value), expected, `conversion fixture ${value}`);
}
for (const [text, expectedValue, expectedCanonical] of invalidFixtures) {
  assert.equal(looseValue(text), expectedValue, `loose value ${text}`);
  assert.equal(encode(expectedValue), expectedCanonical, `in-scope canonical ${text}`);
  assert.equal(isCanonical(text), false, `reject ${text}`);
}

let maximumLength = 0;
let maximumForms = [];
for (let value = 1; value <= 3999; value += 1) {
  const text = encode(value);
  assert.equal(looseValue(text), value, `round-trip value ${value}`);
  assert.equal(encode(looseValue(text)), text, `round-trip string ${value}`);
  assert.equal(isCanonical(text), true, `canonical validity ${value}`);
  if (text.length > maximumLength) {
    maximumLength = text.length;
    maximumForms = [{ value, text }];
  } else if (text.length === maximumLength) {
    maximumForms.push({ value, text });
  }
}

const breakdown1994 = breakdown(1994);
const breakdown3888 = breakdown(3888);
assert.deepEqual(breakdown1994, [
  { symbols: "M", amount: 1000 }, { symbols: "CM", amount: 900 },
  { symbols: "XC", amount: 90 }, { symbols: "IV", amount: 4 },
]);
assert.equal(breakdown1994.reduce((sum, item) => sum + item.amount, 0), 1994);
assert.equal(breakdown3888.length, 15);
assert.equal(breakdown3888.reduce((sum, item) => sum + item.amount, 0), 3888);
assert.equal(encode(7), "VII");
assert.equal(looseValue("MCMXCIV"), 1994);

const asciiWhitespaceTrim = (text) => text.replace(/^[\t\n\v\f\r ]+|[\t\n\v\f\r ]+$/g, "");
const normalisedExample = asciiWhitespaceTrim(" MCMXCIV ").replace(/[a-z]/g, (c) => c.toUpperCase());
assert.equal(normalisedExample, "MCMXCIV");
assert.equal(looseValue(normalisedExample), 1994);
assert.match("007", /^[0-9]{1,4}$/);
assert.equal(Number("007"), 7);
assert.doesNotMatch("12a", /^[0-9]{1,4}$/);
assert.doesNotMatch("12345", /^[0-9]{1,4}$/);

console.log(JSON.stringify({
  conversionFixtureCount: conversionFixtures.length,
  allConversionFixturesMatch: true,
  specificationNarrativeCount: 20,
  listedFixturesExceedNarrativeCountBy: conversionFixtures.length - 20,
  invalidFixtureCount: invalidFixtures.length,
  allInvalidFixturesRejected: true,
  outOfRangeFixture: { text: "MMMM", looseValue: 4000, canonicalInScope: null },
  roundTripsChecked: 3999,
  maximumCanonicalLength: maximumLength,
  maximumForms,
  example1994: { text: encode(1994), breakdown: breakdown1994 },
  example3888: { text: encode(3888), breakdownGroupCount: breakdown3888.length },
  normalisedInput: { raw: " MCMXCIV ", value: looseValue(normalisedExample) },
  leadingZeroExample: { raw: "007", value: Number("007"), roman: encode(Number("007")) },
}, null, 2));
