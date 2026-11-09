# 驗收 oracle：批次文字套版

狀態：規格，尚未實作。所有輸入均為合成資料；下列預期是 oracle，並非已跑過的測試。

## 自動案例

1. **A01 FR-01 CSV baseline** — `姓名,ID\r\n小王,001`；headers `['姓名','ID']`、rows `[['小王','001']]`。
2. **A02 FR-01 quoted commas** — `name,note\nA,"hi, there"`；note 精確 `hi, there`。
3. **A03 FR-01 escaped quote/newline** — `n,m\r\nA,"x""y\r\nz"`；第二欄是 `x"y\r\nz`。
4. **A04 FR-01 malformed** — `n,m\nA,"unfinished`；`CSV_SYNTAX`，不生 records。
5. **A05 FR-01 row width** — header `n,m`，row `A`；`ROW_WIDTH`，不補空格。
6. **A06 FR-01 cap** — 1,048,576-byte legal input、1,000 rows、30 cols 可進下一步；各自多 1 byte／1 row／1 col 分別 `FILE_TOO_LARGE` / `ROW_LIMIT` / `COLUMN_LIMIT`。
7. **A07 FR-01 invalid header** — headers `['name','name']` 或 `['','ID']`；`HEADER_INVALID`。
8. **A08 FR-02 ordinary substitution** — template `您好{{姓名}}，編號{{ID}}`、row `{姓名:'小王',ID:'001'}`；輸出精確 `您好小王，編號001`。
9. **A09 FR-02 unknown field** — template `{{地址}}`、headers `姓名`；`UNKNOWN_FIELD`，列 `地址`，按產生 disabled。
10. **A10 FR-02 malformed markers** — 分別用 `{{姓名`、`姓名}}`、`{{}}`；三者皆 `TEMPLATE_SYNTAX`。
11. **A11 FR-02 header exactness** — header `Name`、template `{{ Name }}`（token value=` Name `）；未知欄位；header ` Name ` with the same template substitutes successfully. No trim/casefold.
12. **A12 FR-03 empty default** — rows `[['A',''],['B','2']]`、使用 `{{ID}}`；阻止全批，`ID` 缺值 1 筆，preview count 0。
13. **A13 FR-03 allow blank** — 同 A12、allowBlank true；生成 `['','2']`，第一筆 `blankFields:['ID']`、總空值 1。
14. **A14 FR-04 single pass** — 欄 A 值 `{{B}}`、B 值 `EXPANDED`，template `{{A}}`；結果嚴格 `{{B}}`。
15. **A15 FR-04 replacement token** — 值 `$& $1 $$`、template `{{x}}`；三個字面片段完全保留，不按 String.replace 特殊解釋。
16. **A16 FR-04 malicious text** — 值 `<script>alert(1)</script><img src=x onerror=alert(1)>`；輸出是完全相同文字；無 HTML execution、網路請求或 DOM event。
17. **A17 FR-05 names not paths** — header `姓名`, value `../../evil.html`；下載 filename 仍 `personalized-text.txt`，value 僅在文字 body。
18. **A18 FR-05 exact JSON** — one row 1 => JSON has `schemaVersion:1`, `tool:'template-merge'`, `records:[{row:1,text:'...',blankFields:[]}]`；JSON parse/re-serialize preserves Unicode and newline.
19. **A19 FR-04/05 output boundary** — 合成資料建立最終 TXT+JSON combined UTF-8 bytes (including both envelopes) exactly 8,388,608 accepts both files; 8,388,609 blocks both with `OUTPUT_TOO_LARGE`, with no partial or previous-generation Blob. Source CSV 1 MiB is a separate input cap.
20. **A20 FR-06 stale race** — generation 1 產生期間將 template 改版為 generation 2；generation 1 回結果不得顯示或下載，generation 2 才可成為 ready。

## 手動／browser 驗收

清單：tab/Shift+tab 編輯和預覽；320 CSS px；200% zoom；複製成功與拒絕 clipboard 的選取 fallback；一筆與大量預覽換行；下載對話框不讀取或自動保存位置；reset/pagehide 清理；offline 無外部網路。按目前 focus incident，真 browser gate 標 **NOT_RUN_USER_FOCUS_INCIDENT**；不得開原有使用者分頁、native app、OS dialog 或操作鍵盤焦點。Node tests 不涵蓋clipboard/下載實際行為。
