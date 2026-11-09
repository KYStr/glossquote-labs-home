# 活動流程時間表（Event Timeline）

> 2026-10-16：M1 已通過主代理獨立驗收，M2 正式候選已實作。94 個自動案例（M1 88＋發布 6）及建置／來源白名單 gates 已驗；人工未驗項目見 HANDOFF.md。此候選尚未正式部署或完成外部驗收。

## 使用者與工作

主持人、老師或會議召集人要安排一連串活動時，常在增減某一段後重新手算後續時刻。這個工具把開始時間和逐段分鐘數排成時間表，指出跨午夜的項目，並在提供有效目標結束時間時顯示提早或超時分鐘。

## MVP

輸入一個 24 小時制 ASCII 開始時間、1–60 個有名稱及整分鐘長度的活動列，按「排出時間表」後得到逐列起訖時刻、跨日標記、總長、結束時刻及可選目標差異；結果可由使用者自行複製或下載成 UTF-8 純文字。

活動順序由列表決定；以「上移」和「下移」按鈕操作，滑鼠、鍵盤和觸控都能重新排序。休息就是一列普通活動。每次編輯都立即撤銷舊結果，避免將過期時間表複製或下載。

## 產品識別與環境

- 顯示名稱：GlossQuote Event Timeline／GlossQuote 活動時間表。
- 子專案 slug：`event-timeline`；本規格資料夾：`25-event-timeline`。
- MVP 網址決策：`https://agenda.glossquote.com`。`time.glossquote.com` 不使用。
- Cloudflare Worker 名稱：`glossquote-event-timeline`。
- 本機開發：`npm run dev` 預設使用 `127.0.0.1:4205`，只綁 loopback，提供 preview 頁面。
- 語言頁：繁中 `/index.html`（`lang="zh-Hant"`），英文 `/en/index.html`（`lang="en"`）。兩頁彼此連結；語言切換會離開目前頁並清除草稿，切換前明確提示，不承諾保留內容。
- 預定獨立公開原始碼 repo：`KYStr/glossquote-labs-event-timeline`。主代理明確放行 M2 後，原功能對話建立正式工具鏈、檢查正式候選，並以固定 ZIP 流程發布到 public GitHub。
- 正式產品是靜態瀏覽器工具。執行時沒有套件依賴；Node.js 24 或更新版本只用於本機開發、檢查、建置和 `node:test`。
- 主要使用情境包含桌機、320 CSS px 窄螢幕、200% 文字／頁面縮放、行動虛擬鍵盤與中文 IME。首次載入仍需能取得靜態頁面；不宣稱首次離線可開啟。

## 價值與範圍

單一輸入流程計算器，沒有帳號、伺服器計算、日期或時區。算式使用整數分鐘，輸入在目前頁面的記憶體中。編輯、明確清除或離開頁面時撤銷結果；不保存草稿。

可選的純文字報告只在明確點選「複製報告」或「下載 TXT」後交給瀏覽器。報告使用使用者目前所選介面語言，不含 BOM、末尾換行或額外的自動寄送功能。

## 難度與依賴

難度：小型、以嚴格輸入驗證和可達性為主要風險。計算是 O(列數)，列數最多 60。瀏覽器端使用原生 HTML、CSS、ESM、DOM、Clipboard API（可用時）、Blob 和 object URL；無 framework、圖示套件、外部字型、CDN、後端、遙測或外部 API。Clipboard API 不可用或被拒絕時，唯讀報告仍可手動選取。

## 非目標

- 不處理日期、時區、夏令時間、地點或真正的多日／週期行程。
- 不猜測開始日或目標是否在次日；使用者必須明確勾選目標次日。
- 不支援小數分鐘、秒、24:00 表示法、循環活動、日曆、通知、提醒或多人協作。
- 不提供列拖曳作為唯一或必要的排序方式；本版只要求可鍵盤操作的上移／下移。
- 不提供列印最佳化；不放列印控制。
- 不保存、匯入、同步或分享草稿，不把任何資料放進 URL、history state、瀏覽器儲存或網路要求。
- 不提供雲端計算、帳號、付費服務或隱藏網路流量。

## 文件讀取順序

1. `START-HERE.md`、`AGENTS.md`、`TASK-ENTRY.md` 和 `HANDOFF.md`：由主代理提供的專案入口、任務與狀態。
2. `PRODUCT.md`：產品行為與固定錯誤優先序。
3. `TECHNICAL.md`：資料結構、純函式與計算 oracle。
4. `UX-SEO.md`：雙語介面、線框、狀態文字及正式 SEO 輸出。
5. `ACCEPTANCE.md`：核心精確案例與人工瀏覽器案例。
6. `TASKS.md`：M1 本機實作順序與路徑界線。
7. 專案共用規則：`docs/BRAND.md`、`docs/ENGINEERING.md`、`docs/PRIVACY-SECURITY.md`、`docs/DESIGN-SYSTEM.md`、`docs/RELEASE.md`。其中較嚴格的規則優先。

此文件中的連結只指向子專案根目錄或其 `docs/` 子目錄的共用文件；不以其他工具資料夾或機器絕對路徑作為規格依賴。

## 交付界線

本機使用 Node.js 24+，不需安裝依賴。依序執行 `npm test`、`npm run check`、`npm run build`、`npm run build:production`、`npm run check:production`、`npm run release:check`。`npm run dev` 提供 127.0.0.1:4205 的 noindex preview；`npm run preview:production` 提供 127.0.0.1:5205 的正式候選 HTTP model。

M1 `dist/` 保持 noindex；M2 `dist-production/` 才有正式 canonical/hreflang、OG、固定 WebApplication JSON-LD、精確 CSP hashes、robots 和兩 URL sitemap。正式候選預設 noindex response header；兩個canonical路徑用 `! X-Robots-Tag` 移除繼承值，由HTML meta的index,follow指示索引，避免Cloudflare合併同名header留下noindex。未知404維持noindex。robots允許兩頁及渲染必要的/js/、/styles/，不放行來源檔。全站CSP同時列出兩頁各自固定JSON-LD bytes的精確SHA-256 hashes，不開放inline程式或外部來源。

獨立來源目標是 `KYStr/glossquote-labs-event-timeline`，固定 commit ZIP 與逐檔 manifest 由發布流程記錄。來源公開、正式 hosting、外部驗收是分開的里程碑；M2 不部署，M3 工具及共用首頁由主代理負責。未驗的真機、輔助技術、完整Network/Storage、真BFCache等項目維持 NOT_RUN，不以受控測試替代。
