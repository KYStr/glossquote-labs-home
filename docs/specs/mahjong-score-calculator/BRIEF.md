# 麻將台數計算機 / Mahjong Score Calculator — BRIEF

**文件草案，產品檢查 NOT_RUN** · `spec-mahjong-score-calculator-20261109`

家庭麻將打完一局，四個人圍著桌子口頭算台數：門清自摸到底是 2 台還是 3 台、大三元還能不能再加三元刻、莊家連莊要多算幾台，每次講法都不一樣，最後只好隨便湊個數。玩家用手機把這一局胡牌的牌型與情境逐項勾出來，工具依一份事先講明、固定不變的規則（台灣十六張麻將．一般家庭場慣例）即時列出每一台的明細、自動處理合併與不重複計台，再依底與每台金額算出自摸三家各付多少、放槍誰付多少，截圖就能對帳，不必再爭。

MVP 範圍。單一胡牌的一次計台：固定台數表（牌型、情境、風台、三元刻、花台、槓台、莊家台）、合併與互斥的固定處理順序、可自訂台數的指定項目、台數上限（封頂）、底＋台×每台金額的自摸／放槍付款。非目標為判斷一手實際牌張是否真的成胡、三色同順／三色同刻、天胡／地胡／人和、十三么、七對子、連莊差額分付（莊家台只併入總台）、多局記分與帳本、線上對戰或任何真實金錢交易。

首個可觀察案例。門清自摸合併計 3 台（`menqing-self-draw`）。字面資料與預期見 [fixtures.json](fixtures.json)，契約以 [SPEC.md](SPEC.md) 為準。

先完成核心／狀態測試，再交雙語靜態頁、匯出、build/check、同一候選的九面向證據。目標 `tools/mahjong-score-calculator/`，固定分支與 PR 交驗。 [本批原始說明](https://github.com/KYStr/glossquote-labs-home/blob/1ce7ba3c83b35eeb99e2f11e3b3eb9e9c6df72bd/docs/consolidation/2026-11-09/SPEC-AUTHOR-BRIEF.md)
