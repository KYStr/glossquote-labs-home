# 開始：名單比對與合併

狀態：M1 本機版本 0.1.0-m1 已實作、通過自驗並凍結，等待主代理獨立驗收。threadId 為 01a133a5-8a46-7051-8802-1c189f457b30，hostId=local；指定配置由 DISPATCH.json 記錄已被 create_thread 接受，backend identity 仍未確認。

## 本次可執行目標

只完成 M1/T00：在本資料夾建立可離線使用的雙語靜態 MVP，實作兩份名單的穩定去重、集合比較、合併、純文字複製與嚴格輸入上限；完成文件所列 Node.js 24 測試、check、build 和真瀏覽器主要流程。每筆輸入只在目前頁面記憶體中處理。任何結果都不得在輸入或選項變更後繼續顯示。

功能名稱「名單比對與合併」，要求的模型為 gpt-6.1-sol、推理強度 max。這是要求值，不是可驗證的執行時模型身份。對話 ID 與配置接受狀態已依主代理建立的 DISPATCH.json 更新，不依實作者自述推定 backend。

## 先讀

依序讀 [AGENTS.md](AGENTS.md)、[TASK-ENTRY.md](TASK-ENTRY.md)、[PRODUCT.md](PRODUCT.md)、[TECHNICAL.md](TECHNICAL.md)、[UX-SEO.md](UX-SEO.md)、[ACCEPTANCE.md](ACCEPTANCE.md)、[TASKS.md](TASKS.md) 及 docs 下全部文件。此資料夾規格是產品需求來源；不得依檔名猜功能。

## M1 範圍與完成條件

範圍、允許路徑、命令、停止條件以 [TASKS.md](TASKS.md) 的 M1/T00 為準。核心比較必須逐筆符合 TECHNICAL 的穩定順序、比對鍵、同一側重複計數和空集合定義。至少完成 ACCEPTANCE 的 25 個 A 案例與中英文 B 流程。

M1 不是 GitHub 發布或正式部署授權。自驗命令皆 exit 0；A1–A43、雙語真 Edge 主要流程與 320px 已有證據，能力缺口保留人工 NOT_RUN。固定版本、摘要及範圍證據見 HANDOFF.md。只有主代理獨立驗收並正式放行後才開始 M2；不可自行開始 M2 或 M3。
