# 照明流明計算 / Lighting Lumen Calculator — BRIEF

**文件草案，產品檢查 NOT_RUN** · `spec-lighting-lumen-calculator-20261109`

裝潢或換燈泡的人站在賣場看著包裝上的「流明」，不知道自己 4 坪大的客廳到底要買幾顆、買多亮。這支工具讓他輸入房間長寬（或直接給面積，平方公尺或坪），選房間用途，依釘版的目標照度表算出需要的總流明，再依每顆燈泡的流明數算出要裝幾顆（無條件進位）與裝完後的實際照度。

MVP 範圍。單一房間、一般照明、簡單流明法：總流明 = 面積 × 目標照度，不含利用係數與維護係數（在 SPEC 與頁面揭露為簡化）。非目標為專業照明設計、多房間規劃、作業面局部照明（檯面、床頭閱讀）、照度均勻度／眩光／演色性評估、天花板高度修正、燈具配光與迴路設計。

首個可觀察案例。客廳長 4.0 m、寬 3.5 m、每顆 800 lm（`living-dimensions-basic`）。字面資料與預期見 [fixtures.json](fixtures.json)，契約以 [SPEC.md](SPEC.md) 為準。

先完成核心／狀態測試，再交雙語靜態頁、匯出、build/check、同一候選的九面向證據。目標 `tools/lighting-lumen-calculator/`，固定分支與 PR 交驗。 [本批原始說明](https://github.com/KYStr/glossquote-labs-home/blob/1ce7ba3c83b35eeb99e2f11e3b3eb9e9c6df72bd/docs/consolidation/2026-11-09/SPEC-AUTHOR-BRIEF.md)
