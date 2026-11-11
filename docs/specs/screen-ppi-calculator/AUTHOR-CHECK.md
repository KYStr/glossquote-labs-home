# 螢幕 PPI 計算 — 作者檢查

作者 `cloud-dot`（Run 5 spec author，工作目錄 `build5/specs/screen-ppi-calculator/`）。作者文件核對，待非作者 readiness。本人未執行任何 registry/coordination 指令；登記、claim 與 submit 由上層處理。

- 八節涵蓋 goal、scope、userFlow、inputsOutputs、implementation、acceptance、tests、handoff。配對 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json)。

- 已比對 checkout 內 `docs/specs/` 101 份既有規格：無 ppi／screen／density 同名或同功能規格。最相近者 aspect-ratio-calculator 已讀其 SPEC 全文：其 Mode A 由尺寸約分得比例、Mode B 由比例加一邊求解另一邊，含預設表與「接近著名比例」提示。本案在 SPEC scope 釘死界線：只做密度與實體量輸出，約分比例為唯讀衍生標籤，**永遠顯示真正約分結果**（3440×1440 → 43:18、1366×768 → 683:384），無求解、無預設表、無接近提示、無比例輸入。photo-print-size（本批 #31）以 DPI 對紙張，本案實體尺寸是面板本身，不相交。

- 18 筆字面核心案例（12 成功＋6 錯誤）、3 筆 controller 案例。每筆成功案例的 expected 以兩種獨立方法推導，兩法一致才寫入：
  1. **高精度參照**：Python mpmath，50 位有效位數，按 SPEC 公式（sqrt → 除 → 乘 2.54／除）與 `R(x,k) = floor(x·10^k + 0.5)/10^k` 捨入。
  2. **雙精度照釘版順序**：Node 24 腳本，IEEE-754 double，運算順序與 SPEC inputsOutputs 第 1–6 步完全相同（含 gcd 以 Euclid 整數運算）。
  12/12 案例兩法的 ppi、widthCm、heightCm、dotPitchMm、megapixels、aspectRatio 全數相同。

- **捨入邊界餘裕（已量測，取各輸出最小值）**：ppi（1 位）最小餘裕 0.00467（`laptop-15-6`，原始值 100.45467，邊界 100.45）；widthCm/heightCm（1 位）最小餘裕 0.0026 cm（`tv-85` 高，原始值 105.8474，邊界 105.85）；dotPitchMm（3 位）最小餘裕 1.31e-5 mm（`qhd-27`，原始值 0.2334869，邊界 0.2335）；megapixels 由精確整數乘積除以 10⁶，最近邊界距離 0.0014（`fhd-24` 2.0736，邊界 2.075）。雙精度單步誤差約 1e-12（相對），全部餘裕至少高出六個數量級，不同引擎的 sqrt／除法末位差異不可能翻轉任何案例的捨入結果。

- **釘版決定與理由**：(a) 寬高與點距恆由**未捨入** ppiRaw 推導——試算 `fhd-24`：以顯示值 91.8 反推寬度得未捨入 53.1242 cm，正確推導為 53.1312 cm，未捨入層級即不一致（差 0.007 cm），在其他輸入下足以跨越顯示邊界，故明文禁止反推並在 tests 設勾稽不變式。(b) PPI 顯示精度選 1 位小數（非整數）：91.8 與 94.0 的差異在購物比較時有意義，整數會把 `px-cap-200` 的 93.99 誤顯為 94 而丟失勾稽線索；REPORT 數值與畫面同為 1 位，全文一致。(c) 點距取 3 位：手機級 pitch 約 0.055 mm，2 位會併成 0.06 失去分辨力。(d) 雙螢幕比較模式**省略**（概念備註允許省略），SPEC scope 明列非目標，不留欄位。(e) 範圍：對角線 0.1–200 英寸、像素 1–16384，理由寫入 SPEC（16384 使 `w² + h² ≤ 2²⁹` 恆精確）。(f) 對角像素 `sxga-19` 恰為整數 2000、`min-diag-0-1` 的 PPI 恰為 4000，作為精確路徑錨點。

- 概念備註與來源核對：公式 `sqrt(w²+h²)/d`、點距 `25.4/PPI`、1 英寸 = 2.54 cm 均為定義性關係，無相互矛盾的來源；gcd 約分與 sibling 的差異已如上記錄，無需更正概念備註。

- 產品交驗、Chrome/Edge、正式 HTTPS/SEO、Network/Storage、原生對話及部署皆 NOT_RUN，分數 null。未固定候選或未獨評前不計 ready。
