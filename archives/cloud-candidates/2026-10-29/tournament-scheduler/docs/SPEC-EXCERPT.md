# Preserved specification excerpt

Original file: `README.md`; original SHA-256: `5186246a08453e5dfc679334ac171e483ee17188800264a309124d09d26d6fac`.
Included lines: 5–22; unrelated operational history is excluded.
This is historical specification evidence, not a new completeness review or acceptance.

---

## 短規格（實作前定案）

依 home `26525d5f6380915ea95dde879dec769442db0d95` 的原始 `tournament-scheduler` draft：**2–32 隊；單／雙循環、輪空、每隊賽程**。catalog 原文見 `qa/catalog-entry.json`，不改動原 catalog。

- 每行一隊；CRLF/CR 視為 LF；JS trim 修剪兩端；忽略空白行，告知忽略行數。原稿最多 8192 UTF-16 units；每隊最多 64 Unicode code points。拒絕內部控制碼、雙向控制碼、分隔符和無配對 surrogate，不偷偷截斷。
- 同名保留為獨立隊伍，以輸入順序 #1…#32 識別。名稱只能純文字；不作 HTML、網址或檔名。
- 使用決定性的 circle 排法，不讀亂數、時間或時區。偶數 N 單循環 N−1 輪，每輪 N/2 場；奇數 N 共 N 輪，每輪 (N−1)/2 場加一輪空。每對隊伍恰遇一次，每隊單循環恰 N−1 場，奇數每隊輪空一次。
- 雙循環接續完整第二段；第二段每輪與第一段同序，配對左右順序相反，每對恰遇兩次、奇數每隊輪空兩次。左右不是已分配的主客場，沒有公平性保證。
- 顯示逐輪配對／輪空、每隊逐輪對手／輪空、隊數／輪數／總場數；可明確複製或下載同語言 TXT（UTF-8、無 BOM、無末尾換行、固定安全檔名）。
- 不排日期、時間、場地、裁判、資源或種子；不記比分、淘汰賽、排名、投注、帳戶、通知、後端、資料保存或分享連結。不宣稱場地、時段、休息或主客場最佳公平配置。

## 狀態與安全

繁中 `/index.html`、英文 `/en/index.html`，同語言首頁連結。切語言旁明示草稿清除。所有模型輸入 `input`/`change`/IME 組字立即撤銷結果及新的複製／下載；錯誤亦不留半成品。清除前有確認對話框，取消/Escape 原樣保留並回焦點。pagehide 清 DOM/模型/非同步代次/下載 URL；persisted pageshow 恢復空白。

只在本頁記憶體計算；沒有 API、遙測、外部字型、套件、storage、cookie、service worker 或使用者內容 URL。首次取得靜態資產仍需要網路。安全輸出僅 `textContent`/`value`。Clipboard 只寫不讀；拒絕可手選報告；舊 Promise 所有完成路徑均不得改較新畫面。已交給系統的寫入／下載不可由頁面撤回。

一次最多一個未回收下載 URL，保留 60 秒後回收；期間禁用再下載，換輸入不提前撤銷已開始的下載；pagehide 立即回收。來源停用所有輸入與提交；先註冊 preventDefault 再啟用，沒有原生表單欄位 name；CSP form-action none 是第二層。
