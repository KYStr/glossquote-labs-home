// Auditable constants for the Running Pace Calculator.
// Every value here is pinned by docs/specs/running-pace-calculator/SPEC.md section 4.
// They appear exactly once, here; nothing else in the codebase restates them.

/** Exact conversion: 1 mile = 1.609344 km (SPEC section 4). */
export const MILE_KM = 1.609344;

/** Riegel prediction exponent (SPEC section 4). */
export const RIEGEL_EXPONENT = 1.06;

/** Fixed Riegel target distances in kilometres: 5K, 10K, half, marathon. */
export const RIEGEL_TARGETS_KM = [5, 10, 21.0975, 42.195];

/** Typed-input bounds (SPEC section 2). Computed results are never clamped. */
export const DISTANCE_MIN = 0.01;
export const DISTANCE_MAX = 300;
export const TIME_MIN_SECONDS = 1;
export const TIME_MAX_SECONDS = 359999; // 99:59:59
export const PACE_MIN_SECONDS = 30; // 0:30 per unit
export const PACE_MAX_SECONDS = 3599; // 59:59 per unit

/** Split markers use step 1 while the whole-unit count is at most this, else step 5. */
export const SPLIT_STEP_THRESHOLD = 100;
