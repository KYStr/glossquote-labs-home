# CSV 橫表轉明細 / CSV Unpivot

研究 brief，2026-11-11。建議 slug `csv-unpivot`。

## 目標與使用情境

社團幹事收到各組填的借用物品表。每列是小組代碼，右方每週新增日期欄，格子是借用數量或記錄；交給共用盤點表時，目標格式是「小組、日期、借用數量」，每筆一列。幹事在借用公用 Windows 筆電、Chromebook 或平板時，可以把表匯出 CSV，選哪些欄當識別值、哪些表頭要變成明細。空白、`0`、`001` 和文字註記有各自用途。

一次產出可匯入的長表 CSV。預覽顯示每筆明細來自第幾個 CSV record 及哪一欄，讓幹事在交付前查證。匯出保留原字串及輸入順序。

## 替代方案與差異

- Microsoft Power Query 的 Unpivot 可把表頭轉成 attribute/value，適合已在維護 Excel 或 Power BI 查詢的團隊。只要轉一次現成 CSV 時，專用工具可直接檢查欄角色、空白及前導零，再帶走長表。 [Microsoft Unpivot columns](https://learn.microsoft.com/en-us/power-query/unpivot-column)
- 已有 SQLite 終端環境的人可先用 `.import` 載入，為每個展開欄寫一段查詢並合併結果。可重複使用，但欄名、順序和空值策略得由操作者維護。 [SQLite CSV import](https://sqlite.org/cli.html#importing_files_as_csv_or_other_formats)
- Labs CSV 檢視與欄位整理保留同一資料列形狀，依來源 index 選欄、查找，並匯出所選值。它的 CSV 解析與保護匯出契約可供重用審查。本案的一個來源資料列會變成多筆，表頭實際成為明細值。 [csv-workbench PRODUCT.md](https://github.com/KYStr/glossquote-labs-csv-workbench/blob/fbd488d0622d81e175e1d367801e2959232af22e/PRODUCT.md)
- Labs 兩份表格對帳接收左右兩個 CSV，用唯一鍵對齊並輸出新增、僅存及差異。本案接收單表，重複識別值保持獨立來源列，交付形狀改變後的資料。 [table-reconcile PRODUCT.md](https://github.com/KYStr/glossquote-labs-table-reconcile/blob/ce9a9260bac2d8ffd31fb5710de946b4996d1ef7/PRODUCT.md)
- Labs 固定位元組欄位拆解以 byte offsets 把一行固定寬文字切為多欄，產出列診斷。本案以已存在的 CSV 欄及表頭生成更多資料列。 [fixed-width-slicer SPEC.md](https://github.com/KYStr/glossquote-labs-home/blob/a5e7356dae36d2aac3db068352a916d76c7594c3/docs/specs/fixed-width-slicer/SPEC.md)

## 範圍與流程

1. 匯入一份帶表頭的 UTF-8 CSV，或直接貼上同格式資料。顯示欄名、最多三個原值樣本及資料列數。明確按「讀取欄位」才載入新工作區。
2. 在同一欄位清單為每欄選「保留、展開、略過」。最少一個保留與一個展開。輸出後兩欄名預設 `attribute`、`value`，可依目的系統改名。「略過空白格」預設關閉，說明只略過空字串。兩語有可重算範例。
3. 按「預覽明細」，畫布顯示預估／實際筆數、略過欄及空白數，並分頁展示明細與來源位置。下載長表 CSV。遇公式風險顯示原字串和保護副本的差異，另保留 JSON 原值出口。
4. 桌面以結果表為主，欄角色與結果相鄰。手機依資料、欄角色、結果直排，保留所有操作。首版範圍之外含 XLSX、TSV、樞紐彙總、依欄名拆日期、資料型別推斷、多表合併、排程自動化。

## 輸入、輸出與字面案例

- 來源 UTF-8 ≤1 MiB，可有一個檔首 BOM。逗號分隔，雙引號包欄、`""` 表示字面引號，欄內換行保留。記錄界允許 LF/CRLF。貼上的換行以 textarea 的 LF 值為準。用 fatal 解碼，拒絕裸 CR（欄外）、NUL、其他 C0 控制碼（Tab/CR/LF 除外）及單獨代理碼元。解析錯誤指向 CSV record（含表頭，從 1 起算）及欄號。 [RFC 4180](https://www.rfc-editor.org/rfc/rfc4180)
- 表頭精確唯一、1–120 Unicode 碼點、禁止 Tab/CR/LF，且至少一個非 ASCII 空格。至少 2 欄、最多 48 欄，0–2,000 資料列，最多 100,000 格（含表頭），單格最多 16,384 UTF-16 units。所有資料列欄數等於表頭，重複資料列與識別值保留。
- 輸出欄名依保留欄的來源順序，再接兩個自訂名。兩個名稱遵守表頭文法且與保留欄互異。每列按來源資料列順序及展開欄來源順序。空白策略區分 `""` 和 `" "`。結果最多 20,000 資料列，每種下載至多 8 MiB。
- `unpivot.csv` 採 UTF-8 無 BOM、每欄雙引號、雙引號加倍、CRLF 分 record、末尾無 CRLF。若結果表頭或任何資料格被現有 Labs 保守 predicate 標記，原值 CSV 停用。可核對後下載 `unpivot-protected.csv`（風險欄位前置 ASCII 單引號），或下載原值 `unpivot-original.json`（`{"schemaVersion":1,"columns":[...],"rows":[[...]]}`，UTF-8、compact、末尾一個 LF）。保護副本前告知下游重新儲存可能改變試算表保護行為。 [csv-workbench TECHNICAL.md](https://github.com/KYStr/glossquote-labs-csv-workbench/blob/fbd488d0622d81e175e1d367801e2959232af22e/TECHNICAL.md) · [OWASP CSV Injection](https://owasp.org/www-community/attacks/CSV_Injection)

輸入如下。

```csv
team,2026-11-02,2026-11-09,備註
001,2,,
002,0,"歸還,待查",晚班
```

保留 `team`，展開兩日期，略過 `備註`。輸出兩欄改名 `date`、`loan`，保留空白格。預期 `unpivot.csv` 邏輯內容如下。

```csv
"team","date","loan"
"001","2026-11-02","2"
"001","2026-11-09",""
"002","2026-11-02","0"
"002","2026-11-09","歸還,待查"
```

預覽顯示四筆，來源 record 及欄依序為 `(2,2),(2,3),(3,2),(3,3)`。勾選略過空白後，只移除第二筆，`"0"` 保留。沒有資料列的有效表頭可下載表頭，UI 明確顯示「0 筆明細」。

## 演算法、資料生命週期及依賴

使用經過檢查的 CSV 狀態機一次解析。欄角色保存為來源索引，選擇互斥。依 `row × expandColumn` 順序建立新資料列，帶著當下來源 record/column 位置供預覽。輸出前計算上限及風險位置，序列化按 UTF-8 bytes 計長，超限停止該產物並顯示哪一項上限。列數超限時整次轉換失敗。畫面分頁，結果與下載均依完整結果。以安全文字節點顯示欄名與值。

狀態含空白、解析、欄位已載入、轉換中、結果、輸入錯誤、超限、已取消。修改來源使欄位及結果失效；修改欄角色、輸出欄名或空白策略，保留已解析欄位但立刻撤銷明細。解析與轉換採可取消的 Worker；保留輸入及已確認角色供重試，丟棄延遲工作回傳。重設清欄名、草稿、預覽、檔案與 Blob URL，恢復初始設定；離頁、換語及 BFCache 返回維持新工作區。全程只在分頁記憶體。

使用原生 File、TextDecoder、Worker、Blob 及純 JS 解析；正式選擇重用既有 CSV core 時先核對固定版本、引用授權和相容案例。解析、輸出和分頁有容量門檻，候選需實測上限與行動裝置。初始靜態資產載入完成後可在斷網時轉換；原始內容與結果只交給本機畫面和明確下載。

## 語言、SEO 與驗證

繁中標題「CSV 橫表轉明細」，英文「CSV Unpivot」。說明「把日期、月份或分類表頭展成明細列，保留代碼及前導零」，英文使用 `wide to long CSV` 與 `unpivot columns` 的自然描述。兩語獨立靜態頁、同語首頁連結、lang/canonical/hreflang，預覽 noindex。機器欄名與匯出格式兩語一致。

| 案例 | 獨立預期 |
| --- | --- |
| 上述例，保留空白 | 四筆、同源列連續，來源索引與明細完整對應。 |
| 上述例，略過空白 | 三筆，含 `002,2026-11-02,0`。 |
| `id,Week\n001," "\n001,0`，選略過空白 | 兩筆，首筆值為 ASCII 空格，第二筆值是字串 `0`。 |
| `id,x,x\n001,2,3` | 第 1 record、第 3 欄重複表頭，沒有可下載結果。 |
| `id,x\n001\n` | 第 2 record 欄數不足，沒有部分結果。 |
| `id,x\n001,=1+1` | `unpivot.csv` 停用，原值 JSON 保留 `=1+1`，核對後的保護副本值為 `'=1+1`。 |
| 1,000 資料列 × 20 展開欄與 1,001 × 20 | 前者 20,000 筆可成，後者 20,020 筆報容量錯誤。使用短欄值使 bytes 門檻無干擾。 |
| 完成後改欄角色、開始轉換再取消並送入延遲成功 | 下載即停用。取消保留最新欄位設定，舊結果無法覆寫。 |

九面向預計證據包括 functionality（欄角色及字面 output bytes）、boundaries（CSV 錯列、空白、20,000 筆和取消）、privacy（零工作請求與 storage/離頁觀察）、security（來源文字 inert、公式匯出限制、CSP）、usability（從原表、欄分工到可匯入的結果）、accessibility（標籤、鍵盤、焦點、320 CSS px、200% zoom）、localization-seo（兩語及同語首頁）、toolchain-provenance（固定依賴、離線重建及同 PR head）、compatibility（獲准隔離瀏覽器的多語選檔、Worker、Blob／下游 CSV 匯入）。產品檢查皆待執行。

## 接續

主對話核對當前工作後，可發布本 brief 至 `docs/specs/csv-unpivot/BRIEF.md`，由正式承接者補齊 SPEC、fixtures 和作者自查，交非作者文件審查。產品來源預定 `tools/csv-unpivot/`。先固定欄角色與出檔測例，再寫解析、狀態及雙語畫面。
