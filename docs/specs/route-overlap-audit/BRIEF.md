# 路由樣式交疊檢查 / Route Pattern Overlap Audit — BRIEF

**文件草案，產品檢查 NOT_RUN** · `spec-route-overlap-audit-20261109`

API 維護者新增一條靜態或參數路由前，想找同一方法下可能同時匹配的既有樣式，拿到實際可複算的 path witness。

MVP 範圍。支援明示且有限的 pathname 語法及 method，相同方法每一對交集給 witness。排除實際路由器 precedence、隱式 HEAD、查詢串、URL host、百分比解碼、一般 regex、optional／重複 params、發送請求或套用路由。

首個可觀察案例。三個 GET 交疊，POST 不計（`params-and-tail`）。字面資料與預期見 [fixtures.json](fixtures.json)，契約以 [SPEC.md](SPEC.md) 為準。

先完成核心／狀態測試，再交雙語靜態頁、匯出、build/check、同一候選的九面向證據。目標 `tools/route-overlap-audit/`，固定分支與 PR 交驗。 [本批原始說明](https://github.com/KYStr/glossquote-labs-home/blob/1ce7ba3c83b35eeb99e2f11e3b3eb9e9c6df72bd/docs/consolidation/2026-11-09/SPEC-AUTHOR-BRIEF.md)
