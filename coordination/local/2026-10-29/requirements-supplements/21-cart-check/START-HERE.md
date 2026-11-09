# 開始：折扣與免運試算

狀態 M1_LOCAL_FROZEN，等待主代理獨立驗收。原功能對話 threadId=01a133a5-aba2-7112-9171-92dc008f4ce0、hostId=local；要求配置 gpt-6.1-sol/max 已由 create_thread 接受，實際 backend 模型身份未確認。

## M1/T00 範圍

建立中英雙語的本機靜態試算器：使用者輸入購物項目、數量、百分比折扣、固定折價券、運費與可選免運門檻。自動計算原購物籃實付；另可輸入一件/一組的加購價格，依相同規則獨立重算。結果必須把加購成本算入差額，避免只顯示免運額造成誤導。

金額全程用 BigInt cents。百分比折扣先按精確比例 half-up 捨入至分，再扣固定折價券，折後商品金額不低於零，再按明確選擇的折前/折後門檻規則決定運費。費用、折扣上限與公式見 TECHNICAL.md。

要求對話配置 gpt-6.1-sol/max 是配置請求；接受證據為主代理保留的 DISPATCH.json，不能因此宣稱已驗證實際執行模型。

## 閱讀與交付界線

完整閱讀 [AGENTS.md](AGENTS.md)、[TASK-ENTRY.md](TASK-ENTRY.md)、[PRODUCT.md](PRODUCT.md)、[TECHNICAL.md](TECHNICAL.md)、[UX-SEO.md](UX-SEO.md)、[ACCEPTANCE.md](ACCEPTANCE.md)、[TASKS.md](TASKS.md) 和 docs 全部契約。

只做 M1/T00。M1 gate 完成後凍結交主代理獨立驗收；尚未獲 M2 放行時不推 GitHub、不部署、不改首頁。

本機預覽：http://127.0.0.1:4201/index.html 與 /en/index.html。證據：../../.runs/cart-check/m1-2026-10-13-t00/；44/44 自動測試、check/build、必要雙語真瀏覽器流程已通過，保留手動 NOT_RUN 清單。以 HANDOFF.md 和 docs/RELEASE-CANDIDATE.md 作為本輪實際狀態；鎖定規格中的初始狀態文字不是新的 release 證據。
