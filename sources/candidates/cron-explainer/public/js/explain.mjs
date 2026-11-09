// Explanation renderer for the Cron Expression Explainer: turns the
// core's structured explanation model into per-field lines and one
// whole-schedule sentence, in either language, from the templates in
// i18n.mjs. Same model in, semantically identical prose out.

import { DICTIONARIES, fillTemplate } from "./i18n.mjs";

const FIELD_ORDER = ["minute", "hour", "dom", "month", "dow"];

function dictionary(lang) {
  return DICTIONARIES[lang] ?? DICTIONARIES["zh-Hant"];
}

export function displayValue(lang, fieldKey, value) {
  const dict = dictionary(lang);
  if (fieldKey === "month") return dict.monthNames[value - 1];
  if (fieldKey === "dow") return dict.dowNames[value];
  return String(value);
}

export function fieldPhrase(lang, fieldKey, desc) {
  const templates = dictionary(lang).phrases[fieldKey];
  const show = (value) => displayValue(lang, fieldKey, value);
  switch (desc.kind) {
    case "every":
      return templates.every;
    case "single":
      return fillTemplate(templates.single, { value: show(desc.value) });
    case "range":
      return fillTemplate(templates.range, { a: show(desc.a), b: show(desc.b) });
    case "step":
      if (desc.base === "all") {
        return fillTemplate(templates.stepAll, { step: desc.step });
      }
      if (desc.base === "range") {
        return fillTemplate(templates.stepRange, {
          a: show(desc.a), b: show(desc.b), step: desc.step,
        });
      }
      return fillTemplate(templates.stepFrom, {
        a: show(desc.a), value: show(desc.a), step: desc.step,
      });
    case "list":
      return fillTemplate(templates.list, {
        values: desc.values.map(show).join(", "),
      });
    case "summary":
      return fillTemplate(templates.summary, { count: desc.count });
    default:
      return "";
  }
}

// Returns { lines: [{field, label, phrase} x5], schedule: string }.
// The whole-schedule sentence combines the time-of-day pattern with
// the day pattern, appends the OR-rule sentence whenever both day
// fields are restricted, and the never-fires warning when the model
// carries it (SPEC section 4, mandatory elements).
export function renderExplanation(lang, model) {
  const dict = dictionary(lang);
  const lines = model.fields.map((desc, i) => ({
    field: FIELD_ORDER[i],
    label: dict.fieldLabels[FIELD_ORDER[i]],
    phrase: fieldPhrase(lang, FIELD_ORDER[i], desc),
  }));
  const byField = Object.fromEntries(lines.map((line) => [line.field, line.phrase]));
  const parts = [
    byField.hour,
    byField.minute,
    byField.dom,
    byField.month,
    byField.dow,
  ];
  let schedule = dict.ui.SCHEDULE_LEAD + parts.join(dict.ui.SCHEDULE_SEP) + (lang === "en" ? "." : "。");
  if (model.bothDayRestricted) schedule += ` ${dict.ui.OR_SENTENCE}`;
  if (model.neverFires) schedule += ` ${dict.ui.NEVER_WARNING}`;
  return { lines, schedule };
}
