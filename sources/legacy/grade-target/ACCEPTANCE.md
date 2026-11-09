# 驗收案例：成績目標試算

狀態：規格案例，尚未執行。每項預期值都是獨立手算的固定 oracle；不可由被測函式產生 expected。M0 只建立文件，不代表任何案例已通過。主要規則見 [PRODUCT.md](PRODUCT.md)、[TECHNICAL.md](TECHNICAL.md)、[UX-SEO.md](UX-SEO.md)；工程和證據命令見 [docs/ENGINEERING.md](docs/ENGINEERING.md)，安全限制見 [docs/PRIVACY-SECURITY.md](docs/PRIVACY-SECURITY.md)。

## 核心固定案例

除另有說明，每個列按出現順序使用 id r1、r2…、nameRaw「項目 1」…；target、weight、score 欄皆為原始字串。空白成績以 scoreRaw 為空字串表示。成功預期須比對 status、exact unit 字串、顯示字串、requiredAverageHundredths（不適用時為 null）；錯誤預期須比對固定 code/field 且確認沒有 result 或 raw echo。

| ID | 精確輸入 | 預期 |
|---|---|---|
| C01 | target 70；40/80、60/空白 | target_feasible；earnedNumerator=32000000、earnedDisplay=32.00、remainingWeightBp=6000、requiredAverageHundredths=6334、maximumPossibleNumerator=92000000、maximumPossibleDisplay=92.00。 |
| C02 | target 60；50/80、50/0 | complete_missed；earnedNumerator=40000000、earnedDisplay=40.00、remainingWeightBp=0、requiredAverageHundredths=null。0 是已評分，不是空白。 |
| C03 | target 30；40/100、60/空白 | target_already_met；earnedDisplay=40.00、requiredAverageHundredths=0、remainingWeightBp=6000；剩餘列仍未評分，不能報成全部完成。 |
| C04 | target 60；90/50、10/空白 | target_unreachable；maximumPossibleNumerator=55000000、maximumPossibleDisplay=55.00、requiredAverageHundredths=null。不可輸出 100.00 當所需平均。 |
| C05 | target 70；20/空白、80/空白 | target_feasible；earnedDisplay=0.00、remainingWeightBp=10000、requiredAverageHundredths=7000、maximumPossibleDisplay=100.00。 |
| C06 | target 70；50/60、50/80 | complete_met；earnedNumerator=70000000、earnedDisplay=70.00、remainingWeightBp=0、requiredAverageHundredths=null。 |
| C07 | target 70；50/69.99、50/70 | complete_missed；earnedNumerator=69995000、earnedDisplay=70.00、targetNumerator=70000000。未四捨五入值低於目標，狀態不得以顯示值比較。 |
| C08 | target 100；0.01/100、99.99/空白 | target_feasible；remainingWeightBp=9999、requiredAverageHundredths=10000、maximumPossibleDisplay=100.00。驗證最小正權重和恰好可達邊界。 |
| C09 | target 50.01；99.99/50、0.01/空白 | target_unreachable；maximumPossibleNumerator=50005000、maximumPossibleDisplay=50.01、requiredAverageHundredths=null。最高值顯示與目標同為 50.01，仍因精確最高值 50.005 低於 50.01 而不可達。 |
| C10 | target 60；30/50、70/空白 | target_feasible；earnedDisplay=15.00、requiredAverageHundredths=6429（64.29，向上取至百分之一）、maximumPossibleDisplay=85.00。 |
| C11 | target 70.50；40/80.0、60/空白 | target_feasible；earnedDisplay=32.00、requiredAverageHundredths=6417（64.17）；target 解析為 7050 hundredths。 |
| C12 | target 070.5；040.00/080.0、060/空白 | 與 C11 同一數值結果：targetHundredths=7050、requiredAverageHundredths=6417；證明接受 ASCII 前導零及 1 位小數，不以 Number／locale 解析。 |
| C13 | target 70；40/80、59.99/空白 | weight_total_mismatch，field=rows；不得回傳計算結果。 |
| C14 | target 70.123；100/空白 | invalid_target_format，field=targetRaw。 |
| C15 | target 7e1；100/空白 | invalid_target_format，field=targetRaw。 |
| C16 | target「 70」；100/空白 | invalid_target_format，field=targetRaw；不可 trim 數字欄。 |
| C17 | target「７０」；100/空白 | invalid_target_format，field=targetRaw；全形字元拒絕。 |
| C18 | target 70；0/空白、100/空白 | weight_out_of_range，field=rows.0.weightRaw；0 權重不能以合計正確而通過。 |
| C19 | target 70；40/80、60/「0」 | 與 C01 結構不同：remainingWeightBp=0，第二列是已評分 0；確定 0 不納入剩餘權重。 |
| C20 | target 70；100/空白，但 root 多一個 own 欄位 debug | invalid_schema，field=request；沒有 partial result，也不 echo debug 值。 |
| C21 | root targetRaw 為 enumerable getter、rows 為一般陣列；getter 內計數 | invalid_schema，field=request.targetRaw；getter 呼叫次數必須是 0。 |
| C22 | rows 是長度 1、索引 0 為 hole 的陣列 | invalid_schema，field=rows；不得把 hole 當未評分列。 |
| C23 | 根物件或列含 symbol own key，或非 enumerable 多餘 key | invalid_schema；符號和非 enumerable 欄位不可忽略。 |
| C24 | 兩列皆使用 id r1，其他欄合法且權重合計 100 | duplicate_id，field=rows.1.id；第一個問題即固定錯誤，不計算。 |
| C25 | target 是 33 個 ASCII 零字元；其餘合法 | raw_too_long，field=targetRaw；原始字串長度上限 32。 |
| C25a | targetRaw 是 31 個 ASCII 零字元後接 1，總長 32；單列 weight 100、score 空白 | 有效；targetHundredths=100、remainingWeightBp=10000、requiredAverageHundredths=100。這是合法字串長度的上界案例，不與前導零一般解析案例 C12 混用。 |
| C26 | 名稱為 81 個 ASCII x；其餘合法 | invalid_name，field=rows.0.nameRaw。 |
| C27 | 名稱 trim 後全為空格；其餘合法 | invalid_name，field=rows.0.nameRaw。 |
| C28 | 41 列，每列結構合法 | invalid_rows_count，field=rows；不進入逐列計算。 |
| C29 | scoreRaw 為 100.001 | invalid_score_format，field=rows.0.scoreRaw。 |
| C30 | scoreRaw 為 100.01 | score_out_of_range，field=rows.0.scoreRaw。 |
| C31 | 單列 weightRaw 為 100000000000000000000000000000000（33 字元） | raw_too_long，field=rows.0.weightRaw；不先轉數值或截斷。 |
| C32 | buildReport 取 C01 成功 result 與 zh-Hant，再與 en 各呼叫一次 | 兩次均為固定 filename、MIME；文字完全符合下方範例、兩語標題不同，UTF-8 無 BOM、只有 LF、無尾端 LF，且不含「項目 1」、raw 名稱或時間戳；連續呼叫同輸入完全相同。 |
| C33 | buildReport 的 language 為 fr | 固定 error code=invalid_language、field=language；不得把未知語言拼入輸出。 |
| C34 | 對 calculateTarget 成功結果 JSON.stringify 後 parse；比較輸入前後 | JSON 序列化成功；exact unit 欄位仍是十進位字串，不存在 BigInt；request 深層值未改變。 |

### 固定報告全文

本案例輸入為 C01。報告狀態碼為 target_feasible；正文使用以下固定順序、固定標籤及行數。預留欄位僅插入已驗證的 ASCII 兩位小數或固定狀態文案；不插入列名稱或原始輸入。下列每行之間是一個 LF，最後一行之後沒有 LF。

繁體中文全文：

    成績目標試算
    目標：70.00 / 100
    已取得的總成績貢獻：32.00 / 100
    剩餘權重：60.00%
    剩餘項目需達的加權平均：63.34 / 100
    狀態：仍可達成
    空白成績代表尚未評分；輸入 0 代表已評分且得 0 分。
    所需值是剩餘項目依權重合併後的平均，不是每項最低分，也不保證取得目標。
    本工具依你的輸入試算，不代表學校官方計分規則。

English full text:

    Grade Target Calculator
    Target: 70.00 / 100
    Earned contribution to final grade: 32.00 / 100
    Remaining weight: 60.00%
    Weighted average needed across remaining components: 63.34 / 100
    Status: Target is reachable
    A blank score means not graded; 0 means graded with a score of zero.
    This is the weighted average across ungraded components, not a minimum for each one, and it does not guarantee the target.
    This calculator follows your inputs and does not represent your school's official grading rules.

下列四組完整輸出為另外四個狀態的快照；每行之間一個 LF，檔案末端無 LF。輸出使用 [TECHNICAL.md](TECHNICAL.md) 的固定檔名、MIME 和模板，不含列名稱。

### C35 — target_already_met

輸入：target 30；40/100、60/空白。

繁中：

    成績目標試算
    目標：30.00 / 100
    已取得的總成績貢獻：40.00 / 100
    剩餘權重：60.00%
    剩餘項目需達的加權平均：0.00 / 100
    狀態：已達成目標；仍有項目尚未評分
    空白成績代表尚未評分；輸入 0 代表已評分且得 0 分。
    所需值是剩餘項目依權重合併後的平均，不是每項最低分，也不保證取得目標。
    本工具依你的輸入試算，不代表學校官方計分規則。

English:

    Grade Target Calculator
    Target: 30.00 / 100
    Earned contribution to final grade: 40.00 / 100
    Remaining weight: 60.00%
    Weighted average needed across remaining components: 0.00 / 100
    Status: Target already met; some components are still ungraded
    A blank score means not graded; 0 means graded with a score of zero.
    This is the weighted average across ungraded components, not a minimum for each one, and it does not guarantee the target.
    This calculator follows your inputs and does not represent your school's official grading rules.

### C36 — target_unreachable

輸入：target 60；90/50、10/空白。

繁中：

    成績目標試算
    目標：60.00 / 100
    已取得的總成績貢獻：45.00 / 100
    剩餘權重：10.00%
    最高可能總成績：55.00 / 100
    剩餘項目需達的加權平均：目標無法達到
    狀態：目標無法達到
    空白成績代表尚未評分；輸入 0 代表已評分且得 0 分。
    所需值是剩餘項目依權重合併後的平均，不是每項最低分，也不保證取得目標。
    本工具依你的輸入試算，不代表學校官方計分規則。

English:

    Grade Target Calculator
    Target: 60.00 / 100
    Earned contribution to final grade: 45.00 / 100
    Remaining weight: 10.00%
    Maximum possible final grade: 55.00 / 100
    Weighted average needed across remaining components: Target is not reachable
    Status: Target is not reachable
    A blank score means not graded; 0 means graded with a score of zero.
    This is the weighted average across ungraded components, not a minimum for each one, and it does not guarantee the target.
    This calculator follows your inputs and does not represent your school's official grading rules.

### C37 — complete_met

輸入：target 70；50/60、50/80。

繁中：

    成績目標試算
    目標：70.00 / 100
    已取得的總成績貢獻：70.00 / 100
    剩餘權重：0.00%
    全部項目已評分；最終總成績：70.00 / 100
    狀態：全部項目已評分，已達成目標
    空白成績代表尚未評分；輸入 0 代表已評分且得 0 分。
    所需值是剩餘項目依權重合併後的平均，不是每項最低分，也不保證取得目標。
    本工具依你的輸入試算，不代表學校官方計分規則。

English:

    Grade Target Calculator
    Target: 70.00 / 100
    Earned contribution to final grade: 70.00 / 100
    Remaining weight: 0.00%
    All components are graded; final grade: 70.00 / 100
    Status: All components are graded; target met
    A blank score means not graded; 0 means graded with a score of zero.
    This is the weighted average across ungraded components, not a minimum for each one, and it does not guarantee the target.
    This calculator follows your inputs and does not represent your school's official grading rules.

### C38 — complete_missed

輸入：target 60；50/80、50/0。

繁中：

    成績目標試算
    目標：60.00 / 100
    已取得的總成績貢獻：40.00 / 100
    剩餘權重：0.00%
    全部項目已評分；最終總成績：40.00 / 100
    狀態：全部項目已評分，未達成目標
    空白成績代表尚未評分；輸入 0 代表已評分且得 0 分。
    所需值是剩餘項目依權重合併後的平均，不是每項最低分，也不保證取得目標。
    本工具依你的輸入試算，不代表學校官方計分規則。

English:

    Grade Target Calculator
    Target: 60.00 / 100
    Earned contribution to final grade: 40.00 / 100
    Remaining weight: 0.00%
    All components are graded; final grade: 40.00 / 100
    Status: All components are graded; target not met
    A blank score means not graded; 0 means graded with a score of zero.
    This is the weighted average across ungraded components, not a minimum for each one, and it does not guarantee the target.
    This calculator follows your inputs and does not represent your school's official grading rules.

## 瀏覽器與使用環境案例

在 M1 loopback 預覽 127.0.0.1:4208 逐語言執行；至少在一般桌面瀏覽器與自動化瀏覽器可用環境完成雙語主要路徑。實際手機、原生鍵盤、完整 Network/Storage、Clipboard 權限等若無能力必須分開標 NOT_RUN，不能用 mock 冒充已驗。詳見 [docs/ENGINEERING.md](docs/ENGINEERING.md)、[docs/PRIVACY-SECURITY.md](docs/PRIVACY-SECURITY.md)。

| ID | 可重現操作 | 預期 |
|---|---|---|
| B01 | 新工作階段打開繁中首頁，尚未載入範例 | 表單空白、一列、無結果；整個輸入 fieldset 與所有工作按鈕初始 disabled，且所有 input 均無 name；初始化和所有事件掛妥後才解除 disabled。 |
| B02 | 初始化完成後直接按主要操作 | 顯示可修復的必填錯誤；頁面不導覽、不發 GET；不顯示 partial result。 |
| B03 | 明確按「載入範例」，再按「試算」 | 範例只填表、不自動計算；計算後為 earned 32.00、剩餘權重 60.00%、所需平均 63.34。 |
| B04 | target=70；row1 weight=40, score=80；row2 weight=60, score 先留白再輸入 0 | 留白版本 remaining=60.00%；輸入 0 後結果立即清除，重新計算變成全部已評分且 final=32.00，顯示零分與未達標。 |
| B05 | 成功計算後只改目標、名稱、權重、分數任一欄 | 同一事件循環內清除結果、錯誤摘要、複製成功狀態，並停用複製／下載，直至再計算。 |
| B06 | 成功計算後新增一列，再移除該列 | 每次操作立即使舊結果失效；不可還原先前結果或報告。最後一列不能移除；新增第 40 列後新增操作 disabled。 |
| B07 | target=70；兩列 score 留白；weight 依序輸入 40、59.99 後試算 | 定位 rows 權重合計錯誤，無結果；修正第二列至 60.00 並再試算成功。 |
| B08 | 手動輸入負號、逗號、全形句點、三位小數；再以 IME 組字輸入 | 不轉換或猜測格式；組字期間不連續報錯，完成後由試算驗證並以固定錯誤定位。 |
| B09 | 以可取消測試對話框開啟語言切換後取消 | 仍在原語言，輸入、結果及 URL 集合不變。 |
| B10 | 以可確認測試對話框確認語言切換 | 切到對應固定同源頁；表單、結果、複製／下載提示、pending async 狀態及所有已建 URL 清空；新頁呈現空白初始態。 |
| B11 | 在繁中及英文各執行一次 C01 完整主流程 | 標籤、錯誤、結果和報告語言一致；返回首頁連結分別是共用契約指定的繁中／英文 URL；無內容仍停留另一語言。 |
| B12 | 模擬較慢 clipboard Promise；計算後點複製，Promise pending 時編輯後重算，再 resolve 舊 Promise | 舊 Promise 不顯示成功、錯誤或覆寫新結果；不可宣稱已撤銷 OS clipboard 寫入。 |
| B13 | 對可用瀏覽器在 fake timers 建立 8 個下載 URL，再嘗試第 9 個 | 前 8 個各有自己的 30 秒 deadline；第 9 個回報容量已滿；重新計算不撤銷其中任何一個；各自到期只 revoke 自己。 |
| B14 | 有兩個未到期下載 URL 時觸發明確清除 | 清除確認後兩 URL 均撤銷；取消時表單和 URL 均保持原狀。 |
| B15 | 以初始化失敗 fixture 載入頁面，測試 harness 呼叫 form.requestSubmit() | submit 第一動作同步 preventDefault；fieldset/所有按鈕保持 disabled；不 GET、不出現 query string，且不把 raw exception 顯示給使用者。 |
| B16 | 成功計算並下載繁中、英文報告；逐位元檢查 | 固定檔名 glossquote-grade-target.txt；MIME text/plain;charset=utf-8；符合 C32，下載動作只在明確手勢後建立。 |
| B17 | 在 320 CSS px viewport、40 列和 200% 縮放檢查鍵盤操作 | 不出現整頁水平捲動；焦點、每列欄位標籤、錯誤、主要操作可見可達；長英文標籤不互相覆蓋。 |
| B18 | 在可用的觸控/虛擬鍵盤環境聚焦 weight 與 score 欄 | decimal input mode 可操作；若鍵盤不提供句點，可用可見插入句點控制；不把逗號轉成句點；焦點欄不被鍵盤/安全區遮住。真機能力不足時記 NOT_RUN。 |
| B19 | 在無網路時先載入完成，再輸入 C01 試算 | 已載入頁面可在本機記憶體同步計算；新載入/冷啟動離線不承諾成功，產品不得宣稱永遠離線。 |
| B20 | 從完成頁觸發 pagehide；另以 BFCache persisted pageshow 還原 | pagehide 清空資料、結果、clipboard epoch、全部 object URL；persisted 恢復重新成為空白頁並增加 page generation。 |
| B21 | 在可觀測瀏覽器 DevTools 檢查成功計算前後 Network/Storage | 除靜態同源載入外無應用請求；無 storage/cookie/cache/service worker/URL 資料。完整 Network/Storage 未實際取得時記 NOT_RUN。 |
| B22 | 本機 HTTP 預覽查看 robots/meta與兩語頁面來源 | M1 無正式 canonical、sitemap或索引 schema；兩頁 noindex,nofollow；不得依預覽推斷正式 SEO 或索引狀態。 |

## M1 強制 gate 與不可冒稱項目

- 核心表 C01–C31、schema hostile cases、固定報告快照及 JSON/不突變要求全部由離線測試執行；成功率以實際命令和 exit code 記錄。獨立對照組另依主代理準備的 250 組資料驗證，不以文件手算代替該 gate。
- 繁中與英文的空白初始態、主要流程、編輯失效、零與空白、錯誤修正、切換取消/確認、報告文字和回首頁必須實際走通，缺任一語言不得通過 M1。
- 320 CSS px/鍵盤可由自動化環境實測；真機鍵盤、OS clipboard、browser downloads 的原生生命週期及完整 Network/Storage 依當時能力記為 PASS 或 NOT_RUN。mock 可驗競態，不可冒充原生 API 實測。
- M1 preview 只限 loopback 4208，build noindex/nofollow，沒有 production canonical；5208 是之後的本機 production-like HTTP model，不是網路試算端點。M2/M3 的任何發布、部署、真實網域均未在本文件執行。
