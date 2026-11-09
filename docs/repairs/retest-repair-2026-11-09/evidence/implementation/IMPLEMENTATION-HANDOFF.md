# 外部重測兩項修正：本機實作證據

範圍：維護任務 `labs-retest-repair-20261109`，主協調 claim `retest-claim-04ec86c6-730f-4065-8288-b955b1f02b6a`。此交接只包含本機實作與檢查，沒有寫入 GitHub、registry 或正式部署。

## FUNC-M2-01：朗讀句子分割

舊版對 U+3000 與 U+00A0 各回傳一句，ASCII 空格與 tab 回傳兩句。新增回歸套用到未改動核心時，兩項檢查如預期失敗；見 [原版紀錄](tts-baseline-new-cases.log)。現以 Unicode `White_Space` 判定拉丁終止標點後的空白，保留 CR/LF 無條件分段、原有大寫／數字／引號起句限制及分段後 trim/chunk 規則。分割時僅消耗句間空白；小寫續句、縮寫內的空白與小數照原樣保留。

[來源 patch](tts-source.patch) 只改核心及核心測試；原始 24 檔依固定提交 `541a0cd73fd24fc3536501793d551bfa81f63524` 的既有遠端 blob readback 及 source tree 逐檔核對。8 個既有 dist 檔另以其歷史輸出 manifest 驗證，並獨立重建；新版 8 檔中只有 `js/core/tts.mjs` 的 bytes 改變。現有 140 站發布的 TTS 核心同舊版固定來源，無需以舊發布覆蓋其他檔案。來源 SPEC 的 SHA-256 與既有 CANDIDATE-MANIFEST 相同。

## FUNC-M2-02：流動字級語言控制

140 站發布的中、英文 HTML 各有兩個切換顯示的公告 aside；原先兩個 aside 各含一個會重新載入頁面的重複語言連結。[發布 patch](fluid-release.patch) 從每頁各刪兩段 ` · <a ...>...</a>`。兩個頁面既有的 `#language`、公告文字、首頁與待驗目錄連結、CSP、head、原產品其餘 markup 都逐字不變。原有 app/state JS 不改，因此同頁切換及普通 reload/pagehide 仍沿用原本的狀態行為；沒有新增 storage 或 query。

現行發布物：在 140 站封存發布複本讀取兩個 Fluid HTML，呼叫 [純函式](inspection-overlay-fix.mjs) `removeFluidLanguageLinks(html, { slug: 'fluid-typography' })`，或使用 [輸出清單](patched-output-manifest.json) 所指 `patched-release/` 下的兩個檔案。函式依 canonical、頁面語系、原產品語言控制及雙語公告的精確標記驗證範圍；已修正的輸入重跑原樣返回。

未來重建：在 `prepare-release.mjs` 對候選首頁呼叫 `overlay(html,{origin,en})` 後，緊接呼叫 `removeFluidLanguageLinks(html,{slug:c.slug})`，再轉成 bytes 並走原有 manifest/CSP 驗證。其他 slug 直接原樣返回。這能在保留 Fluid 公告與首頁／目錄功能的情況下，阻止舊 overlay 重加重複切換。歷史 release/prepare-release 未修改。

## 驗證與限制

- [來源 manifest](source-manifest.json)、[修改及輸出 manifest](patched-output-manifest.json)：完整路徑、bytes、SHA-256，來源另附 Git blob SHA。
- Node v24.14.0，[baseline 命令](baseline-commands.json)：新回歸對舊核心預期 exit 1，兩項重現失敗。[修後命令](final-commands.json)：TTS [`npm test`](tts-test.log) 32/32（含雙語 fake voice 覆蓋）、[`npm run check`](tts-check.log) PASS、[`npm run build`](tts-build.log) PASS、[雙語 overlay](fluid-overlay-test.log) 4/4。
- [環境前值](environment-before.json) 與 [環境後值](environment-after.json)：PASS，User/Machine PATH 類型、長度、雜湊、暫存路徑數、完整 Environment key 指紋全部相同。
- 桌面／本機瀏覽器互動為 `NOT_RUN_USER_FOCUS_INCIDENT`。本次無瀏覽器合成語音、實際狀態切換與 Back/Forward、操作系統對話框、不同瀏覽器及裝置、讀屏的新增結果。原本的本機語音限制及 Fluid 導航程式保留；證據為原始檔案與離線測試。正式部署、現網抽驗與外部重測由主協調另行記錄。
