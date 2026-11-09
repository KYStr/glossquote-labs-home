// Grade-point scale tables — the single auditable copy of SPEC section 4.
// Points are integer tenths (p10); the scale maximum is also in tenths.
// MUST match docs/specs/gpa-calculator/SPEC.md section 4 exactly.
export const SCALES = Object.freeze({
  "4.0": Object.freeze({
    id: "4.0",
    maxTenths: 40,
    entries: Object.freeze([
      ["A", 40], ["A\u2212", 37], ["B+", 33], ["B", 30], ["B\u2212", 27],
      ["C+", 23], ["C", 20], ["C\u2212", 17], ["D+", 13], ["D", 10],
      ["D\u2212", 7], ["F", 0]
    ])
  }),
  "4.3": Object.freeze({
    id: "4.3",
    maxTenths: 43,
    entries: Object.freeze([
      ["A+", 43], ["A", 40], ["A\u2212", 37], ["B+", 33], ["B", 30],
      ["B\u2212", 27], ["C+", 23], ["C", 20], ["C\u2212", 17], ["D+", 13],
      ["D", 10], ["D\u2212", 7], ["F", 0]
    ])
  })
});

export function getScale(scaleId) {
  const scale = SCALES[scaleId];
  if (!scale) throw new RangeError(`unknown scale: ${scaleId}`);
  return scale;
}

export function pointsTenths(scale, letter) {
  for (const [name, p10] of scale.entries) if (name === letter) return p10;
  return null;
}

export function gradeOnScale(scale, letter) {
  return pointsTenths(scale, letter) !== null;
}
