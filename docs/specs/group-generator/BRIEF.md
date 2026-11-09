# 隨機分組產生器 / Group Generator — BRIEF

**文件草案，產品檢查 NOT_RUN** · `spec-group-generator-20261109`

老師或活動主辦者手上有一份名單（全班、社團、參加者），要分成若干小組：手動分配容易漏人重人，也常被質疑不公平；事後有人問「為什麼這樣分」時更無從重現。這支工具貼上名單後，用種子洗牌再輪流發牌分組，每人恰好一組、各組人數最多差 1；相同名單與種子必得相同分組，可事後核對重現。

MVP 範圍。名單每行一人（上限 500 人），兩種分組方式：指定組數，或指定每組人數（組數自動取平衡值）。種子可手動輸入；留空時由 app 以 crypto 產生一個 uint32 並顯示在種子欄，核心永不自產種子——決定論契約沿用 lottery-number-picker 釘版的 mulberry32 與種子欄規格。非目標為依能力或屬性分層分組、排除配對（指定誰不能同組）、抽出單一贏家、儲存或分享名單、公證或具法律效力的抽籤。

首個可觀察案例。八人名單按組數 3 分組（種子 42），人數 3/3/2（`basic-count`）。字面資料與預期見 [fixtures.json](fixtures.json)，契約以 [SPEC.md](SPEC.md) 為準。

先完成核心／狀態測試，再交雙語靜態頁、匯出、build/check、同一候選的九面向證據。目標 `tools/group-generator/`，固定分支與 PR 交驗。 [本批原始說明](https://github.com/KYStr/glossquote-labs-home/blob/1ce7ba3c83b35eeb99e2f11e3b3eb9e9c6df72bd/docs/consolidation/2026-11-09/SPEC-AUTHOR-BRIEF.md)
