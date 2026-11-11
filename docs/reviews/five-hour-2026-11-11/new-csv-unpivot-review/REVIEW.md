# CSV 橫表轉明細｜獨立文件審查

**文件審查通過，建議接受固定候選。** 未發現阻斷缺陷。候選為公開 draft PR #330 的 `4e0e7fd7a7b90e8cc5275559428457f46c44afb9`。Registry r1661 的作者任務仍為 working，尚無正式 submission 或 spec 登記。正式 review 與 readiness 各待作者完成登記、提交同一候選及排程者的時段。 [候選 PR #330](https://github.com/KYStr/glossquote-labs-home/pull/330) · [固定規格](https://github.com/KYStr/glossquote-labs-home/blob/4e0e7fd7a7b90e8cc5275559428457f46c44afb9/docs/specs/csv-unpivot/SPEC.md)

作者 `local-codex:01a1c8b8-14a2-78e0-894d-e59a735656b2`，原 claim `fh-reg-sched-17-csv-unpivot-claim-7d640077-e5d`。Reviewer `local-codex:01a1c8a3-8a4e-7e31-a219-8ef84cf9e8a5`，依 r1657 與 r1661 的 owner／contributors 核對，未參與候選。固定研究簡報 commit `14d3dff09fe8f283726a7e8cb9eaadd905500516`，BRIEF 與候選副本逐位元組相同。 [固定來源與承接](provenance.json)

## 八節評分

| 文件面向 | 分數 | 核對結果 |
| --- | ---: | --- |
| goal | 100 | 社團借用橫表到盤點長表的角色、設備、交付與成功例明確。四筆位置及略過空白後的三筆都能獨立重算。明示下游須將代碼欄匯入為文字以保留前導零。 |
| scope | 100 | 單表 UTF-8 CSV、欄角色、容量、設備、離線與排除項完整。另核固定 Workbench 欄投影、雙表對帳及固定寬度來源，各自操作與本案逐格展開有明確區隔。 |
| userFlow | 100 | 兩語正常、零列、忙碌、錯誤、改值、取消、重設、離頁及保護確認均有行為與復原。獨立核對來源替換、取消和離頁的晚到回傳。 |
| inputsOutputs | 100 | 固定來源 shape、UTF-8/BOM、引號及空列、錯誤首位、欄角色、列欄座標、字串、三種匯出及風險位置。37 個解析及 26 個轉換的完整字面結果一致。 |
| implementation | 100 | 模組和 Worker 界線、世代、transferable、風險 bitset、單趟解析及先量長再配置具明確上界。解析取消使版本失效，晚到 File.arrayBuffer bytes 丟棄。 |
| acceptance | 100 | 九個產品面向逐項固定，包含各自證據及必要實機、離線、SEO、安全和輸出門檻。產品檢查狀態清楚。 |
| tests | 100 | 48 個公式 predicate、27 個容量／形狀例和 75 步完整 controller 快照與下載效果重算一致。另有離線 Node 24、兩次建置 hash、瀏覽器未驗的執行規劃。 |
| handoff | 100 | 固定 brief、作者、claim、候選範圍、命令、權利邊界、接續與停止條件可追溯。核對公開四檔及父提交，11 個本機相對連結可解。 |

## 獨立重算

使用 Python 3.12.5 標準函式庫。逐格掃描取得第一個錯誤與邏輯 record/column，成功資料另外由 `csv.reader` 解碼交叉核對。依來源列、展開欄做投影，以 `csv.writer` 和獨立 JSON 序列化計算精確匯出。容量以字元／位元組加總及具體合成資料交叉核對。控制器逐事件演算完整狀態與下載 effect，未執行作者驗算程式。 [驗算器](verify-candidate.py) · [獨立基礎模型](oracle.py) · [機器輸出](verification.json)

| 核對 | 輸入與預期 | 觀測 |
| --- | --- | --- |
| UTF-8 與引號 | 帶 BOM 的 file fixture `bom-and-mixed-newlines` 包含 CRLF、裸 CR 和 LF 於引號內。預期保留三種原值，尾端 CRLF 只結束上一筆。 | 成功得到 `"a\r\nb"`、`"c\rd"`、`"e\nf"` 三值。貼上以 textarea 的 LF API 值為準。 |
| 邏輯位置與錯誤優先 | `id,x\r\n001,"a\nb"\r\n002` 的最後一筆缺欄。超過 16,384 UTF-16 units 前先遇 C0，與先超限再遇 C0 應回不同錯誤。 | 分別得到 `ROW_WIDTH(3,2)`、`CONTROL_CHAR(2,2)`、`FIELD_LIMIT(2,2)`。後方無效 UTF-8 可在來源解碼時先於 CSV 掃描失敗。 |
| 空列、空欄與序列 | `id,w\n,` 為一筆含兩個空欄的有效資料。空白記錄在兩欄表內回欄數錯誤。固定借用表 `001` 和 `0` 都保留。 | 空欄不被默默省略，空 record 不被跳過。借用表的 origin 依序為 `(2,2),(2,3),(3,2),(3,3)`，略過空值僅移除 `(2,3)`。CSV 127 bytes，原值 JSON 173 bytes。 |
| 公式風險與副本 | `id,x\n001,=1+1` 應只標記輸出 (2,3)，源 (2,2)。原 CSV 停用，保護只加一個 U+0027，JSON 仍為 `=1+1`。 | 三種輸出條件、位置與字面符合。保護 CSV 43 bytes，原值 JSON 85 bytes。另一測例的保護後重名欄按規格保留，原值 JSON 的兩個欄名仍互異。 |
| 輸入／輸出上限 | 含 BOM 的 1,048,576-byte file 應通過。明細 20,020 筆須失敗，略過其中 20 個空值可成 20,000 筆。三個產物分別驗證 8 MiB−1／等於／+1。 | 容量和各自狀態一致。獨立合成一組 raw CSV 精確為 8,388,608 bytes，添一字節成 8,388,609。另有保護 CSV 超限且原值 JSON 合格的組合。 |
| 競態、確認與分頁 | 每次有效切換依版本與 run 失效。晚到 parse/preview 無法改畫面或下載。保護下載需本結果確認；結果第二頁仍下載完整 26 筆。 | 五組共 75 個快照、5 次晚到拒絕及 4 個下載 effect 逐項一致。 |

實跑 `python -B -X utf8 verify-candidate.py <固定四檔目錄> verification.json`，exit 0。另實跑 `python -B -X utf8 probes.py preliminary-probes.json`，exit 0，22 組由固定簡報先推導的探針。候選驗算另重算 6 個複合錯誤優先探針及 1 個 bitset 位置。固定 Workbench 測試中的 42 個獨立字串都出現在候選的 48 組 predicate，預期相符。 [補充探針程式](probes.py) · [補充探針結果](preliminary-probes.json) · [固定判定](https://github.com/KYStr/glossquote-labs-csv-workbench/blob/fbd488d0622d81e175e1d367801e2959232af22e/public/js/core/risk.mjs) · [固定判定測例](https://github.com/KYStr/glossquote-labs-csv-workbench/blob/fbd488d0622d81e175e1d367801e2959232af22e/test/risk.test.mjs)

核對了 RFC 的引號與欄位結構、WHATWG 的 UTF-8 fatal 與 textarea 換行語義，以及 OWASP 的保護副本再儲存限制。 [RFC 4180](https://www.rfc-editor.org/rfc/rfc4180) · [WHATWG Encoding](https://encoding.spec.whatwg.org/#interface-textdecoder) · [WHATWG textarea](https://html.spec.whatwg.org/multipage/form-elements.html#the-textarea-element) · [OWASP CSV Injection](https://community.owasp.org/attacks/CSV_Injection)

## 差異與未驗項

PR 為一個提交，唯一 parent／merge base 為 `794455846e2dfc343c9c63441e48143df86a22ff`。四個路徑在基底均不存在，PR 只新增這四份文件。從公開固定 Git blobs 重建完整 diff 並讀核四檔。GitHub 檔案 API 省略大型 fixture patch，作者核對中的一行控制字元跳脫在 patch 視圖呈現不同。兩者均以固定 raw bytes、Git blob、行數與 SHA-256 確認。 [差異證據](diff-summary.json)

本輪只有文件與模型驗算。九個產品面向皆 `NOT_RUN`，包括產品 build、實際瀏覽器／裝置、Worker、Network／Storage、可及性、原生操作、下載、下游匯入、正式 SEO、部署與外驗。Windows 持久環境指紋前後一致。

下一步由作者以固定候選登記九個產品 criteria 及 submit。Reviewer 取得唯一時段後，核對 fresh registry、相同候選、作者與 claim、產品 criteria 和獨立身分，再依排程處理正式文件 review／readiness。 [結構化提案](review-proposal.json)
