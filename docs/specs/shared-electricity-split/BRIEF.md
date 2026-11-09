# 分租電費分攤 / Shared Electricity Split — BRIEF

**文件草案，產品檢查 NOT_RUN** · `spec-shared-electricity-split-20261109`

分租公寓的房客阿哲住在台中一間四房分租公寓，台電帳單每期寄到他這裡。他用手機拍下總電表和各房分電表本期的起訖度數，要在群組公布每房應付金額。卡點有兩個：走廊燈、洗衣機與熱水器的公共用電不在任何一間房的分電表上，沒攤進去就不公平；自己用試算表按度數比例分，金額四捨五入後加起來總是跟帳單差幾元，大家對不上帳。最後要拿到的是一張分攤表：每房自己的度數、公共用電均分額、占比與金額，金額加總恰好等於帳單總額，可以直接貼到群組。

MVP 範圍。總電費為已知整數元；2–10 間房，各房分電表起訖度數（最多一位小數）；有總表度數時，公共用電（總表 − 各房合計）先平均分給每房，再併入各房權重按比例分攤；沒有總表度數時純按各房度數比例分攤。金額採最大餘數法，保證各房金額加總恰好等於總電費，同餘數時依輸入順序。非目標為依台電級距或夏月費率反算電費本身（那是 electricity-cost-calculator 的工作）、保存歷期帳單、多人同步編輯、催繳或轉帳。

首個可觀察案例。純比例分攤（`proportional-basic`）。字面資料與預期見 [fixtures.json](fixtures.json)，契約以 [SPEC.md](SPEC.md) 為準。

先完成核心／狀態測試，再交雙語靜態頁、匯出、build/check、同一候選的九面向證據。目標 `tools/shared-electricity-split/`，固定分支與 PR 交驗。 [本批原始說明](https://github.com/KYStr/glossquote-labs-home/blob/1ce7ba3c83b35eeb99e2f11e3b3eb9e9c6df72bd/docs/consolidation/2026-11-09/SPEC-AUTHOR-BRIEF.md)
