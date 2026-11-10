# Run 5 維修候選獨立審查及退修

審查 `bdd389bce274a30b813059b5182d21a9f41ca080`，對應 [PR #283](https://github.com/KYStr/glossquote-labs-home/pull/283)，讀回為 OPEN draft。審查者 `local-codex:01a0c75e-24c2-76e1-8c70-536ae1ad1fbf:/root/run5_independent_review` 未參與製作，已以本人身分確認 contract `2026-10-29.1` 及首頁基線 `26525d5f6380915ea95dde879dec769442db0d95`，在 revision 1526 讀回 ACK。原 owner、claim 及提交在 revision 1527 可核對。這次依開工前固定的三項維修標準審查。 [固定維修標準](https://github.com/KYStr/glossquote-labs-home/blob/a4d3d11e91391042fcfc644ed020d28b60909266/docs/reviews/run5-legacy-repair-2026-11-10/MILESTONE.md)

| 面向 | 分數 | 結果 |
| --- | ---: | --- |
| `repair-correctness` | 97 | 646 組獨立驗證通過，並核對主代理 616 項測試及各款離線 gate 的 60 份日誌 |
| `source-provenance` | 84 | 原 52 個 PR head、40 個規格 owner 與 370 個原始檔匹配。維修候選 484 個檔案中，6 個本機原始位元組與遠端不一致 |
| `status-delivery` | 82 | ZIP 內部路徑、雜湊與連結通過，6 個檔案與 ZIP 聲稱固定的 GitHub 候選不一致 |

## 實際驗證

- `node cases.mjs`（Node v24.14.0）退出碼 0，涵蓋薪資容量優先及整元 half-up 共 246 組、年齡短二月與公曆日期差 72 組、料理 20 個字面 core fixture 加 `liter` 容量邊界共 21 組、工作日 301 組。工作日驗 400 個不同日期、401 列回 `ROW_LIMIT`、8192／8193 UTF-16 容量、LF／CRLF、`-0` 輸入拒絕及反向例。首次腳本把空白列補成含空格的非空列，候選依規格拒絕，將審查輸入改為實際空列後通過。
- 同一腳本在審查副本執行 `node scripts/build.mjs --mode preview`，產出 10 個靜態檔。用生成的 Worker 程式在真正 Node module worker thread 上驗成功、無效日期、取消、頁面離開的 controller 清理、重設與編輯共 6 組。靜態核對 Blob module Worker 建立、終止時回收 URL、建構失敗時回收 URL 和 `worker-src blob:`。這些證據涵蓋 Node thread 與原始碼，瀏覽器引擎、CSP 實際強制與原生下載均為 NOT_RUN。
- `node provenance.mjs` 讀取 GitHub 的 PR、固定 commit trees、spec 及 registry。遠端差異 484 個檔案全在預先允許路徑，52 個原 PR head 仍 OPEN draft，40 個原規格 owner 及提交吻合，370 個原始檔由固定 Git blob 對回。四個錯誤的規格 SHA 已在 HANDOFF／VERIFICATION 修正，且每個新 SHA 都可讀到指定 SPEC。60 個主代理 gate 日誌按 SHA-256 讀回，616 項測試皆通過且沒有跳過，檢查主代理的兩次建置雜湊比對流程。未重跑整套 616 項；獨立重跑的是上面 646 組。候選 142 條相對 Markdown 連結逐條以區分大小寫的遠端樹驗證。此命令因下列六個候選檔案雜湊差異退出碼 1。
- `python archive.py <zip> <sha256>` 退出碼 0。第一版 ZIP 1,164,422 bytes，SHA-256 `e401f5a001746e5362ab4663ebc09c1b0d2c1d50dbf8d4609065668e2cf8e497`。495 個成員無重複或大小寫碰撞，單一根入口，無路徑逃逸或連結檔，所有 manifest 及 146 條相對 Markdown 連結在包內吻合。這個檢查驗證 ZIP 內部，還要通過候選 Git blob 比對才能交付。
- 比較兩份 Windows 持久環境檢查，HKCU/HKLM PATH 及完整 Environment-key 指紋相同，暫存路徑 0。Git 設定指紋一致。實際瀏覽器、實體裝置、輔助科技、瀏覽器 Network/Storage、原生下載、正式 HTTPS/SEO、完整產品九面向均為 NOT_RUN。這輪沒有合併、部署或變更首頁。

## 差異與來源

- 餐費工具的稅／小費均分與既有逐人墊款結算在規格與雙語頁面有清楚區隔。完賽預測正確描述舊工具的自訂已知距離、預測配速與四個標準目標，維持自訂目標的用途。 [Bill Splitter 固定規格](https://github.com/KYStr/glossquote-labs-bill-splitter/blob/c82e8a182b36cf9568e28d9179a923e0fdaf7a4b/PRODUCT.md#L5-L9) · [Running Pace 固定規格](https://github.com/KYStr/glossquote-labs-home/blob/40a7dc689e8e2fc2c527c323ca68398d95e9db19/docs/specs/running-pace-calculator/SPEC.md#L6-L23)
- 健保署指定 115.1.1 生效表第一級確認 29,500／458／1,428／238。Compendium 八列 code/MET 與 2024 官方對照一致，範圍限定於這次補核的資料。 [健保署](https://www.nhi.gov.tw/ch/cp-19418-9eefb-2576-1.html) · [Walking](https://pacompendium.com/walking/) · [Running](https://pacompendium.com/running/) · [Bicycling](https://pacompendium.com/bicycling/) · [Sports](https://pacompendium.com/sports/)
- BoM 公開式載明 17.27／237.7 與 6.105，候選明示既定模型使用 6.112。University of Miami 公式頁首次讀取逾時，由官方網站的搜尋索引頁面內容核對 17.625／243.04。依規格撤回未證實的 Lawrence 歸屬與全域誤差上限；本次沒有驗證模型科學精度。 [BoM](https://www.bom.gov.au/info/thermal_stress/) · [University of Miami](https://mrg.rsmas.miami.edu/Humidity.html)

## 阻止驗收的缺陷 R5-BYTES-01

本機與第一版 ZIP 的候選檔案清單記錄 CRLF 原始位元組。GitHub 固定樹下列 6 個檔案使用 LF。逐檔將本機 CRLF 正規化為 LF 後可重現遠端 Git blob。其餘 478 個檔案原始位元組相同。這也使 `CHANGES.json` 的兩個產品文件雜湊無法對回遠端。

| 路徑 | ZIP／本機 Git blob | GitHub 固定樹 Git blob |
| --- | --- | --- |
| `docs/reviews/run5-legacy-repair-2026-11-10/CHANGES.json` | `bfdfeb3094ae22c2289509a3a1f98185a83ec188` | `b13807801820e7bc1a4f3e61557fbff741b23468` |
| `docs/reviews/run5-legacy-repair-2026-11-10/primary-checks.json` | `4c6f471d23d641727ccc07831e9e6aa433e6edf5` | `73b4c0f255ea6ce54fefb639d18afd9ce4cf39e7` |
| `docs/reviews/run5-legacy-repair-2026-11-10/PRIMARY-RESULTS.json` | `c8cb3cc2437aefc4b14523f0e665e26d1fc1b756` | `faa5d041301eef64f604ca7a5a7121a1fca6c452` |
| `docs/reviews/run5-legacy-repair-2026-11-10/REPORT.md` | `ca61bcc1d0e969922507b5f77ca9feefa9141081` | `f9bd882b122db6b59ee605c8ab6ae57d565c34ac` |
| `docs/specs/salary-converter/SPEC.md` | `09092904951f18b58135ab0a04338133ba3fa618` | `5e2d5815c4d7cd297c69938fe2db4fead6dfd64f` |
| `tools/workdays-calculator/HANDOFF.md` | `6c1087ce9a14fcfe38f671044a44c32c4415a261` | `72db6421f71f05592f0494fa2d3eb086aa406844` |

回原 maintenance owner 對齊固定遠端 bytes，重算 `CHANGES.json` 及候選清單，重新交驗。複核以新固定 PR head 的完整檔案比對、修正證據與單 ZIP 為範圍。相同的產品程式與測試輸入可以沿用本次功能驗證。早期候選中的大小寫連結與 CSP 說明問題已在本輪固定候選確認修正。無其他阻止這個維修里程碑的缺陷。
