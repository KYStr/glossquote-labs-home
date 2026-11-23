# Unix 時間戳轉換 — VERIFICATION

- 工具：`tools/unix-timestamp-converter/`（Unix Timestamp Converter）
- 規格：`spec-unix-timestamp-converter-20261121`，draft spec PR #392，登記 rev 1807
- 規格 fixtures：vendored `test/fixtures.json`，SHA-256 `390c38ed95bcc6f28ee32c385b229cf170d220ebded8e032ef4491aea19b59b3`（byte-identical to the fixed spec fixtures）
- 分支：`muse/unix-timestamp-converter-production-20261121`（基底 `codex/initial-publication` @ `8c265267`）
- 候選 PR：draft PR #432（https://github.com/KYStr/glossquote-labs-home/pull/432），base `codex/initial-publication`。PR head SHA 以 `gh pr view` 於最終 push 後讀回，記於 parent 回報；本檔案的 commit 即為該 head 的一部分。
- 環境：Node v24.22.1，Linux VM，無 GPU；零 runtime 依賴

## 命令與結果（均實跑，exit 0）

| 命令 | 結果 |
| --- | --- |
| `npm test`（`node --test`） | 56/56 通過：core 34（含 14 筆字面 fixtures 全 deep-equal）、controller 12（含 3 筆字面 controller fixtures）、report 5、site 5 |
| `npm run check`（`node scripts/check.mjs`） | 通過：檔案、package 契約、fixtures hash、core 欄位／預設／時區／範圍／範例、雙語頁面、語法、worker 拼接、禁能掃描、core purity |
| `npm run build:preview`（第 1 次） | 9 個檔案寫入 `dist-preview/`，`BUILD-MANIFEST.json` SHA-256 `1180b33acecaeed9918be858d5668c0185ecdd1fb545f2bbea0bc7b8d9fc4301` |
| `npm run build:preview`（第 2 次） | 同上；`BUILD-MANIFEST.json` SHA-256 相同（`1180b33a…4301`），manifest 檔 diff 為空 → byte-identical |
| `npm run check:generated:preview` | 通過：9 個檔案與 manifest 逐檔 bytes＋SHA-256 相符、雙語 metadata、worker source 等於固定 core＋handler bytes、robots.txt deny all |
| `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 煙囪測試 | `/` 200 text/html，`/en/index.html` 200，`/nope.html` 404，`/../package.json` traversal 404；回應標頭含 SPEC CSP（`default-src 'none'; script-src 'self'; style-src 'self'; worker-src blob:; …`）與 `X-Robots-Tag: noindex, nofollow` |
| 內嵌 worker source 實跑（/tmp 臨時驗證） | `dist-preview/js/worker-source.js`（25,685 bytes）載入後 `run(epoch-zero)` 回 `ok:true, timestampMs:0, displays:2`；`self.onmessage` 回傳正確 generation 7 與 ok:true |

## 核心驗證重點（皆為實測，非推論）

- 14 筆字面 core fixtures：逐筆完整 deep-equal（成功為整個 result，失敗為整個 error triple）。
- 獨立推導邊界（期望值由 Python datetime／zoneinfo 預先算出，非實作輸出）：auto 判別三段邊界（10¹¹−1 秒、10¹¹／10¹¹⁺… 模糊、10¹² 毫秒）、秒／毫秒上下界±1、負小數 floor（−1.5 s → −1,500 ms／seconds −2；−0.001 s → −1 ms）、閏年 2000 是／1900 否、Sydney／Paris／LA DST 重疊取較早者＋ambiguous 旗標、London DST 缺失、東京午夜、0001-01-01 台北 LMT +08:06 顯示。
- 跨顯示一致性：dst-overlap fixture 的三組 ISO 顯示以測試內獨立重寫的 days-from-civil 反推，皆等於同一 timestampMs。
- Host 時區無關：14 筆 fixtures 輸出在 TZ=UTC／Asia/Taipei／America/New_York／Pacific/Kiritimati 四個子程序下 byte-identical。
- 報告：epoch-zero 報告 bytes 與測試內手寫 canonical 字串逐字相符；toJSON 陷阱物件證明序列化永不呼叫 toJSON；超大報告為 OUTPUT_LIMIT。

## 九面向證據狀態（SPEC acceptance 節；皆為本候選）

| 面向 | 狀態 | 證據 |
| --- | --- | --- |
| functionality | 實測通過（Node 層） | 56/56 測試；雙向畫面與完整報告符合核心 fixtures（core＋report 測試） |
| boundaries | 實測通過（Node 層） | 合法端點、剛好越界、第一個錯誤、驗證順序、controller 三態皆有測試 |
| privacy | 靜態證據 | 零依賴、無 fetch／storage／beacon（check.mjs 禁能掃描通過）；真實 Network／Storage 觀測 NOT_RUN（無隔離瀏覽器） |
| security | 靜態證據 | textContent／value only、無動態執行、CSP、固定下載檔名、報告上限、Worker／Blob dispose（程式碼＋check 通過）；敵意輸入 inert 有測試（lone surrogate、惡意字串、toJSON 陷阱） |
| usability | 部分 NOT_RUN | 雙語靜態頁、空／繁忙／取消／錯誤／修改／下載狀態機皆有 controller 測試與頁面契約；真實鍵盤／觸控操作 NOT_RUN（無隔離瀏覽器） |
| accessibility | NOT_RUN | 鍵盤、焦點、labels／errors、狀態、WCAG 2.2 AA、320px、真實 200% zoom、觸控、reduced motion 皆未以真實瀏覽器驗證 |
| localization-seo | 靜態證據 | 兩頁獨立 HTML、SPEC 釘選 metadata／FAQ 對譯、同語 home 連結、candidate noindex；正式 HTTPS／SEO 另驗（NOT_RUN） |
| toolchain-provenance | 實測通過 | Node 24.22.1、離線命令、exit 0、BUILD-MANIFEST SHA-256、兩次 build byte-identical、零依賴 |
| compatibility | NOT_RUN | 真實隔離 Chrome 與 Edge 兩語輸入、錯誤、reset、Worker、Blob 下載、reflow 皆未驗證（本子代理無 live browser） |

## NOT_RUN（明確列出）

- 真實隔離 Chrome／Edge 兩語流程、鍵盤操作、320px／200% zoom／觸控／reduced motion、Network／Storage 零請求觀測、Blob 下載 bytes 核對、正式 HTTPS／SEO、部署。
- 產品九面向獨立 reviewer 驗證（須由未參與製作的 reviewer 對同一 PR head 執行）。

## 已知限制

- 見 HANDOFF.md errata candidates 1–8（規格本身問題，實作已按註明的解讀鎖定測試）。
- 0001 年等前標準時制年代的 LMT 偏移含秒數，ISO／RFC 後綴四捨五入到分鐘（wall clock 精確）。
- 「現在」按鈕填入的是快照（Date.now() 毫秒），非即時更新；頁面標明為快照。

## 下一位 owner

- 獨立 reviewer：對同一 PR head 做九面向驗證，補齊上列 NOT_RUN。
- 規格作者：回覆 HANDOFF.md 的 8 條 errata candidates。
- 主代理：PR 整合與 catalog／部署；正式 origin 未配置，production build 目前被拒絕。
