# 課程入退紀錄出席核對 / Session Attendance Reconcile

研究 brief，2026-11-11。建議 slug `session-attendance-reconcile`。

## 目標與使用情境

線上讀書會的課務協助者手上有報名表和已匯出的進出紀錄。有人提早測試、斷線回來，或手機和筆電同時登入；直接加各段時間會把部分時段算兩次，也看不到名單中沒有紀錄的人。協助者在桌面核對實際上課起訖，選擇紀錄欄位，把每個代碼在上課期間的去重秒數與待查情況一次整理好。

輸出一份每人一列的可下載 CSV，報名名單全部列出，另帶未對上的登入代碼。畫面區分已達所設門檻、在期間內有紀錄但未達、無原始紀錄、紀錄全在期間之外及不在名單。資料只反映輸入的連線區段，主辦人可自行核對學員身分與參與情況。

## 替代方案與差異

- Teams 提供會議出席 CSV，組織者可下載各次會議。Zoom 的 Participants 報告提供加入、離開及個別時長，也能整理重複項。若只看平台的既有會議摘要，這條路直接。需要依事後確認的上課區間裁切，再對接另一份報名名單時，仍須對鍵、合併交疊區段、逐人核對。 [Microsoft Teams 出席報告](https://support.microsoft.com/en-gb/teams/meetings/manage-meeting-attendance-reports-in-microsoft-teams?nochrome=true) · [Zoom 會議及參與者報告](https://support.zoom.com/hc/en/article?id=zm_kb&sysparm_article=KB0073594)
- 可用試算表按 ID 排序，再逐段扣重疊、找出缺紀錄的報名者。單一帳號少量區段容易手核；批次斷線與兩裝置重疊時，本案將規則及例外固定在同一報告。原始明細可先另存為乾淨 CSV 再選欄，特定平台的多段報表格式不列入支援承諾。
- Labs 工時加總接受手填民用時間、總休息分鐘及跨日選項。任兩列重疊會拒整批，輸出按日起算的工時。本案以報名鍵分組，先裁到共同上課時段，再有意合併重疊並留下名單差異。 [work-hours PRODUCT.md](https://github.com/KYStr/glossquote-labs-work-hours/blob/774f4b23a0557bdca79526a6ebd4bf3593299aa6/PRODUCT.md)
- Labs 多軌議程衝突檢查對同日房間、講者的場次做 pair 檢查和轉場警告，輸出衝突清單。本案的來源是實際進出資料和報名者，結果是每人覆蓋秒數與名單差異。 [agenda-conflicts 固定 SPEC.md](https://github.com/KYStr/glossquote-labs-home/blob/be197ea30d909b1353e7f77bdf16b1811ac41f71/coordination/local/2026-10-29/specs/61-agenda-conflicts/SPEC.md)
- Labs 數值區間覆蓋檢查接受一個數值域和一組連續區段，定位全域缺口和覆蓋深度，域外端點報錯。本案對名單中每個 ID 分別計算，預期有課前、課後紀錄並裁切。 [range-coverage-audit 固定 SPEC.md](https://github.com/KYStr/glossquote-labs-home/blob/a5e7356dae36d2aac3db068352a916d76c7594c3/docs/specs/range-coverage-audit/SPEC.md)

## 範圍與流程

1. 匯入精簡報名 CSV、進出明細 CSV。選取紀錄的識別、加入、離開欄。欄位旁顯示原始時間樣本和明確接受格式。初次可載入假名單及假進出紀錄。
2. 設定上課開始、結束、門檻分鐘和時戳格式。主按鈕「核對出席紀錄」。如果有解析或 ID 錯誤，停在可改的輸入與記錄位置，保留草稿。
3. 結果主區顯示報名者及不在名單的代碼、秒數、狀態與來源明細數；點列可查原始 record 位置。用文字狀態篩選，下載同一批完整 CSV。桌面結果表佔主區；手機顯示狀態切換，完整表可局部捲動。
4. 首版範圍之外含從會議帳號取數、判定身份、關聯相似姓名、發出通知、出勤證明、勞動或薪資紀錄、課程成績、等待室／旁聽角色推斷、多次課程彙總。使用者準備匯入的明細須是實際已進入會議的區段。

## 輸入、輸出與字面案例

- 報名表與進出表各 ≤1 MiB，採 UTF-8 逗號 CSV，選配一個檔首 BOM、LF/CRLF，支援引用欄及引號轉義。報名表精確表頭 `participant_id`，1–1,000 列，識別碼唯一。進出表 3–24 個唯一非空表頭、0–5,000 筆，選三個不同欄作識別、加入、離開。其餘欄不進結果。
- 識別碼 1–128 ASCII 字元，首字元為字母或數字，其後限字母、數字、`.`、`_`、`@`、`+`、`-`。逐字比對，大小寫和前導零保留。可先使用報名代碼；若用帳號識別字串，匯出會包含原值。
- 全工作選一種時間文法。預設嚴格 `YYYY-MM-DDTHH:mm:ssZ` 或尾綴 `±HH:mm`。另一種是明確選取「共用時差」，使用 `YYYY-MM-DD HH:mm:ss` 加使用者輸入的同一 `±HH:mm`；界面提示來源若有不同時差，須改用逐列含時差。時間偏移 ≤14:00，拒絕 RFC 3339 中表示未知本地時差的 `-00:00`。日期 2000–2099 嚴格 Gregorian，分秒 00–59，時 00–23。拒絕跳秒、日期進位、自動猜測裝置時區、空起訖及 `leave <= join`。 [RFC 3339](https://www.rfc-editor.org/rfc/rfc3339)
- 同一次課程視窗長 60–43,200 秒，門檻為 1–720 ASCII 整分鐘，預設 30，且 `門檻 × 60 ≤ 視窗秒數`。調整課程後若門檻太長，提示使用者調整。整份來源合法後才計算，避免把壞紀錄當成無紀錄。
- `session-attendance.csv` UTF-8 無 BOM、CRLF、末列無 CRLF、≤4 MiB。欄為 `participant_id,present_seconds,log_records,status`，報名列保持來源順序，未對上的代碼按第一次出現順序接在後面。門檻判定用整數秒，無四捨五入。每個成功產出的原始 log record 只計到一個識別碼的 `log_records`；合法重複紀錄仍計入筆數，覆蓋秒數去重。

課程為 `2026-11-11T01:00:00Z` 到 `2026-11-11T02:00:00Z`，門檻 45 分鐘。報名表如下。

```csv
participant_id
P01
P02
P03
P04
```

進出明細三欄如下，選 `ID,Joined,Left`。

```csv
ID,Joined,Left
P01,2026-11-11T00:50:00Z,2026-11-11T01:25:00Z
P01,2026-11-11T01:20:00Z,2026-11-11T01:40:00Z
P01,2026-11-11T01:45:00Z,2026-11-11T02:10:00Z
P02,2026-11-11T01:30:00Z,2026-11-11T01:59:59Z
P04,2026-11-11T00:50:00Z,2026-11-11T01:00:00Z
X01,2026-11-11T01:10:00Z,2026-11-11T01:12:00Z
```

預期下載內容如下。

```csv
participant_id,present_seconds,log_records,status
P01,3300,3,meets_threshold
P02,1799,1,below_threshold
P03,0,0,no_log
P04,0,1,outside_window
X01,120,1,not_in_roster
```

## 演算法、狀態、資料生命週期及依賴

日期先解析民用年月日與時分秒，核對回讀，再把指定時差換成 UTC 整數秒。以 `Map` 依精確 ID 分組，對各列和課程視窗做 `max(start)` 與 `min(end)` 的半開交集，捨去空交集。逐組按 clipped start、end、來源列排序，累計區間聯集秒數。相接區間可合併而長度不變。保留來源位置供畫面核對。無紀錄和零交集分開；未對上名單列只標 `not_in_roster`，即使秒數超過門檻。

來源選擇、欄位映射、上課設定一改就失效結果和下載。Worker 處理解析與整理，忙碌顯示實際階段及取消。取消保留草稿、終止工作、丟棄延遲訊息。清除、語言連結、pagehide 與 BFCache 返回清檔案、資料列、報告及 Blob URL。使用者點下載才產檔；匯出前可看到報告含 ID 和時間摘要。

依賴原生 File、TextDecoder、Worker、Blob、嚴格 CSV 及整數日期核心。靜態頁載入後可離線工作，沒有登入、儲存、帳號權限或資料網路請求。保留受支援的兩種時間文法與欄位映射，避免維護平台匯出格式和地區時間猜測。

## 語言、SEO 與驗證

繁中標題「課程入退紀錄出席核對」，英文「Session Attendance Reconcile」。描述「合併重疊登入區段、比對報名名單、下載有效時段秒數」，英文對應「Reconcile a roster with join and leave logs, merge overlaps, and export time within a session」。兩語靜態入口、lang/canonical/hreflang、同語首頁及預覽 noindex。機器欄位不隨語言改。

| 案例 | 獨立預期 |
| --- | --- |
| 上述例 | P01 3300 秒，P02 1799 秒，P03 `no_log`，P04 `outside_window`，X01 120 秒且未對上。 |
| P01 一筆 `09:00:00+08:00` 至 `09:45:00+08:00`，日期同上 | 2700 秒，恰達門檻。 |
| 同一人兩筆完全相同的 01:00–01:30 | 1800 秒、log_records 2；時間不重複。 |
| 把 P02 的結束寫成 `2026-02-30T01:59:59Z` | 時間驗證錯，指出表列及欄位，無部分匯出。 |
| 名單 `001`，紀錄 `1` | 001 為 `no_log`，1 為 `not_in_roster`，保留原值。 |
| 進出表只有表頭 | 所有報名者列為 `no_log`，可下載。 |
| 先得到有效報告，再改視窗並取消新工作 | 立即停用舊報告；晚到訊息不能復活，保留新視窗。 |

九面向預計採樣 functionality（區間裁切、ID 對照、完整 CSV）、boundaries（解析錯、跨時差、相接與取消）、privacy（Network/Storage 與名單最小欄位）、security（CSV 與 DOM 字串、資料界線和 CSP）、usability（欄位映射、報表交接及定位）、accessibility（鍵盤、焦點、320 CSS px、200% zoom）、localization-seo（雙語及同語首頁）、toolchain-provenance（離線重建與固定 head）、compatibility（隔離瀏覽器與代表性裝置的匯入／下載）。產品檢查皆待執行。

## 接續

主對話確認仍無重複的登記及 PR 後，可發布至 `docs/specs/session-attendance-reconcile/BRIEF.md`。正式承接者先補時間文法、來源位置、上限和下載字面案例，再補 SPEC、fixtures 與作者自查交非作者核對。產品預定 `tools/session-attendance-reconcile/`。
