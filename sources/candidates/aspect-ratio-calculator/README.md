# GlossQuote-Labs — 長寬比計算 / Aspect Ratio Calculator

## 繁體中文

GlossQuote-Labs 長寬比計算把尺寸化簡為精確比率，或由比率與一邊求出另一邊。

- 模式 A：輸入整數寬與高（1–100,000），得到化簡比率、小數（4 位）與高度佔寬度的百分比（2 位）。
- 模式 B：輸入比率（兩邊 > 0、≤ 10,000、小數最多 3 位）與已知邊（> 0、≤ 100,000、小數最多 2 位），求出另一邊；非整數結果同時顯示精確分數。
- 12 個預設比率（1:1、5:4、4:3、3:2、16:10、16:9、1.85:1、2.39:1、4:5、3:4、2:3、9:16）只作輸入捷徑。
- 全部計算使用整數與分數（BigInt），不先四捨五入；1366×768 會誠實呈現為 683:384，並註記「接近 16:9（差 0.0009）」，不偷換成 16:9。
- 計算在瀏覽器本機完成，不需帳號或 API；不保存、不上傳輸入，重新載入回到預設值。

## English

GlossQuote-Labs Aspect Ratio Calculator simplifies dimensions to an exact ratio, or solves the other side from a ratio and one dimension.

- Mode A: enter integer width and height (1–100,000) to get the simplified ratio, the decimal (4 places) and the height as a percentage of the width (2 places).
- Mode B: enter a ratio (both parts > 0, ≤ 10,000, up to 3 decimal places) and a known side (> 0, ≤ 100,000, up to 2 decimal places) to solve the other side; non-integer results also show the exact fraction.
- Twelve presets (1:1, 5:4, 4:3, 3:2, 16:10, 16:9, 1.85:1, 2.39:1, 4:5, 3:4, 2:3, 9:16) are input shortcuts only.
- All arithmetic is exact integer/fraction (BigInt) work with display-only rounding; 1366×768 is honestly shown as 683:384 with the note "Close to 16:9 (differs by 0.0009)", never replaced by 16:9.
- Everything runs locally in the browser. No account or API is required; input is never saved or uploaded, and reloading restores the defaults.

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
npm run test   # node:test suites
npm run check  # project structure, safety and metadata checks
npm run build  # preview build into dist/ (byte-identical copy of public/)
```

Production builds are refused until a production site URL is approved for this tool; `node scripts/build.mjs --production --site-url <url>` fails by design. This repository is a production candidate under GlossQuote-Labs coordination task `labs-aspect-ratio-calculator-cloud-production-20261102`, fixed to specification `spec-aspect-ratio-calculator-v1`. It is not deployed.
