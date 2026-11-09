# T01：係數與瀏覽器基線核對

查閱與實測日期：2026-09-24。主代理逐項核對 TECHNICAL.md 的封閉表；以下係數為定義值，JavaScript Number 運算仍有浮點誤差。產品執行時不連線查表。

## 官方來源

- [NIST SP 811 B.8 換算表](https://www.nist.gov/pml/special-publication-811/nist-guide-si-appendix-b-conversion-factors/nist-guide-si-appendix-b8)：國際英吋、國際英呎、公頃、公升、常衡磅及溫度關係。
- [NIST SI 前綴](https://www.nist.gov/pml/special-publication-811/nist-guide-si-chapter-4-two-classes-si-units-and-si-prefixes)：milli、centi、kilo 分別為 10⁻³、10⁻²、10³；面積須平方前綴係數。
- [NIST SP 811 註腳 22](https://www.nist.gov/pml/special-publication-811/nist-guide-si-footnotes)：常衡磅精確係數為 0.45359237 kg。B.8 主表的 0.4535924 是有限位數表示，不能用它覆寫本專案精確常數。
- [ECMAScript Number 規格](https://tc39.es/ecma262/multipage/numbers-and-dates.html#sec-number.isfinite)：Number.isFinite、toPrecision、toFixed、toExponential 的語言規格依據；產品範圍與顯示門檻是本專案選擇。

## 逐列比對

「PASS」表示與上述定義或其直接代數推導一致，沒有新增單位。

| 類別／基準 | ID | TECHNICAL 係數 | 核對方式 | 結果 |
|---|---|---:|---|---|
| length／m | mm | 0.001 | milli | PASS |
| length／m | cm | 0.01 | centi | PASS |
| length／m | m | 1 | 基準 | PASS |
| length／m | km | 1000 | kilo | PASS |
| length／m | in | 0.0254 | B.8 國際英吋 | PASS |
| length／m | ft | 0.3048 | B.8 國際英呎；不是 US survey foot | PASS |
| area／m2 | cm2 | 0.0001 | 0.01² | PASS |
| area／m2 | m2 | 1 | 基準 | PASS |
| area／m2 | km2 | 1000000 | 1000² | PASS |
| area／m2 | ha | 10000 | B.8 公頃 | PASS |
| mass／kg | mg | 0.000001 | 10⁻³ g ÷ 10³ g/kg | PASS |
| mass／kg | g | 0.001 | 1 g ÷ 10³ g/kg | PASS |
| mass／kg | kg | 1 | 基準 | PASS |
| mass／kg | lb | 0.45359237 | B.8 與註腳 22 | PASS |
| volume／L | mL | 0.001 | milli | PASS |
| volume／L | L | 1 | 基準 | PASS |
| volume／L | m3 | 1000 | B.8：1 L = 0.001 m³ | PASS |

temperature 的 C、F、K 共三個 ID 不使用比例係數。全部 20 個單位 ID 與五類別固定順序均與 TECHNICAL 一致。質量沒有轉成力。

## 溫度六種公式

B.8 的攝氏／華氏／克耳文關係以 1.8 = 9/5 及反函數整理，得到下表；這是代數推導，不是逐字引文。相同單位直接回原值。

| 方向 | 實作操作順序 | 結果 |
|---|---|---|
| C → F | x * 9 / 5 + 32 | PASS |
| F → C | (x - 32) * 5 / 9 | PASS |
| C → K | x + 273.15 | PASS |
| K → C | x - 273.15 | PASS |
| F → K | (x + 459.67) * 5 / 9 | PASS |
| K → F | x * 9 / 5 - 459.67 | PASS |

來源值下限分別為 -273.15 °C、-459.67 °F、0 K；來源單位先直接比較，不以容差放行。C/F 下限轉 K 的加法先歸零，避免替換公式操作順序。沒有未解的來源衝突。

## 實際瀏覽器基線

Windows 本機；Node v24.14.0、npm 11.9.0。主代理以 `npm.cmd run dev` 啟動 127.0.0.1:4173，用 Codex In-app Browser 開啟 `/index.html`，完成後停止伺服器。

| 項目 | 實際證據 | 判定 |
|---|---|---|
| ESM | 本地 `type="module"` app.mjs 將頁面狀態改為「模組已載入」 | PASS |
| output | DOM 讀取 tagName 為 OUTPUT、value 為「模組已載入」，畫面可見 | PASS |
| CSS | 1280×720 實際畫面具有紙色背景、置中內容、頂列與間距；本地樣式生效 | PASS |
| 基線真實版本 | 工具只公開名稱 Codex In-app Browser；內部版本頁遭瀏覽器安全政策拒絕，沒有改用其他途徑繞過 | 未確認 |
| 其他平台 | Chrome／Edge／Firefox／Safari 的指定版本、手機、320 px、200% 縮放 | 未測 |

T01 要求的三項瀏覽器功能已實測。版本未確認是紀錄限制，不能把此次基線當成指定版本相容性認證。T03–T06 的完整產品瀏覽器、鍵盤、網路／storage 與無 JavaScript 驗收仍未執行。

## T02 介面補充決策

- `parseNumber` 與 `convert` 使用 `{ok:true,value}` / `{ok:false,code}`。`formatNumber` 與 `getFormula` 返回文字，供未來介面以 textContent 呈現。
- convert 必須是含四個自有資料欄位的物件；以完整自有鍵檢查額外 symbol／non-enumerable 欄位，拒絕陣列與 accessor，不呼叫其 getter。形狀錯誤固定 INVALID_NUMBER。
- 未知 category／單位或非字串識別字固定 UNKNOWN_UNIT；已知但跨類別固定 UNIT_MISMATCH。這補足既有封閉表契約，不擴充產品能力。
- formatNumber 僅接受合法輸出範圍內的 number；getFormula 僅接受同類的已知單位。誤用可拋固定 RangeError，不把外來值串入文字，也不捕捉後偽造結果。
- 所有單位對的往返測試只在正向結果仍符合反向輸入限制時執行；超出者斷言相應範圍拒絕，不能為了往返測試放寬 1e-12..1e12 的輸入界線。這些拒絕不算往返 PASS。
- 歷史決策（已由 2026-09-29 T08 更正）：先前將 `1e-12 * (0.001 / 1000)` 的浮點結果 `9.999999999999999e-19` 被拒絕記為已知限制。使用者稽核 F-01 指出這違反數學上包含 1e-18 下限的產品承諾，舊測試也錯誤固定了此行為。T08 改為精確十進位分數判定非溫度結果範圍，再正規化合法邊界的浮點偏移；四組換算必須得到 1e-18 並成功格式化。真正超界、輸入限制及溫度下限仍嚴格拒絕。詳見 TECHNICAL 與 VERIFICATION 的 T08 紀錄。
