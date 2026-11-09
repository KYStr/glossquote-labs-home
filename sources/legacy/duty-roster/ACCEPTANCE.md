# 驗收契約：輪值排班表

> 所有案例都是未執行的驗收規格。以下 sample 與手算結果不是產品測試通過證據。

## 自動化純函式案例

M1 使用 Node 24 的 node:test 與 fake data，至少維護以下案例。預期值需在測試中手寫，不得由 calculateRoster 或被測輔助函式產生。錯誤物件需精確比對 code/path。每個資料陣列、日期列、成員統計與報告字串都要檢查；不可只核對成功 boolean。

| ID | 輸入/操作 | 精確預期 |
|---|---|---|
| C01 | 2026-10-19..2026-10-23，根 weekdays [1,2,3,4,5]；#1 A 可 [1,3,5]、#2 B 可 [2,4] | 五列依序 #1 A、#2 B、#1 A、#2 B、#1 A；weekday [1,2,3,4,5]；counts [(1,A,3),(2,B,2)]；assigned=5, unassigned=0, total=5。 |
| C02 | 同日期與根 weekdays；A、B 都可 [1,2,3,4,5,6,7] | 指派 #1,#2,#1,#2,#1；counts 3/2。 |
| C03 | 同日期；#1 A 僅可 [1]、#2 B 僅可 [2] | 結果 #1 A、#2 B、未排、未排、未排；最後三列的 number/id/name 全 null；counts 1/1；assigned=2, unassigned=3,total=5；未排日游標保持在 index 0。 |
| C04 | 2026-10-19..2026-10-23；根 weekdays 輸入順序 [5,1]，一位全週可用 | 輸出仍按日期排序為 10-19 weekday 1、10-23 weekday 5；兩端都包含。 |
| C05 | 單日 2024-02-29、根 weekdays [4]、一位全週可用 | 成功 1 日，date=2024-02-29、weekday=4、member number=1。 |
| C06 | 2024-02-28..2024-03-01、根 weekdays [3,4,5]、一位全週可用 | 3 個輪值日依序 02-28 weekday 3、02-29 weekday 4、03-01 weekday 5。 |
| C07 | startRaw=2023-02-29 | {ok:false,error:{code:START_DATE_INVALID,path:/startRaw}}。 |
| C08 | 2024-01-01..2024-12-31，根 weekdays [1,2,3,4,5,6,7]，一位全週可用 | 成功，366 列；第一日 weekday 1、末日 2024-12-31 weekday 2；assigned=366、count=366。 |
| C09 | 2024-01-01..2025-01-01 | {ok:false,error:{code:DATE_SPAN_LIMIT,path:/endRaw}}，不得建立結果。 |
| C10 | 2026-10-19 單日，根 weekdays [2] | {ok:false,error:{code:NO_DUTY_DATES,path:/weekdays}}；不可產生 0 天成功結果。 |
| C11 | root weekdays=[] | {ok:false,error:{code:WEEKDAYS_EMPTY,path:/weekdays}}。 |
| C12 | root weekdays=[1,1] | {ok:false,error:{code:WEEKDAY_DUPLICATE,path:/weekdays/1}}。 |
| C13 | 一位成員 weekdays=[]，日期範圍有五個所選輪值日 | 成功的部分結果：5 日全未排，該成員 count=0，assigned=0、unassigned=5、total=5；不得把空陣列當全週可用或整體 schema error。 |
| C14 | 兩位 id 不同、姓名都為 Kai，2026-10-19..20、兩人皆可全週、根 weekdays=[1,2] | 兩日分別為 personNumber 1 和 2，兩筆 counts 都是 1；buildReport 在每筆結果和統計都出現 Member/成員序號，不可只列兩個 Kai。 |
| C15 | request 加上未知自有欄 extra | {ok:false,error:{code:REQUEST_SCHEMA,path:/}}。 |
| C16 | startRaw 使用 getter 並在 getter 設置 counter | 回 REQUEST_SCHEMA；getter 呼叫 counter 保持 0。 |
| C17 | request 有 symbol own key 或未知 non-enumerable key | REQUEST_SCHEMA，path /。 |
| C18 | root weekdays 是稀疏陣列、帶自訂 own property 或 symbol | WEEKDAYS_SCHEMA，path /weekdays；不得跳過 hole。 |
| C19 | people 非 array、稀疏或帶自訂欄位 | PEOPLE_SCHEMA，path /people。 |
| C20 | person id 含空白/非 ASCII/超 40 字元 | PERSON_ID_INVALID，path /people/0/id。 |
| C21 | 兩人 id 相同、姓名不同 | PERSON_ID_DUPLICATE，path /people/1/id。 |
| C22 | nameRaw 含 LF 或 NUL | PERSON_NAME_CONTROL，path /people/0/nameRaw；錯誤內容不得包含輸入。 |
| C23 | nameRaw 含單獨 high 或 low surrogate | PERSON_NAME_SURROGATE，path /people/0/nameRaw。 |
| C24 | nameRaw 是 80 個有效 emoji surrogate pair，外加首尾空白 | trim 後接受且 code point 長度為 80；報告姓名不含首尾空白。 |
| C25 | nameRaw 是 81 個有效 emoji code point | PERSON_NAME_TOO_LONG，path /people/0/nameRaw。 |
| C26 | 輸入 0 位或 31 位 people | PEOPLE_COUNT，path /people；1 位及 30 位邊界另需成功測試。 |
| C27 | 同時有 start 日期錯誤與 root weekday 錯誤 | 依固定順序回傳 START_DATE_FORMAT 或 START_DATE_INVALID 的 startRaw 錯誤；不得先回 weekday。未知 root key 優先回 REQUEST_SCHEMA。 |
| C28 | zh-TW 對 C03 結果呼叫 buildReport | filename 固定 glossquote-duty-roster.txt；MIME 固定 text/plain;charset=utf-8；text 僅用 LF、無 BOM/末尾 LF；含 10-21/22/23 各自一行「未排」和 #1/#2 成員統計。 |
| C29 | en 對同一結果呼叫 buildReport | 同一固定 filename/MIME/換行限制；含三個獨立 “Unassigned” 日期列及 “Member 1: A”/“Member 2: B” 統計。 |
| C30 | buildReport language 不在 zh-TW/en | {ok:false,error:{code:REPORT_LANGUAGE,path:/lang}}。 |
| C31 | buildReport 收到未知 key/accessor/不一致 totals 的 result | REPORT_SCHEMA；不執行 getter、不輸出部分報告。 |
| C32 | calculateRoster 收到可凍結的普通輸入 | 輸入及其陣列/列完全未突變；輸出具 deterministic insertion/value order。 |

C28 的繁中報告文字精確骨架（下列 [TAB] 各代表單一 U+0009，不是輸出字面字串；行尾不含 LF）：

    GlossQuote Duty Roster
    輪值排班表
    輪值日數：5
    已排：2
    未排：3

    日期[TAB]星期[TAB]輪值人員
    2026-10-19[TAB]週一[TAB]成員 1：A
    2026-10-20[TAB]週二[TAB]成員 2：B
    2026-10-21[TAB]週三[TAB]未排
    2026-10-22[TAB]週四[TAB]未排
    2026-10-23[TAB]週五[TAB]未排

    成員統計
    成員 1：A[TAB]1
    成員 2：B[TAB]1

C29 英文對應文案為 Duty roster / Duty days: 5 / Assigned: 2 / Unassigned: 3；欄名 Date / Weekday / Member；每個缺口為 Unassigned；統計為 Member 1: A / Member 2: B。測試須比對實際 TAB 與 LF code point，不接受上列排版空格代替 TAB。

## 瀏覽器人工案例

以下須在實際瀏覽器分別打開本機 127.0.0.1:4209 的繁中與英文頁面，使用上方假資料；禁止使用真實家庭、學生或客戶資料。每案記錄瀏覽器/版本、OS、視窗尺寸、步驟與實際結果。原生 clipboard/download、真機和真 BFCache 不可用 mock 或 DOM dispatch 冒充。完整 Network/Storage 沒有實際觀測工具時記 NOT_RUN。

| ID | 操作 | 通過條件 |
|---|---|---|
| B01 | 首次打開頁面、JS 啟動前後檢查表單 | HTML 初始 controls disabled、沒有輸入 name 欄位；JS 綁定事件後才啟用。JS 不可用時明示無法使用。表單沒有資料 action，Enter 不造成資料導覽/送出；submit listener 第一個操作 preventDefault。 |
| B02 | 日期欄用鍵盤輸入合法/非法格式 | 控件為 text + numeric input mode，提示 YYYY-MM-DD；不出現依賴瀏覽器格式的原生 date picker。空白、短年或無效日關聯到精確欄位錯誤。 |
| B03 | 初始畫面按「載入範例」 | 顯示取代輸入提示；確認後載入 A/B 週一至週五示例，結果仍須按下主按鈕才產生。 |
| B04 | 繁中端到端：填日期、調整可用日、產生 | 五日期按 C01，序號與統計正確；結果在主工作畫布，未排/完整標籤正確。 |
| B05 | 英文端到端：建立一個部分結果 | 英文摘要、每個 Unassigned 日期、序號和統計齊全；不得留下混合繁中訊息。 |
| B06 | 產生後改日期、姓名、weekday、增刪或重排任一項 | 每次同步清除舊表和複製/下載狀態，標示需重新計算；重算後序號依新名單順序重新編號。 |
| B07 | 展開/收合成員可用日並全選/全清 | 收合摘要正確；全清明確表示該人全週不可用；所有操作可由鍵盤完成並有可見 focus。 |
| B08 | 操作 30 位成員、逐列上移/下移和刪除 | 不需一次展開 210 個 checkbox；操作仍有明確標籤，無跳錯列；第 31 位不可新增。 |
| B09 | 在 320 CSS px 使用 30 人名單及長姓名結果 | 頁面自身無水平捲動；只在具名結果表 region 內捲動；姓名折行；周圍說明、統計和按鈕可到達。 |
| B10 | 在桌面與 200% zoom 操作全流程 | 不裁切錯誤或欄位，序號/表頭可讀，primary action、下載與焦點不被遮住；繁中/英文較長 40% 仍可使用。 |
| B11 | 開清除對話框，先取消再確認 | 取消完整保留當前輸入/結果；確認回初始狀態並失效 pending copy；對話框關閉時焦點回原觸發按鈕。 |
| B12 | 允許 clipboard write 後明確按複製，貼到純文字編輯器 | 只有使用者手勢寫入本工具報告；沒有先讀取原 clipboard；貼上文字與 buildReport 完全一致。 |
| B13 | 用拒絕 clipboard 權限的瀏覽器重試 | 顯示複製失敗和手動選取/下載替代；原結果保留且不能出現「已複製」。 |
| B14 | 在測試 harness 延遲 writeText promise，操作期間改任一輸入後再 resolve/reject | 僅屬競態單元測試；舊 epoch/revision/request/page generation 不得更新成功/失敗 UI；不以 mock 代表原生 clipboard 通過。 |
| B15 | 明確下載中英報告各一次 | 使用者下載的檔名精確 glossquote-duty-roster.txt；實際位元 UTF-8、無 BOM、LF、無尾端 LF，報告包含全部未排日及成員序號；不含機器 id。 |
| B16 | 單元/注入測試建立八個未清 Object URL，再嘗試第九個；等待 30 秒和按 clear | 第九個被阻止；30 秒 timeout 與 clear 都清除 timeout 並 revoke URL。瀏覽器實際下載是否完成另以 B15 驗，不假稱 revoke 刪除已存檔案。 |
| B17 | 實際導覽離開頁面再返回，若瀏覽器採用 BFCache 記錄 persisted 狀態 | pagehide 後草稿/結果已清除；BFCache pageshow 也呈現初始空白狀態。若該瀏覽器本次未使用 BFCache，記錄現象；不可用合成事件聲稱 BFCache 已通過。 |
| B18 | DevTools 觀察初次載入、輸入、計算、複製、下載、隱藏/恢復及切語言的 Network/Storage | 記錄實際同源靜態 GET；輸入/結果無外部或 API request；無 URL/Storage/Cache/Cookie 寫入。沒有工具時對完整 Network/Storage 誠實標 NOT_RUN。 |
| B19 | 鍵盤-only 完成日期、weekday、姓名、重排、計算、報告與關閉 dialog | 所有功能有可見 focus、順序合理、錯誤與結果不只靠顏色；讀屏狀態不重複吵雜。 |
| B20 | 載入兩語頁面並切換語言/返回首頁 | 繁中/英文路由、canonical 候選、翻譯和對應 homepage link 正確；切語言先告知草稿會清除且頁面不會恢復它。 |

## M1/M2/M3 gate 和證據

- M1 必須 Node 24+ 的 npm test、npm run check、npm run build 通過，驗證至少 C01–C32；M1 的必要雙語主流程、即時失效、清除 dialog、鍵盤與 320px 由真實瀏覽器完成並記錄。遇到能力不足可按授權記 NOT_RUN，但不得把 mock、原始碼掃描或 sample 手算當成產品通過。固定 command/exit/manifest/實際觀測寫入 HANDOFF.md。
- M2 production build 與本機 HTTP 模型 5209 的 candidate/header/SEO/404 驗證獨立記錄；該測試不等於 Cloudflare live。公開 GitHub 依 docs/RELEASE.md 和 docs/GIT-PUBLICATION-SAFETY.md 驗 visibility、remote commit、來源 ZIP 及檔案 bytes/hash。
- M3 由主代理部署後驗兩語 live body/headers/SEO/404/流程及雙語首頁收錄；本文件本身不表示任何 gate 已通過。

## 相關固定規格

案例依據為[產品需求](PRODUCT.md)、[技術契約](TECHNICAL.md)、[隱私與安全](docs/PRIVACY-SECURITY.md)、[工程契約](docs/ENGINEERING.md)及[發布契約](docs/RELEASE.md)。
