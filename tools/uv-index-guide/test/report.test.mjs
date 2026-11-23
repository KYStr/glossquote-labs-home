// Report serialization: byte-exact expectations written literally here
// (sorted keys, compact JSON, one trailing LF), hashed independently.
// The literal texts below are the stable serialization of the SPEC
// fixtures' own expected results — not output copied from the product.

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import { buildReport, run, stableStringify } from "../public/js/core/core.mjs";

test("report bytes for low-typical are exact", () => {
  const { result } = run({ uvIndex: "2", skinType: "III" });
  const report = buildReport(result);
  assert.equal(report.ok, true);
  const expectedText =
    '{"adviceEn":"You can safely stay outside; wear sunglasses on bright days. If you burn easily, use broad-spectrum SPF 15+ sunscreen.","adviceZh":"可安心待在戶外；晴天戴太陽眼鏡，容易曬傷者可擦廣效性 SPF 15+ 防曬乳。","avoidMidday":false,"burnEstimate":{"capped":false,"medJPerM2":300,"minutesToRedness":100,"skinType":"III"},"category":{"code":"low","color":"green","en":"Low","pms":"PMS 375","zh":"低量級"},"cwaBurnTimeMinutes":null,"disclaimerEn":"This tool is for general reference only and is not medical advice. Time-to-redness is an estimate; individual variation is large. Follow official sun-protection guidance.","disclaimerZh":"本工具僅供一般參考，不構成醫療建議。曬紅時間為估計值，個人差異很大；防曬請以官方建議為準。","protectionRequired":false,"reapplyMinutes":null,"skinNoteEn":"Sometimes burns, tans gradually.","skinNoteZh":"有時曬傷、逐漸曬黑。","spfMinimum":15,"uvIndex":2,"uvIndexRounded":2}\n';
  assert.equal(report.text, expectedText);
  const expectedHash = createHash("sha256").update(expectedText, "utf8").digest("hex");
  const actualHash = createHash("sha256").update(report.bytes).digest("hex");
  assert.equal(actualHash, expectedHash);
  assert.equal(actualHash, "208baa3d74b8fef8e3c2fc7ce7d13c6044d8e66c4f85ae5ba6668eb0af5f7153");
  // UTF-8 without BOM: first byte is '{'.
  assert.equal(report.bytes[0], 0x7b);
});

test("report sorts keys recursively and preserves array order", () => {
  const text = stableStringify({ b: [{ d: 1, a: 2 }, { c: 3 }], a: "x" });
  assert.equal(text, '{"a":"x","b":[{"a":2,"d":1},{"c":3}]}');
});

test("report for a very-high result carries the CWA burn time and SPF 50", () => {
  const { result } = run({ uvIndex: "8", skinType: "II" });
  const report = buildReport(result);
  assert.equal(
    report.text,
    '{"adviceEn":"Avoid being outside during midday hours; shade, clothing, sunscreen and a hat are a must.","adviceZh":"中午避免待在戶外；遮蔭、衣物、防曬乳、帽子缺一不可。","avoidMidday":true,"burnEstimate":{"capped":false,"medJPerM2":250,"minutesToRedness":21,"skinType":"II"},"category":{"code":"very-high","color":"red","en":"Very high","pms":"PMS 032","zh":"過量級"},"cwaBurnTimeMinutes":20,"disclaimerEn":"This tool is for general reference only and is not medical advice. Time-to-redness is an estimate; individual variation is large. Follow official sun-protection guidance.","disclaimerZh":"本工具僅供一般參考，不構成醫療建議。曬紅時間為估計值，個人差異很大；防曬請以官方建議為準。","protectionRequired":true,"reapplyMinutes":120,"skinNoteEn":"Burns easily, tans minimally.","skinNoteZh":"容易曬傷、很少曬黑。","spfMinimum":50,"uvIndex":8,"uvIndexRounded":8}\n'
  );
});
