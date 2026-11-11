# 工作坊志願與座位分配｜固定預案獨立審查

**文件結論：revision。** 候選 [PR #332](https://github.com/KYStr/glossquote-labs-home/pull/332) 的固定 head 為 `a1cf43a35b2130d9de89a7fdd9c063fc7f54c601`。本輪只審文件。審查者 `local-codex:01a1c8a3-8c54-7810-a0e1-bc3a2ffbfe01` 未參與此候選製作。作者 `local-codex:01a1c8b8-1888-7b02-9539-c67eb1dd3b47` 持有 `workshop-spec-claim-51844316-c259-4f0a-8206-b4adb00edfdf`。最後查 r1663 時，作者 task 為 working，尚無 registry submission 或已登記 spec。 [固定規格](https://github.com/KYStr/glossquote-labs-home/blob/a1cf43a35b2130d9de89a7fdd9c063fc7f54c601/docs/specs/workshop-preference-allocation/SPEC.md)

## WA-01：選取空檔沒有來源錯誤

固定規格給空 CSV `SOURCE_EMPTY`（record 1、column 1），並要求合法 UTF-8 的 CSV 錯誤保留草稿及顯示來源位置。控制器的 `LOAD` 把合法空檔設為 `origin="file", text=""`，但相位規則只驗非空來源。這讓使用者已選取的空檔進入「缺一表」提示，無法看到該檔需要重新匯出的具體原因。 [來源錯誤契約](https://github.com/KYStr/glossquote-labs-home/blob/a1cf43a35b2130d9de89a7fdd9c063fc7f54c601/docs/specs/workshop-preference-allocation/SPEC.md#L77) · [LOAD 契約](https://github.com/KYStr/glossquote-labs-home/blob/a1cf43a35b2130d9de89a7fdd9c063fc7f54c601/docs/specs/workshop-preference-allocation/SPEC.md#L132) · [控制器相位](https://github.com/KYStr/glossquote-labs-home/blob/a1cf43a35b2130d9de89a7fdd9c063fc7f54c601/docs/specs/workshop-preference-allocation/SPEC.md#L146)

```text
EDIT workshops "workshop_id,title,capacity\nA,Workshop,1"
READ preferences size=0
LOAD preferences generation=1 bytes=[]
```

- 依來源錯誤契約應回 `phase="error"`、`validation={source:"preferences",code:"SOURCE_EMPTY",record:1,column:1}`，且無結果或下載。
- 依現行相位文字獨立重播得到 `phase="partial"`、`validation=null`，志願來源已是 `origin="file"`。這是從文件推導的結果，產品尚未實作。
- 修正方式：用來源是否已提供判斷應否驗證，例如 `origin !== "empty"`。保留初載、清空貼上欄與取消原生選檔的既有語意。補上 0-byte 選檔的完整 controller 快照及效果，核對同一修正版。 [重播證據](fixture-results.json)

## 八節評分

| 面向 | 分數 | 完整 | 依據 |
| --- | ---: | --- | --- |
| `goal` | 98 | PASS | 同一時段的活動志工先排來源表，教室值班員可核對人數並取得單班檔。每位報名者整批只出現一次，重跑 bytes 可驗。 |
| `scope` | 96 | PASS | 兩份 CSV、列數、座位和最多三志願、桌面／實體行動、離線與排除項清楚。已比對分桌、交換配對、隨機分組、輪值與 CSV 工作台固定來源。 |
| `userFlow` | 88 | FAIL | 雙語預覽、順序、取消、dirty 和單班交付完整。合法 UTF-8 的 0-byte 選檔未走承諾的來源錯誤與恢復提示，見 WA-01。 |
| `inputsOutputs` | 97 | PASS | BOM、UTF-8、列與欄位置、錯誤先後、ID 大小寫、座位與名次、空班及兩種 canonical CSV 均有精確字面契約。50 個核心與 10 個邊界案例獨立驗算符合。 |
| `implementation` | 88 | FAIL | 列順序與第一個有位志願決定結果，1,500 次查位及讀取世代、URL cleanup 明確。未處理已選取但空白的檔案，`LOAD` 與相位契約衝突，見 WA-01。 |
| `acceptance` | 97 | PASS | 規格固定九個產品 IDs，逐項綁證據、兩語、隔離瀏覽器、實機、可及性、正式 SEO、build hash。產品證據一律待做。 |
| `tests` | 89 | FAIL | 50 個核心、10 個邊界及 49 個控制器快照全部重算相符。已有 core 空來源案，但缺同一輸入從檔案進入 controller 的回歸，無法守住 WA-01。 |
| `handoff` | 96 | PASS | 固定簡報、作者與 claim、四檔、預定產品目錄及命令可追查，文件審查、ready、產品驗收和正式發布各有明確步驟。 |

## 實讀差異與獨立驗算

GitHub PR 比較只新增四檔。三個 Markdown 檔的 GitHub patch 新增內容逐 byte 與固定 blob 相符。GitHub 的 files API 未附 4,385 行 fixtures 的 patch，已取回完整固定 blob、確認新增列數與雜湊，逐案解析並驗算。四檔及兩個相對共用文件連結均可讀。 [PR 檔案差異](https://github.com/KYStr/glossquote-labs-home/pull/332/files)

| 檔案 | bytes | Git blob | SHA-256 |
| --- | ---: | --- | --- |
| `AUTHOR-CHECK.md` | 21864 | `baeff09d2e0c0110ae004b084fc2173c6dc0e07b` | `820caaf7a2b2f8ed77dd2977bc9a9217a958f1d6fb9d6fae4b8b11ad357d2e4e` |
| `BRIEF.md` | 10510 | `540835814e859347bfdd879193874bfe8a81a4dd` | `a8f4b4e3ee93de967fe5c845d601cd83cfbe4e7e9e428eb5b7eff999cf709c89` |
| `SPEC.md` | 34119 | `6828da47a36c7a5f4d1a0f617b8c40d65ecec2b4` | `d25ab1547d3a99f8a1f4d97b927fb47d27838e0f75c359953613e3375d19fc01` |
| `fixtures.json` | 125821 | `1789715038f36366a2b343c8e525a579d1e77ee4` | `fbd3ccccd701ea7fdb384d7604d70af7cf90c28055cd040e5943d13d8e7f8fc7` |

以標準庫獨立解析 CSV、推導首錯、枚舉小型可行分配、核對名額守恆，並依事件重播完整控制器快照與假效果。單班 500 人邊界以每人唯一志願與 500 席推導。Windows Python 3.12.5 的兩項命令皆 exit 0。 [獨立 oracle](oracle.py) · [驗算程式](verify-fixtures.py) · [逐案輸出](fixture-results.json)

```text
python -B -X utf8 oracle.py
python -B -X utf8 verify-fixtures.py /path/to/fixed-candidate/fixtures.json
```

- 標準五人依序得到 R01→W1/1、R02→W2/2、R03→志願已滿、R04→W2/1、R05→未填。只把 R03 移到首列，R03→W1/1、R01/R02→W2/2，R04 改為志願已滿。整批 147 bytes，W2 單班 87 bytes，空班只有 49-byte 表頭。
- W1/W2 各一席。R01 志願 W1/W2，R03 只選 W1。R01 優先時只錄取 1 人，W2 仍剩一席。反轉兩列時錄取 2 人。存在 R01→W2、R03→W1 的兩人可行配置，固定優先規則清楚說明這個差異，沒有全域最佳或抽籤公平承諾。
- 九項產品 IDs 為 `functionality`、`boundaries`、`privacy`、`security`、`usability`、`accessibility`、`localization-seo`、`toolchain-provenance`、`compatibility`。文件有完整對應，registry 的 `spec.acceptanceCriteria` 待作者實際登記後核對。

產品九面向、隔離瀏覽器、原生讀存檔、Network/Storage、實機、正式 SEO、合併和部署均為 NOT_RUN。正式 registry review、spec-ready 也未執行。WA-01 修正後，重讀同一開啟 PR 的新 head、完整字面快照和作者提交，再由 scheduler 分配必要 registry 時段。
