// Pinned activity table (SPEC.md §2.4) — the tool's only activity data.
// Source: 2024 Adult Compendium of Physical Activities (Herrmann SD,
// Willis EA, Ainsworth BE, et al., Journal of Sport and Health Science,
// 2024;13(1):6–12), category lists at pacompendium.com, retrieved
// 2026-11-09. Values are used exactly as published: no row is averaged,
// combined or adjusted. `metTenths` is the MET value × 10; `code` is kept
// as a string so leading zeroes survive. The Chinese names are this
// tool's translations of the Compendium descriptions; the English names
// are the Compendium's own wording, lightly shortened only where the
// parenthetical pace marks it. Eight of the fourteen rows were confirmed
// only indirectly (see AUTHOR-CHECK.md); the reviewer is asked to
// re-check them against the official category pages — the table below
// implements the SPEC exactly as written and must not be "corrected"
// from a 2011 table.

export const ACTIVITY_TABLE = [
  { id: "walking-moderate", code: "17190", metTenths: 38, nameZh: "步行（中等速度）", nameEn: "Walking, 2.8 to 3.4 mph, moderate pace" },
  { id: "walking-brisk", code: "17200", metTenths: 48, nameZh: "步行（快走）", nameEn: "Walking, 3.5 to 3.9 mph, brisk pace" },
  { id: "hiking-cross-country", code: "17080", metTenths: 60, nameZh: "健行（越野）", nameEn: "Hiking, cross country" },
  { id: "jogging-general", code: "12020", metTenths: 75, nameZh: "慢跑（一般）", nameEn: "Jogging, general" },
  { id: "running-6mph", code: "12050", metTenths: 93, nameZh: "跑步（6.0–6.3 mph）", nameEn: "Running, 6.0 to 6.3 mph (10 min/mile)" },
  { id: "bicycling-leisure", code: "01010", metTenths: 40, nameZh: "自行車（休閒，<10 mph）", nameEn: "Bicycling, <10 mph, leisure" },
  { id: "bicycling-moderate", code: "01030", metTenths: 80, nameZh: "自行車（中速，12–13.9 mph）", nameEn: "Bicycling, 12 to 13.9 mph, moderate effort" },
  { id: "swimming-laps-slow", code: "18240", metTenths: 58, nameZh: "游泳（自由式，慢速）", nameEn: "Swimming laps, freestyle, slow, recreational" },
  { id: "swimming-laps-fast", code: "18230", metTenths: 98, nameZh: "游泳（自由式，快速）", nameEn: "Swimming laps, freestyle, fast, vigorous effort" },
  { id: "aerobic-general", code: "02000", metTenths: 73, nameZh: "有氧運動（一般）", nameEn: "Aerobic, general" },
  { id: "elliptical-moderate", code: "02048", metTenths: 50, nameZh: "橢圓機（中等強度）", nameEn: "Elliptical trainer, moderate effort" },
  { id: "resistance-training", code: "02054", metTenths: 35, nameZh: "重量訓練（多動作，8–15 下）", nameEn: "Resistance (weight) training, multiple exercises, 8–15 reps" },
  { id: "yoga-hatha", code: "02150", metTenths: 23, nameZh: "瑜伽（哈達）", nameEn: "Yoga, Hatha" },
  { id: "tai-chi", code: "15670", metTenths: 33, nameZh: "太極／氣功", nameEn: "Tai chi, qi gong, general" },
];

export const ACTIVITY_BY_ID = new Map(ACTIVITY_TABLE.map((row) => [row.id, row]));

// The MET value rendered with exactly one decimal ("6.0", never "6").
export function formatMet(metTenths) {
  return `${Math.floor(metTenths / 10)}.${metTenths % 10}`;
}
