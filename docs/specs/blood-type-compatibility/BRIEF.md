# 血型相容查詢 / Blood Type Compatibility — BRIEF

**文件草案，產品檢查 NOT_RUN** · `spec-blood-type-compatibility-20261109`

一位使用者在醫院陪家人，手邊只有手機。醫師說家人可能需要輸血，他想在和醫護溝通前，先弄清自己 A 型 Rh 陽性能不能捐紅血球給 O 型 Rh 陽性的家人，也想驗證在捐血站聽到的說法——「O 型 Rh 陰性是紅血球萬用捐贈者」到了血漿是不是正好反過來。他選一個血型，立刻看到紅血球與血漿各自的可捐給、可接受自名單與萬用徽章；或直接輸入捐贈者與受血者兩人，逐產品得到相容／不相容。畫面同時固定顯示教育參考提醒：實際輸血以血庫交叉配血為準。

MVP 範圍。單一血型模式（四份名單＋徽章）與配對模式（紅血球、血漿各一判定）；紅血球 8×8 相容矩陣與血漿 ABO 4×4 矩陣均以字面資料寫死於規格，接受名單由同一矩陣轉置推導，不另立第二份表。非目標為各血型人口比例、血小板／全血／冷凍沉澱品、捐血資格判定（年齡、體重、捐血間隔等）、稀有血調度，以及標準相容表以外的任何醫療建議。

首個可觀察案例。O 型 Rh 陰性萬用捐贈者（`single-o-negative-universal-donor`）。字面資料與預期見 [fixtures.json](fixtures.json)，契約以 [SPEC.md](SPEC.md) 為準。

先完成核心／狀態測試，再交雙語靜態頁、匯出、build/check、同一候選的九面向證據。目標 `tools/blood-type-compatibility/`，固定分支與 PR 交驗。 [本組固定任務說明](https://github.com/KYStr/glossquote-labs-home/blob/1ce7ba3c83b35eeb99e2f11e3b3eb9e9c6df72bd/docs/consolidation/2026-11-09/SPEC-AUTHOR-BRIEF.md)
