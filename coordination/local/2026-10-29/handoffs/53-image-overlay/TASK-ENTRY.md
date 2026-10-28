# B20-53-M1 工作紀錄

2026-10-23（Asia/Taipei）。配置請求：gpt-6.1-sol / max；實際 backend 未獨立確認。

本輪只完成 T00 → T04 本地候選。完成條件：兩語可操作靜態頁面、真實像素演算法與 PNG/JSON 匯出路徑、離線假資料及競態測試、check/build、固定來源 bytes/SHA-256 與環境前後證據。M2/M3 及外驗另行放行；本輪不開 server、browser、CUA，不發布或部署，不另建 ZIP。

已讀本工具全部 14 份規格/契約，以及根 AGENTS、SECURITY-BASELINE、PRODUCT-THESIS、GLOSS-TOOLS-DESIGN-SYSTEM。工具 docs/DESIGN-SYSTEM 與根設計契約 bytes 相同。採用 frontend-design 作介面方法參考；本工具規格優先。唯一寫入範圍遵循 TASKS。

## 介面決定

Product App 模式。使用者：設計校稿者；工作物件：同尺寸改稿前後圖；成功：可見疊合/差異與正確 counts，可下載比較 PNG 與 JSON。輸入不保存；語言切換前提示未匯出資料會失去。一般設定可逆；清除頁面即釋放本頁引用，不宣稱安全抹除。

永遠顯示：兩個來源與視覺尺寸、模式與相鄰數值、比較/取消/清除、結果狀態。相鄰：fit/100% 檢視、PNG/JSON 下載。漸進：規則與 FAQ。字體使用系統 fallback，沒有新增圖像/字型依賴。

```text
桌面  標題 / 首頁 / 語言
      來源A / 來源B / 限制
      模式 + opacity + threshold / 比較 / 取消 / 清除
      大比較畫布                       fit / 100%
      counts / 尺寸 / PNG與JSON
      規則 / FAQ
手機  標題 → A → B → 模式與設定 → 操作 → 畫布 → counts與下載 → FAQ
```

單一畫布並保留兩個來源 File/像素 buffer；逐張 decode 後立即 close bitmap。設定/來源變更同步撤銷舊輸出，generation 淘汰晚到結果。像素計算每批最多 100,000 並讓出事件循環。100% 檢視只改呈現，不改匯出像素。

## 研究

唯讀參考 `39-image-redactor/public/js/core/format-headers.mjs` 的 PNG/JPEG header parser，複製後在本工具收緊界線、完整結尾、PNG EXIF 與 malformed tests；沒有 runtime 跨工具引用。
原生 API 參考：[createImageBitmap](https://developer.mozilla.org/en-US/docs/Web/API/Window/createImageBitmap)、[Canvas toBlob](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toBlob)。from-image 由 decoder 套一次方向，核對 visual 尺寸；toBlob 可能回傳 null，必須固定錯誤與失效。API 文件不是本工具 browser 驗收證據。

## 狀態

T00 → T04 已依序完成；經主代理審碼修正下載 lease 競態後，最後固定 44 files / 209,285 bytes，SHA-256 `813428cbaead26585edf6d257b4ece8fcec5becfb397f5c53638b7c781eeb245`。最終 npm test 41/41，check/build exit 0，6 個真實假資料 PNG／JSON 證據及 public/dist bytes 核對通過。所有命令／來源 manifests／歷史失敗均保留 evidence/m1。

T04 初次有浮點證據斷言過嚴，已保留 attempt-1-float-assertion，再修正斷言容差後固定最終來源；不是像素 counts 或產品演算法失敗。最後環境 guard PASS，User/Machine PATH 與完整 Environment fingerprints 前後相同。

主代理指出第一候選的同格式下載可能沿用舊 URL，已用 A→B 無時間推進的真實不同 Blob bytes 反例重現，再把 lease 重用映射改為結果 revision 歸屬、timer 清除按物件 identity。PNG／JSON 均覆蓋，修正前 exit 1、後 exit 0。舊候選及原始來源變更 bytes 保存在 evidence/m1/superseded-1-before-lease-fix；不得當作現行驗收 PASS。TECHNICAL 未設 PNG 輸出 bytes cap，未擴大此範圍。修正前後 environment guard 亦與原始 baseline 相同。

所有真瀏覽器／原生／真機項目仍為 NOT_RUN_USER_FOCUS_INCIDENT。沒有啟動 server、browser，沒有 CUA、桌面輸入或截圖；現有程序與分頁均保留。M1交主代理獨立驗收，未執行 M2/M3；完整限制與下一步見 [HANDOFF](HANDOFF.md)。

## 2026-10-23 追加：B20-RP-53 M1B

完整讀取最新 `.runs/batch20-release-prep-2026-10-23/TASK.md` 後完成離線發布準備。只改本工具 package／.gitignore／scripts／tests 與追加交接紀錄；新檔 M1B-RELEASE、evidence/m1b、release-artifacts。原 public／dist／M1 evidence 的 94 檔逐 byte 保留；測試 fixture 已移入 m1b，沒有重跑真 preview build。

固定 origin `https://image-proof.glossquote.com` 與 toolSlug `image-overlay`；build:release／check:release 新增零依賴靜態候選，M1 pin、SEO head-only 轉換、獨立重建預期 bytes、15 site 檔與 sibling manifest、防竄改／未知輸出／junction 拒絕。合法重建是 no-op，沒有覆寫／遞迴刪除產物。

針對性 release 11/11；最後完整 npm test 52/52，check、build:release、check:release 皆 exit 0。固定來源 49 檔／244,972 bytes，SHA `f69789f42579396da942fb12f377fb0b861ecffa85b90210406857f5785ff3b8`；產物 16 檔／97,973 bytes，SHA `6b6ba77aa0f4c5dbdd7736c4b1eee6d70cbcbeca4c6f2858e844f8fbd7dc794c`。envguard 前後及全部 Environment fingerprints 一致。

本輪配置請求 gpt-6.1-sol/max，backend 未獨立確認；不是 M2 放行。browser／原生／真機／Network／Storage／實際 hosting headers／404 仍 NOT_RUN_USER_FOCUS_INCIDENT；GitHub／部署／首頁／外驗均未執行。主代理依 [M1B-RELEASE](M1B-RELEASE.md)與 evidence/m1b 回收獨立驗收，後續 browser 應用 release-artifacts/site。


## 2026-10-27 — B20-53-M2A 正式發布準備

本輪放行只到 M2A，狀態 PREPARED_AWAITING_ROOT_M2A_REVIEW；未 push／deploy／首頁整合／外驗，M2B 由 root 驗收後在原對話另發。完整當前說明見 [M2A-RELEASE](M2A-RELEASE.md)。

新增固定 assets-only wrangler.jsonc／release-config validator，compatibility_date 2026-10-24，domain image-proof.glossquote.com；Worker／vars／bindings 無，workers_dev／preview_urls／send_metrics／observability logs／invocation_logs／traces 均關閉。assets 指向 ./release-artifacts/site，run_worker_first false、html_handling none、not_found_handling none。只新增精確三列 301 _redirects（最後 LF）；manifest schema 2 固定 config bytes/SHA。沒有候選 title 前綴可移除；public、runtime、CSP、既有 15 site 檔及所有舊 evidence bytes 均不變。

先驗原 manifest 166eeb51aee5b522433041911bb3e5de9214d4d345e5dc523c4128aa4e5df50e，完整封存原工具 166 檔至 .runs/batch20-completion-2026-10-27/owner-53-release/baseline/tool-projects/53-image-overlay/，SHA 1482815b85e86143ec7a76dcbd293d12a1c376d8c12c96af1a5375796de96b71。只移動核對過的原 release 容器，未放寬 builder 或覆蓋未知產物。

實際 npm test 57 pass／0 fail／0 skip；check、build、build:release、check:release 均 exit 0。User／Machine PATH type／length／SHA／ephemeral count 與全部 Environment fingerprints 前後完全一致，完整紀錄在 owner-53-release 的 checks-attempt-1、environment comparison、source/artifact manifests、scope-diff 與 summary。

固定來源 52 files／259057 bytes，aggregate SHA-256 6ca6f23f62cc6b37724674a7cc06213a9654b3d0aae6af06a960ade15b780049。產物 17 files／98339 bytes，aggregate SHA-256 91a6d1325e54a0b68b833b334204371bd13edf3b21b4ab99dd1a45c11dcb1d02；site 16 files／93660 bytes。release manifest SHA-256 9dff81068b000859a01f65ad29960ad00de520b48a7f8c4cbd71b9de99c92423；config SHA-256 07e88b12d55444806459f72e9b78f1958e9548c74edd144c7b9c1828a807e466。Aggregate 採排序 path + NUL + bytes + NUL + sha256 + LF；固定 source 排除可追加 HANDOFF／TASK-ENTRY、evidence、dist、release-artifacts。

root r3 真 browser 8 PASS／0 FAIL／prohibited 空，加上 root 親看 7 張截圖，只替換原兩個 keyboard FAIL，合併 40 PASS／12 NOT_RUN。owner 未跑 browser；root 審查 record 及 r1/r3 result hashes 見 browser-acceptance-reference.json。原 12 NOT_RUN 維持；Wrangler dry-run、正式 301／headers／404 transport、publication、hosting、首頁與外驗仍 NOT_RUN。配置請求 gpt-6.1-sol/max，backend 未獨立確認。


## 2026-10-27 — B20-53-M2A-F1 固定 build hook

root 指出 M2A 缺 build，不能通過共同部署 gate。已補精確 build:{command:'node scripts/release.mjs build'} 到 wrangler.jsonc／expected config，新增六種 build 缺少／改動／擴權與偽造 manifest 的拒絕測試；沒有改 public／runtime／CSP、16 site assets 或 release builder。manifest 僅更新 config bytes／SHA；舊 M2A 完整 170 檔已驗證封存到 .runs/batch20-completion-2026-10-27/owner-53-release-r1/baseline/tool-projects/53-image-overlay，原 owner-53-release 證據保持。

受影響 release tests 17 pass／0 fail／0 skip；check、build、build:release、check:release exit 0。原未變 41 項沿用既有證據，不宣稱本輪全套 58 PASS；環境前後一致。新來源 52 files／261961 bytes，aggregate SHA-256 2b1229a213b58dc3f576aad1c09993f9556e64c8e8949a2131b26407834878ac；產物 17 files／98339 bytes，aggregate SHA-256 65b76387835f097f0c6e6b918b4cfe1d4f9e58440991ba0cb70cf529bcb58019；release manifest SHA-256 eb1846452f7d7987c45f6342f3df20d224581a1f33c2646a5d46b12ceecbd43b，config SHA-256 81b027a0932da571072d1dbb32ba0c5520a0c665e140c2b8212bfc5272addff6。固定 source scope 與 aggregate 格式同原 M2A；完整 evidence 在 owner-53-release-r1。

狀態 FIXED_BUILD_HOOK_AWAITING_ROOT_REVIEW；本輪未 UI／Wrangler dry-run／repo create／push／deploy／首頁／外驗。root 表示 GitHub repo create 有頻率限制，後續 M2B 僅可依新指示準備 local copy，不 create。root 邏輯40 PASS／12 NOT_RUN 沿用，未變能力缺口不轉 PASS。
