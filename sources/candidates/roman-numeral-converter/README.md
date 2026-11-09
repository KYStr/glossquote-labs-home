# GlossQuote-Labs — 羅馬數字轉換 / Roman Numeral Converter

## 繁體中文

GlossQuote-Labs 羅馬數字轉換把 1 到 3999 的整數與標準羅馬數字互相轉換，並列出由產生過程直接得出的分解表。

- 兩個欄位即時同步：在任一欄輸入，另一欄與分解表立刻更新；正在輸入的欄位不會被改寫。
- 「標準形」只有一個定義：貪婪表產生的字串。IC 這類非標準寫法會被拒絕，並指出寬鬆值（99）與標準形（XCIX），不默默接受。
- 小寫視為大寫；0 會得到「羅馬數字沒有 0」的說明；4000 以上明示超出範圍；鐘面 IIII 只在說明中提及，不提供該模式。
- 轉換在瀏覽器本機完成，不需帳號或 API；不保存、不上傳輸入，重新載入回到預設值（1994 = MCMXCIV）。

## English

GlossQuote-Labs Roman Numeral Converter converts integers from 1 to 3999 to canonical Roman numerals and back, with a breakdown table taken from the generator's own trace.

- Two synchronised fields: type in either field and the other field plus the breakdown update immediately; the field being edited is never rewritten.
- "Canonical" has one definition: the string the greedy table produces. Non-canonical strings such as IC are rejected with their loose value (99) and the canonical form (XCIX) named, never silently accepted.
- Lowercase is treated as uppercase; 0 gets the "Roman numerals have no zero" explanation; values from 4000 are refused as out of scope; the clock-face IIII appears only in the explanatory notes, never as a mode.
- Everything runs locally in the browser. No account or API is required; input is never saved or uploaded, and reloading restores the defaults (1994 = MCMXCIV).

## 本機預覽 / Local preview

需要 Node.js 24 或更新版本。此專案沒有 runtime dependencies，無需執行 `npm install`。從儲存庫根目錄啟動本機預覽：

Requires Node.js 24 or later. There are no runtime dependencies and `npm install` is not required. Run the local preview from the repository root:

```sh
npm run dev
```

Open one of these complete URLs in your browser:

- [繁體中文頁面 / Traditional Chinese](http://127.0.0.1:4173/index.html)
- [English page](http://127.0.0.1:4173/en/index.html)

開發伺服器只綁定 `127.0.0.1:4173`。根路徑 `/` 不會導向首頁，會回傳 404；請使用上方完整頁面路徑。按 `Ctrl+C` 停止預覽。

The preview server binds only to `127.0.0.1:4173`. The root path `/` does not redirect and returns 404; use one of the complete page paths above. Press `Ctrl+C` to stop the preview.

## Commands

```sh
npm run dev    # local preview server on 127.0.0.1:4173
npm run test   # node:test suites (including the exhaustive 1-3999 round trip)
npm run check  # project structure, safety and metadata checks
npm run build  # preview build into dist/ (byte-identical copy of public/)
```

Production builds are refused until a production site URL is approved for this tool; `node scripts/build.mjs --production --site-url <url>` fails by design. This repository is a production candidate under GlossQuote-Labs coordination task `labs-roman-numeral-converter-cloud-production-20261102`, fixed to specification `spec-roman-numeral-converter-v1`. It is not deployed.
