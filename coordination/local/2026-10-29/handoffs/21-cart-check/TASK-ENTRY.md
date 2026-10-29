# 任務單：折扣與免運試算 M1/T00

任務 ID：CART-CHECK-M1-T00。狀態：M1_LOCAL_FROZEN，等待主代理獨立驗收與 M2 正式放行。

2026-10-13 主代理允許精確文案釐清：ACCEPTANCE A7/A22 明寫無逗號原始輸入字串；排版千分位不代表 grammar 可接受逗號。所有超限輸入保留完整 raw draft，由核心回報錯誤，不以 input maxlength 無聲截短成合法資料。計算語義與範圍不變。

## 具體工作

實作本機試算，回答加購方案納入商品成本、折扣和運費後的實付差額。最多 30 個購物項目，價格與數量有界；折扣只支援全籃百分比及固定折價券；免運門檻由使用者選折前或折後金額。

要求模型配置 gpt-6.1-sol / max。工具可接受請求才可記錄 requested；backend identity 必須獨立證據確認，否則 not-confirmed。

## 精確示例

以下皆使用同一未指定幣別。基準小計 900.00、門檻 1,000.00、運費 80.00、無折扣：原實付 980.00。加購 100.00 後商品合計 1,000.00，免運，實付 1,000.00，差額是多花 20.00；不得稱省 80.00。加購 50.00 後仍未達門檻，實付 1,030.00，差額多花 50.00。

## 修改/驗收

只動 TASKS.md M1 allowed paths，依 TECHNICAL.md 和 ACCEPTANCE.md 精確 oracle。報告所有實際變更、測試命令及結果、瀏覽器證據、NOT_RUN、風險、配置確認限制。不可 M1 自行推 public repo、部署或改首頁。

## 2026-10-13 M1 結果

新增 pure BigInt 計算、精確 schema 驗證、雙語靜態 UI、全表報告、revision/request-id copy 防 stale、零依賴 allowlist build/check/loopback preview 和離線 fake fixtures。44/44 Node 測試、npm run check、npm run build exit 0；兩語 900/1000/80 加購100、50，以及折扣、threshold、錯誤焦點、320px、鍵盤、清除／離開／reload流程都有真瀏覽器證據。超限 raw draft 由核心回錯、不截短。

preview PID 54448，127.0.0.1:4201；未停止其他程序。完整 guard Snapshots 前後一致。固定 code/runtime/dist digests、commands/exits、browser-observations、manual NOT_RUN、actual file inventory 都在 ../../.runs/cart-check/m1-2026-10-13-t00/ 與 HANDOFF.md。source、hosting、homepage、external review 尚未執行；完整目標保持 active。
