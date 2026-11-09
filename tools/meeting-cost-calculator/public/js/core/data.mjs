// Auditable constants for the Meeting Cost Calculator. Every bound, the
// preset list and the salary divisor appear exactly once, here, and match
// SPEC section 4 of docs/specs/meeting-cost-calculator/SPEC.md.

export const DATA_VERSION = "meeting-cost-data/1";

// Roster bounds (SPEC sections 2 and 4).
export const MIN_GROUPS = 1;
export const MAX_GROUPS = 5;
export const MIN_HEADCOUNT = 1;
export const MAX_HEADCOUNT = 100;
export const MAX_RATE_CENTS = 100000 * 100; // rate ceiling 100,000.00, in cents
export const MAX_RATE_DECIMALS = 2;

// Manual duration bounds (SPEC sections 2 and 4).
export const MAX_DURATION_HOURS = 24;
export const MAX_DURATION_MINUTES_PART = 59;
export const MIN_TOTAL_MINUTES = 1;
export const MAX_TOTAL_MINUTES = 1440;

// Annual-salary presets (SPEC section 4, closed list). The filled hourly
// rate is annual / SALARY_DIVISOR, rounded half-up to cents at fill time.
// 2080 = 52 weeks x 40 hours. The figures are illustrative only.
export const SALARY_DIVISOR = 2080;
export const PRESETS = [
  { annual: 40000, label: "≈40k / year" },
  { annual: 70000, label: "≈70k / year" },
  { annual: 110000, label: "≈110k / year" },
  { annual: 180000, label: "≈180k / year" },
];

// Display currencies (SPEC section 2). The selector changes only the
// symbol; no conversion is ever performed.
export const CURRENCIES = [
  { code: "TWD", symbol: "NT$" },
  { code: "USD", symbol: "US$" },
  { code: "EUR", symbol: "€" },
  { code: "GBP", symbol: "£" },
  { code: "JPY", symbol: "¥" },
];

export function currencySymbol(code) {
  const found = CURRENCIES.find((c) => c.code === code);
  return found ? found.symbol : null;
}
