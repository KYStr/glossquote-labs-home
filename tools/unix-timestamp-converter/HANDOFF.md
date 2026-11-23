# Unix 時間戳轉換 — Production HANDOFF

- 工具：Unix Timestamp Converter（Unix 時間戳換算），`tools/unix-timestamp-converter/`
- 規格：`spec-unix-timestamp-converter-20261121`，draft spec PR #392，登記 rev 1807
- 規格來源（固定）：run 6 規格工作 `build6/specs/unix-timestamp-converter/docs/specs/unix-timestamp-converter/`（BRIEF.md、SPEC.md 8 節、fixtures.json 17 筆、AUTHOR-CHECK.md）；vendored 至 `test/fixtures.json`，SHA-256 `390c38ed95bcc6f28ee32c385b229cf170d220ebded8e032ef4491aea19b59b3`
- 實作來源：本分支 `muse/unix-timestamp-converter-production-20261121`，基底 `codex/initial-publication`（base commit `8c265267`）
- 候選 PR：draft PR #432（https://github.com/KYStr/glossquote-labs-home/pull/432），base `codex/initial-publication`。PR head SHA 以 `gh pr view` 於最終 push 後讀回，記於 parent 回報；本檔案的 commit 即為該 head 的一部分。
- 模式：build-first；實作不走 registry 生產登記（第五輪模式：直接做、開草稿 PR、逐件核對、記帳本）
- 授權：使用者 2026-11-23 四次知情確認（14:31、14:33:56、14:58:49、15:04:46）涵蓋本輪同一類執行風險提示；製作期間同一類提示再出現按授權繼續，不停問

## 做了什麼

- `public/js/core/unix-timestamp.mjs`：純函數 `run(input)`，依 SPEC 固定驗證順序（容量 → surrogate → 缺內容 → 文法 → 跨欄）實作雙向換算。民用 ↔ 絕對時刻用 Howard Hinnant 整數 `days_from_civil`，時間戳以 BigInt 毫秒攜帶，禁止浮點秒數換算、禁止 host 時區。時區偏移一律以 `Intl.DateTimeFormat` 帶明確 `timeZone` 取用內建 IANA 資料庫（SPEC rule 5）；core 全程不建構 clock 物件。DST 缺失／重疊用「迭代收斂＋鄰近候選＋round-trip 比對」解析：無候選為 NONEXISTENT_LOCAL_TIME，兩候選取較早者並置 `ambiguousLocalTime:true`。輸出 ISO 8601、RFC 2822、自訂格式（YYYY MM DD HH mm ss SSS）；報告 `unix-timestamp-report.json` 為遞迴按鍵排序的 compact JSON＋一個 LF。
- `public/js/controller.mjs`／`worker-handler.mjs`／`app.js`：沿用 run 6 第一波 house 模式（世代號 Worker、late reply 丟棄、取消／重設／dirty 失效、成功才可下載、30 秒內撤銷 Blob URL、textContent／value only）。
- `public/index.html`／`public/en/index.html`：雙語靜態頁，SPEC 釘選的 title／description／h1／三則 FAQ，preview noindex，無 canonical／hreflang，同語 home 連結用 `../../`／`../../en/`。
- `scripts/{build,check,check-generated,serve}.mjs`：preview build（兩次 byte-identical）、靜態 check（含 fixtures hash、core 契約、頁面契約、worker 拼接、禁能掃描、core purity）、生成物驗證、loopback serve（CSP 同 SPEC）。
- `test/`：`core.test.mjs`（14 筆字面 fixtures 全 deep-equal＋20 筆獨立推導邊界測試）、`controller.test.mjs`（3 筆字面 controller fixtures＋9 筆世代守衛測試）、`report.test.mjs`（手寫 canonical bytes、獨立重算、toJSON 永不呼叫、OUTPUT_LIMIT）、`site.test.mjs`（雙語頁面契約＋9 時區）。

## 驗證結果

- `npm test`：56/56 通過（見 VERIFICATION.md）
- `npm run check`：通過
- `npm run build:preview` 兩次 byte-identical（見 VERIFICATION.md，兩次 hash）
- `npm run check:generated:preview`：通過
- 真實瀏覽器（Chrome／Edge）、Network／Storage、200% zoom、觸控：NOT_RUN（本子代理無 live browser；見 VERIFICATION.md）

## Errata candidates（規格本身的問題，逐條列出；實作未默默改規格）

1. **Asia/Taipei「固定 +08:00」與 IANA 資料庫衝突。** SPEC 一處寫「Asia/Taipei 固定 +08:00、無日光節約」，另一處（rule 5）釘版偏移一律取自 `Intl` IANA 資料庫。IANA 給台北 1896 年前 LMT +08:06:00、1896–1945 年 JST +09:00，現代才是 +08:00。實作遵循具操作性的 rule 5（Intl），故 0001-01-01 的台北顯示為 08:06:00（+08:06），與 SPEC 的「固定 +08:00」字面描述不符。測試已按 Intl 值寫死（core.test.mjs「seconds range endpoints」）。建議規格改寫為「現代為 +08:00、無日光節約；歷史偏移以 IANA 資料庫為準」。
2. **LMT 偏移含秒數，但 SPEC 的偏移後綴格式沒有秒欄位。** 0001 年 America/New_York 偏移為 −04:56:02、Asia/Taipei 為 +08:06:00；ISO 後綴 `±HH:MM` 與 RFC `±HHMM` 無法表達秒數。實作顯示的 wall clock 是精確的，後綴為偏移四捨五入到最接近的分鐘。建議規格補一句後綴取捨規則，或把範圍下限改為標準時制開始之後。
3. **自訂格式「連續字母非 token 即 CUSTOM_FORMAT」的字面讀法禁止相鄰 token。** 按字面規則，`YYYYMMDD`、`mmss` 這類無分隔符的緊鄰 token 會被判 CUSTOM_FORMAT（最大字母 run 不是單一 token）。實作按字面規則（已在 core.test.mjs 鎖定 `YYYYMMDD` → CUSTOM_FORMAT）。若原意是貪心 token 解析，建議規格明寫。
4. **`timestampSeconds` 對負小數的定義未寫明。** SPEC 只釘版毫秒換算向負無限取整（−1.5 s = −1,500 ms），未說 `timestampSeconds` 是 floor 還是 trunc。實作取 floor（−1.5 s → `timestampSeconds` −2），使 `timestampMs = timestampSeconds × 1000 + 0–999 餘數` 恆成立。建議規格補一句。
5. **無效 `unit` 值時的 step 2／step 3 互動未寫明。** `unit` 的文法檢查列在 step 3，但 step 2 的單位判別與範圍檢查需要先知道單位。實作：`unit` 無效時 step 2 只做文法檢查（錯誤優先於 unit 錯誤），判別與範圍留待 step 3 回報 SCHEMA／unit；`timezone` 錯誤仍優先於 `unit` 錯誤（符合 step 3 內順序）。建議規格補一句。
6. **日期時間方向超範圍時的 `field` 未寫明。** 時間戳方向超範圍為 RANGE／`timestamp`（fixture 有釘版）；日期時間方向經時區換算後超出 9999-12-31（例如 9999-12-31 23:59:59 紐約時間）時，實作回 RANGE／`date`。建議規格補一句。
7. **`date`／`time` 欄位超長時的錯誤碼未寫明。** SPEC 只明寫 timestamp raw 最多 16 單元、customPattern 最多 64 單元；實作按總則「先容量」把 date >10、time >8、milliseconds >3 判 INPUT_LIMIT（與血壓工具的 house 讀法一致）。建議規格補各欄 raw 上限。
8. **月份／日期不存在的區分未寫明。** `2026-13-01`、`2026-04-31` 實作皆判 INVALID_DATE（視為不存在之日），只有形狀錯誤（分隔符／位數）才判 DATETIME_FORMAT。建議規格補一句。

## 已記錄的實作修正（測試抓到的真 bug，非規格問題）

- `offsetMsAt` 初版未扣毫秒餘數：wall-clock parts 無毫秒欄位，`civilToMs(parts) − utcMs` 會把毫秒餘數吃進偏移，導致毫秒 ≠ 000 的日期時間方向永遠 round-trip 失敗（NONEXISTENT_LOCAL_TIME）。已修正為先把 instant 截到整秒再算偏移；core.test.mjs「毫秒 5」案例鎖定此行為。
- `localToUtc` 初版用 localMs ±3h 探測偏移，會錯過重疊時段另一側的偏移（例如 LA 的 PST 只在 localMs +7.5h 才出現），導致雪梨／洛杉磯重疊取到較晚者。已改為迭代收斂＋每值 ±1h／±2h 候選＋round-trip 比對；Sydney／Paris／LA 重疊案例皆鎖定較早者。

## 下一位 owner

- 獨立 reviewer：對同一 PR head 做九面向驗證（SPEC acceptance 節），尤其 functionality／boundaries／privacy／security／compatibility；真實隔離 Chrome 與 Edge 兩語流程、Network／Storage、200% zoom 皆尚未驗證（NOT_RUN）。
- 規格作者：回覆上方 8 條 errata candidates；接受與否不影響本候選的測試結果（測試皆按 SPEC 文字＋註明的解讀寫死）。
- 主代理：整合 catalog／部署時，正式 origin 尚未配置（SPEC 規劃 `unix-timestamp-converter.glossquote.com`，未配置）；production build 被 build.mjs 明確拒絕。

## 授權提示紀錄

- 製作期間執行風險提示再次出現（2026-11-23 約 15:49，`exec` 列出工作區時），與第五輪／第六輪同一類別；按使用者當日四次知情確認的授權規則繼續執行，未停問。未出現不同種類風險。
