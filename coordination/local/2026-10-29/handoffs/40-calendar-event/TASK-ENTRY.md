# NEW22-40-M1 任務紀錄

2026-10-22（Asia/Taipei）。原功能對話 `01a1632e-8b28-7e22-9809-a72b8b31aee2`。requested gpt-6.1-sol/max，backend 未獨立確認。

完成點：雙語本地候選、Node24 零依賴的語義測試／工具鏈／loopback HTTP 通過、來源 bytes/SHA-256 與真實未驗表，交主代理獨立驗收；不公開／部署。

- T00 PASS：已讀 START-HERE、AGENTS、README、PRODUCT、TECHNICAL、UX-SEO、ACCEPTANCE、TASKS、docs 與根安全／產品／完整設計契約。初始 8 檔 check/build exit 0。
- T01 PASS：嚴格日期／文字／schema、限定十區域、候選、DST、全天／UTC 範圍；13 組。
- T02 PASS：ICS、escaping、octet 折行、metadata、手寫 fixture 與獨立 reader；合計 19 組。
- T03 已實作：雙語表單／摘要、模式投影、歧義、Blob/revision、clear/pagehide/BFCache；6 組離線控制器 PASS。真 browser NOT_RUN_USER_FOCUS_INCIDENT。
- T04 PASS（CLI/HTTP）：最終 32 組、check/build exit 0；閉合輸出／反例、noindex、Host/raw-path/MIME/headers；環境 guard 前後一致。
- T05 PASS（交接）：[HANDOFF](HANDOFF.md)、[來源 manifest](evidence/m1/source-manifest.json)、命令／exit／hash／未驗紀錄。M1 待主代理驗收。

只修改 package.json、.gitignore、public/**、scripts/**、test/**、dist/**、HANDOFF.md、TASK-ENTRY.md、evidence/m1/**。未委派／另開 chat／改父專案、兄弟、首頁、看板、規格；原契約逐 byte 比對 unchanged。舊 HANDOFF 與 T00 build 另存證據，不丟失歷史。

## 介面決策

使用者把單次課程、聚會、預約或跨時區活動帶到自己的日曆。工作物件為事件，成功是確認正確時間後取得 ICS；主要風險為時區／全天日數錯誤。Product App 模式，家族 paper/ink/acid、系統字體、平面分隔，沒有新套件／字型／圖片／追蹤或裝飾動畫。

持續可見：標題、地點／說明、定時／全天、日期與時區。相鄰：DST 次序、摘要、下載。進階：可展開 ICS 原文。ready 時下載為主要動作，修改後返回預覽。

```text
桌面：品牌／同語首頁／語言 → H1／說明
      活動、類型、起訖、時區（主欄） | 摘要、下載、展開 ICS
      預覽／清除                    | 
      使用步驟／FAQ

手機：品牌／導覽 → H1 → 活動 → 類型 → 起訖逐欄 → 時區
      → 預覽／清除 → 摘要／下載／ICS → 說明／FAQ
```

空白、editing、invalid、unsupported、ready 有文字。計算同步有界，沒有假進度／取消；無 auth／遠端工作，所以 auth-loss/timeout 不適用。長文字換行，raw ICS 內部捲動。320px／200%／keyboard／讀屏／渲染／screenshot 未跑，不由此草圖宣稱 PASS。

frontend-design 技能只協助版面組織，優先遵循既有契約，沒有執行外部 hook／下載或第二套設計流程。

## 例行假設與狀態

UI 經 projectDraft 把完整表單投影為目前 union schema，模式切換保留對方草稿；隱藏欄位不傳核心。一般欄位／時區改動清兩端歧義選擇；選次序本身只失效舊結果，不清剛選值。

正規化前有字串 hard cap；標題 trim 後 1–120 碼點，HTML maxlength 允許 emoji 的 UTF-16 長度。檔名固定；下載能力不足留摘要／ICS 預覽，不宣稱已儲存。

未執行 browser/native/CUA/焦點/IME/clipboard/dialog/screenshot 或隔離實驗。無常駐 dev 程序；HTTP listener 只在測試同程序建立、關閉。

已實際建立無 token budget 的產品 Goal，涵蓋 M1–M4；狀態 active。M2 未放行，本輪在 M1 停止，不標整個產品完成。
