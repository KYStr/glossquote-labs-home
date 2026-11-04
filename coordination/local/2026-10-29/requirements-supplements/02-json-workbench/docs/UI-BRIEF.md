# JSON 工作畫布

2026-10-10，Product App 模式。使用者貼入設定片段或 API 假資料，想確認嚴格語法並取得保留原文字面、可讀的 JSON。成功是來源仍在、唯讀結果可取得；內容在當次頁面記憶體，清除與取消可控。

桌面：
```text
GlossQuote-Labs / JSON                            語言
JSON 檢查與排版
原始數字與字串寫法保留；重複鍵會停止處理。
來源（可編輯）                 結果（唯讀）
[                            ] [                         ]
[                            ] [                         ]
模式／檢查／取消／全部清除       複製／下載
固定摘要與錯誤位置
操作方式／完整上限／FAQ
```

手機：來源 → 排版模式 → 檢查／取消／清除 → 摘要 → 結果 → 匯出；說明跟隨。DOM 鍵盤順序相同，desktop 用 grid 配置結果於右側。來源與結果構成最大連續區域；標籤用 UI 字、只有 JSON 用等寬字。無 rail、無 inspector（此任務沒有需隱藏的上下文功能）。

顏色沿用 paper #f3f0e8、ink #111410、surface #ffffff、acid #c8f56a、separator #b8bbb2、control #60645c；酸綠只強調目前主操作。系統 Segoe UI 與 Cascadia Mono fallback，無字型下載。44px 控制、原生 radio、雙層 focus、48rem 堆疊、75rem gutter、無裝飾動畫。

固定狀態包含 idle／dirty／running／success／error／取消／逾時／不支援。取消僅 running 可用；清除永遠可用；檢查後才啟用匯出。錯誤以固定訊息與行欄／UTF-16 offset 呈現，不回顯原文，aria-describedby 連來源。無帳號與部分結果，因此 auth-loss／partial-data 不適用；剪貼簿拒絕保留結果供手動複製。

實際瀏覽器結果見 VALIDATION 與 HANDOFF，未做過的能力不宣稱已驗證。
