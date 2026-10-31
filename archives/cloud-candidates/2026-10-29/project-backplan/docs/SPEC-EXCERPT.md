# Preserved specification excerpt

Original file: `README.md`; original SHA-256: `02d4cdf7a493d45363ff7f7ee1508bc6716e59ea333507b5cadabc09bbea1574`.
Included lines: 5–43; unrelated operational history is excluded.
This is historical specification evidence, not a new completeness review or acceptance.

---

以明確截止日、工作星期、排除日期、工作天數及 finish-to-start 依賴，倒推每項任務的最晚開始／完成日期。繁中與英文各有獨立靜態頁。沒有帳號、API、輸入上傳、追蹤或持久儲存。

Work backward from an explicit deadline using workdays and finish-to-start dependencies. Traditional Chinese and English pages are independent static documents. No account, API, input uploads, tracking or persistent storage. The initial static page load still needs a network.

## 範圍與計算契約 / Scope and calculation contract

- 明確公曆日期 `0001-01-01`–`9999-12-31`；零起算 Gregorian ordinal，週一為 0。產品不使用 Date、Intl、Temporal、時區或今天的時鐘。
- 1–50 項任務；每項 1–365 整數工作日。工期包含開始、完成兩個工作日端點。
- 固定任務 ID，刪除任務不重新編號；依賴使用 ID，不使用名稱。報告按 ID 排序，不承諾輸入順序。
- 任務名 1–100 Unicode 碼點；專案名可留空。名稱是單行文字；拒絕 C0/C1、孤立 surrogate、換行及方向控制符，不把文字當 HTML。
- 至少一個工作星期；全任務共用一個日曆。最多 366 個互不重複的排除日期。國定假日不會自動加入。
- 所有末端任務的最晚完成日，為指定截止日當日或之前最近工作日；畫面與報告同時顯示指定、實際截止日。
- 前置任務的最晚完成日，取**所有後繼最晚開始日之前一個工作日**的最早值。最晚開始日再往前算 `duration−1` 個工作日。
- 循環（包括斷開子圖）、自依賴、不存在或重複的依賴、重複 ID、無工作星期、無效日期、錯型別、未知 schema/accessor、日期下溢均拒絕整份結果，不輸出部分排程。
- 不做人力或設備資源平衡、緩衝、成本、時分、跨時區、實際開始日／今天可行性判斷。平行任務容許重疊，最晚日期**不是交付保證**。

English summary: Gregorian years 0001–9999, 1–50 tasks, 1–365 inclusive workdays per task, one shared working calendar, up to 366 unique excluded dates, stable IDs and a DAG of finish-to-start dependencies. Terminal tasks finish on the last workday on/before the deadline. Each predecessor finishes before every successor starts. Invalid input or date underflow rejects the entire plan. Parallel tasks may overlap. No automatic holidays, resource leveling, buffers or real-world feasibility guarantee.

### 固定範例 / Fixed example

Mon–Fri, deadline **2026-11-06**, A=3 workdays → B=2 workdays:

| Task | Latest start | Latest finish |
|---|---|---|
| A | 2026-11-02 | 2026-11-04 |
| B | 2026-11-05 | 2026-11-06 |

Exclude 2026-11-04: A becomes **2026-10-30–2026-11-03**; B is unchanged.

## 隱私與狀態 / Privacy and state

- 來源沒有 fetch/XHR/beacon/WebSocket、分析碼、外部字型、CDN、service worker、storage/cookies、URL/history 資料寫入。
- 任何輸入變更、IME 開始／結束、增刪任務都清除舊結果及複製／下載可用性。IME 尚未完成時不允許計算。
- 清除需確認；取消或 Escape 保留內容並回復發起控制的焦點。
- pagehide、persisted pageshow、背景隱藏、語言切換清原始輸入／模型／舊非同步 token。資料不會因返回而刻意復活。
- 複製只在按鈕手勢後嘗試，promise fulfilled 才顯示成功；拒絕或沒有 API 則選取唯讀文字。舊 promise 的 then/catch/finally 不得改新一輪 DOM、焦點或 busy。不能保證撤回已開始的原生剪貼簿寫入。
- TXT 檔名固定 `project-backplan.txt`、MIME `text/plain;charset=utf-8`；UTF-8 BOM + 唯讀 report 的逐字內容、LF 換行、末尾一個 LF。
- 最多 1 個下載 URL；開始下載後保留 **10 秒** grace，這段期間禁再次下載，輸入／重算／確認清除不提前撤 URL。timer 結束回收；離頁／隱藏立即回收。不能保證撤回已開始的下載或證明 OS 已存檔。
- JS 初始化 fail-closed：fieldset/submit 來源先停用，先安裝原生 submit guard 才啟用，輸入欄位無 `name`。CSP 的 `form-action 'none'` 是第二層。
