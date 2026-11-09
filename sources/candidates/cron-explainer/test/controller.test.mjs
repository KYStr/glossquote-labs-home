import assert from "node:assert/strict";
import test from "node:test";

// Text <-> builder sync suite (SPEC sections 3 and 7): the sync
// contract the page's controller implements over the pure core —
// classify each parsed field into a builder shape, rebuild canonical
// text from a shape, and confirm the round trip preserves the value
// sets exactly; shapes the builder cannot represent stay "custom"
// and the hand-typed text is never rewritten.

import {
  FIELD_DEFS,
  canonicalFromRange,
  canonicalFromStep,
  canonicalFromValues,
  classifyShape,
  parseExpression,
} from "../public/js/core/cron.mjs";

function rebuildField(field) {
  const shape = classifyShape(field);
  const def = field.def;
  switch (shape.mode) {
    case "every":
      return "*";
    case "values":
      return canonicalFromValues(new Set(field.set), def);
    case "range":
      return canonicalFromRange(shape.a, shape.b, def);
    case "step":
      return canonicalFromStep(shape.base, shape.step, def);
    default:
      return null; // custom: the builder leaves the text untouched
  }
}

test("round trip: builder-representable expressions keep their sets", () => {
  const expressions = [
    "0 9 * * 1-5",
    "*/15 9-17 * * *",
    "5/15 * * * *",
    "0 0 1,15 * 0",
    "30 4 1-7 * *",
    "0 22 * * 1-5",
    "0 0 29 2 *",
    "15,45 */6 * * *",
  ];
  for (const text of expressions) {
    const parsed = parseExpression(text);
    const rebuilt = parsed.fields.map(rebuildField);
    assert.ok(rebuilt.every((part) => part !== null), text);
    const reparsed = parseExpression(rebuilt.join(" "));
    assert.deepEqual(
      reparsed.fields.map((f) => f.set),
      parsed.fields.map((f) => f.set),
      `${text} -> ${rebuilt.join(" ")}`,
    );
  }
});

test("custom shapes are detected and never silently rewritten", () => {
  for (const text of ["0 9 * * 1-5,0", "*/15,3 * * * *", "0 0 1-5,10 * *"]) {
    const parsed = parseExpression(text);
    const modes = parsed.fields.map((f) => classifyShape(f).mode);
    assert.ok(modes.includes("custom"), text);
  }
});

test("canonical builder text is what the controls would write", () => {
  // Full set -> "*"; a values selection with a run of 3 collapses.
  const parsed = parseExpression("0,1,2,5 * * * *");
  assert.equal(rebuildField(parsed.fields[0]), "0-2,5");
  // MON-FRI typed by hand classifies as a range the builder can show.
  const weekdays = parseExpression("0 9 * * MON-FRI");
  assert.deepEqual(classifyShape(weekdays.fields[4]), { mode: "range", a: 1, b: 5 });
  assert.equal(rebuildField(weekdays.fields[4]), "1-5");
});

test("invalid input stops at parse: no enumeration is attempted", () => {
  // The controller contract (SPEC section 5): parse first; the error
  // carries the field identity the error state displays.
  assert.throws(
    () => parseExpression("0 25 * * *"),
    (error) => error.code === "VALUE_RANGE" && error.params.field === "hour" && error.params.index === 2,
  );
  assert.throws(
    () => parseExpression("0 0 * * 5#3"),
    (error) => error.code === "DIALECT_TOKEN" && error.params.field === "dow",
  );
});

test("field defs cover the five fields in crontab order", () => {
  assert.deepEqual(FIELD_DEFS.map((d) => d.key), ["minute", "hour", "dom", "month", "dow"]);
  assert.deepEqual(FIELD_DEFS.map((d) => d.index), [1, 2, 3, 4, 5]);
});
