# 開始：食譜份量換算

狀態：M1 實作已凍結，等待主代理獨立驗收。threadId=01a133a5-9894-7d41-9759-53e8a218b4be，hostId=local。DISPATCH.json 確認 create_thread 已接受 gpt-6.1-sol / max 的要求配置；backend identity 仍未確認。

## 本次目標

只做 M1/T00：建立可離線的中英文靜態食譜份量換算器。輸入原份數、目標份數及最多 50 個食材列；明確標記「適量」的列保持原文，其餘以 BigInt 精確比例換算，使用最多三位小數、half-up 顯示。每列同時列出原量與換算後量。修改任一輸入即清除舊結果，必須再次按計算。

對話要求配置為 gpt-6.1-sol / max；create_thread 接受要求不代表 backend model 身份已確認。

## 必读文件

讀 [AGENTS.md](AGENTS.md)、[TASK-ENTRY.md](TASK-ENTRY.md)、[PRODUCT.md](PRODUCT.md)、[TECHNICAL.md](TECHNICAL.md)、[UX-SEO.md](UX-SEO.md)、[ACCEPTANCE.md](ACCEPTANCE.md)、[TASKS.md](TASKS.md) 及 docs 下全部契約。若文件文字與本文中的固定例子有疑問，暫停回報主代理，不自行更改算法。

## 完成與階段界線

M1 必須達到所有 A 案例、自動檢查、建置和必要雙語瀏覽器流程。允許人工設備差異列 NOT_RUN，但不可宣稱已測。凍結後交主代理獨立驗收。只有主代理另行放行才能做 GitHub M2；M3 部署和首頁由主代理管理。

2026-10-13：49/49 測試、check/build 與必要雙語真瀏覽器/320px/鍵盤流程已通過。實作所有權已釋出供主驗；不要自行進入 M2。固定版、預覽、證據與尚未測量項目見 HANDOFF.md。若主驗需修正，回本對話與 M1 允許路徑。
