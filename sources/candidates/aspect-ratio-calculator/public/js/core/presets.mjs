// The closed preset list from SPEC section 2(c), shipped as auditable data.
// Order is normative for display and for nearest-preset tie-breaking:
// landscape/common forms first, then the portrait mirrors. Presets are
// input shortcuts only; they never replace a computed ratio.
export const PRESETS = Object.freeze([
  Object.freeze({ label: "1:1", width: "1", height: "1" }),
  Object.freeze({ label: "5:4", width: "5", height: "4" }),
  Object.freeze({ label: "4:3", width: "4", height: "3" }),
  Object.freeze({ label: "3:2", width: "3", height: "2" }),
  Object.freeze({ label: "16:10", width: "16", height: "10" }),
  Object.freeze({ label: "16:9", width: "16", height: "9" }),
  Object.freeze({ label: "1.85:1", width: "1.85", height: "1" }),
  Object.freeze({ label: "2.39:1", width: "2.39", height: "1" }),
  Object.freeze({ label: "4:5", width: "4", height: "5" }),
  Object.freeze({ label: "3:4", width: "3", height: "4" }),
  Object.freeze({ label: "2:3", width: "2", height: "3" }),
  Object.freeze({ label: "9:16", width: "9", height: "16" }),
]);
