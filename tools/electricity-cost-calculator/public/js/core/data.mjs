// Auditable constants for the Electricity Cost Calculator.
// Every limit, precision and currency fact from SPEC section 2 and section 4
// appears exactly once, here. There is deliberately NO tariff table of any
// utility: the user supplies the rate from their own bill (SPEC section 1).
// DATA_VERSION versions this data set so a reviewer can pin what shipped.

export const DATA_VERSION = "electricity-cost-data/1";

export const LIMITS = Object.freeze({
  // watts: more than 0 and at most 50,000; at most one decimal place.
  wattsMaxTenths: 500_000n, // 50,000.0 W expressed in tenths of a watt
  wattsDecimals: 1,
  // hours per day: more than 0 and at most 24; at most two decimal places.
  hoursMaxHundredths: 2_400n, // 24.00 h expressed in hundredths of an hour
  hoursDecimals: 2,
  // period days: whole, 1-366.
  daysMin: 1n,
  daysMax: 366n,
  // quantity: whole, 1-100.
  quantityMin: 1n,
  quantityMax: 100n,
  // any rate: more than 0 and at most 999.999; at most three decimal places.
  rateMaxThousandths: 999_999n, // 999.999 expressed in thousandths
  rateDecimals: 3,
  // tier thresholds: whole kWh, each 1-1,000,000, strictly ascending.
  thresholdMin: 1n,
  thresholdMax: 1_000_000n,
  // tiered mode has two or three bands; the final band is open-ended.
  bandsMin: 2,
  bandsMax: 3,
});

// Currency minor units and symbols (SPEC section 2 (d)): TWD, USD, EUR and
// GBP use two minor decimals; JPY uses zero. Symbols prefix with no space.
export const CURRENCIES = Object.freeze({
  TWD: Object.freeze({ symbol: "NT$", minorUnits: 2 }),
  USD: Object.freeze({ symbol: "US$", minorUnits: 2 }),
  EUR: Object.freeze({ symbol: "€", minorUnits: 2 }),
  GBP: Object.freeze({ symbol: "£", minorUnits: 2 }),
  JPY: Object.freeze({ symbol: "¥", minorUnits: 0 }),
});

export const CURRENCY_CODES = Object.freeze(Object.keys(CURRENCIES));
