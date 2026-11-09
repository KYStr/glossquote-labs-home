# 物品標籤列印候選

## 目前 M2-R1 固定候選（2026-10-18）

PUBLIC_SOURCE_R1_VERIFIED，待主代理獨立主驗。唯一新候選 commit `3cc239b1476baa18adb62d649f49588432608c6b`（local／remote／API 相同），PUBLIC repo https://github.com/KYStr/glossquote-labs-label-printer ，branch codex/m2-label-printer。舊 `55f8387a…` 因 inventory 暴露風險被阻止整合；其歷史證據保留，不部署舊版。

- production manifest 在工具根 `dist-production-manifest.json`，已 gitignore；Wrangler assets.directory 仍 ./dist-production，該目錄恰好 12 個 PRODUCTION_FILES，沒有 manifest/source inventory。build/check/release 與兩個新增回歸都驗實際目錄；誤放 metadata 會失敗。
- 最終 workspace／reviewed copy 均 133 passed、0 failed/skipped；test/check/build/build:production/check:production/release:check 全 exit 0。public/ 十檔與六規格保持 M1 hash；無任何 UI 修改或重驗。
- preview manifest SHA-256 `dca8cd417e52872177154ecb32055488e024901d1f22d6e88aa845d69b0d8c4a`；外置 production manifest SHA-256 `3d897b543938e1a69b4fcb17a678cfc9ef7825fdef8967df5aceffcb42539437`。副本與工作區 byte-identical，23 source records，preview 10／production 12 asset records。
- 新 ZIP `glossquote-labs-label-printer-3cc239b1476baa18adb62d649f49588432608c6b.zip`，95413 bytes／41 files，無 prefix；SHA-256 `95fe375cd33c24409492b5cb280a9696bb3597d8789ba15e15dec873ed514348`，每檔與固定 git blob／reviewed source 一致。
- m2/r1/ 保存 publication／zip-verification／commands-final／commands-clean／deployed-assets／http-model-final／frozen-comparison／Windows 與 Git guard／兩份 manifest／完整 fixed-candidate。CLI 19 asset hashes、10 routes＋HEAD 通過；未執行 Cloudflare 或 live release。
- 全部後續 UI 仍 NOT_RUN_USER_FOCUS_INCIDENT；原生 print 四版型實體尺寸、完整 NetworkStorage、真機與 BFCache 等先前 NOT_RUN 不變。M3 與首頁仍僅主代理，等主動任務，不輪詢。

以下為 pre-R1 歷史候選；舊 production manifest 位置及 hash 不再是目前部署候選。

## 目前 M2 固定候選（2026-10-18）

PUBLIC_SOURCE_VERIFIED，等待主代理 M2 獨立驗收。M1 已 GO；本輪沒有部署、首頁修改或外部驗收。公開 repo https://github.com/KYStr/glossquote-labs-label-printer ，branch `codex/m2-label-printer`，固定 commit `55f8387a1eb1d335a57ec9cd4fa1864ba34fbf48`；remote／API full commit 均相同，visibility public。

- 131 tests（原 116＋15 production），0 failed／skipped；workspace 與 reviewed copy 六命令全 exit 0，見 m2/commands-final.json 和 commands-clean.json。
- preview manifest SHA-256 `1c920b5073bead10a763c5810242c1c640ca5f825dc484b3b80b55355cd2a2a6`；production manifest SHA-256 `b37174a8bc93ac1b1972a3e65c65d70d1cae517f4bd462140174b48eb321db2e`。兩份皆 23 source fingerprints，preview 10／production 12 asset records；自身排除，副本產物與工作區一致。
- Source ZIP `glossquote-labs-label-printer-55f8387a1eb1d335a57ec9cd4fa1864ba34fbf48.zip`，96260 bytes，41 files，SHA-256 `9044f5d96b55a14f191bdda02b33352928b5018134992084be4d863bad6eb616`；git archive 無 prefix，每檔與固定 git blob／審核來源相同。
- 固定 Wrangler 純 JSON／compatibility_date 2026-10-18／static-assets-only／metrics、preview、observability 全關。這是契約與 local HTTP 模型驗證，不是 Cloudflare/live 驗證。
- 實際 4210／5210 共 19 asset hash、8 production routes＋HEAD；兩語 canonical/hreflang/OG/JSON-LD/hash CSP、headers inherited removals、robots longest match、404 通過。public/ 十檔與六規格保持 M1，見 m2/frozen-comparison.json。
- Git settings guard capture/verify PASS；Windows 完整 Snapshots unchanged。固定 commit／ZIP 後無新 commit，後續狀態只寫本工作區。
- 全部 UI automation 目前暫停，後續為 NOT_RUN_USER_FOCUS_INCIDENT；原生 print／實體四版型／完整 NetworkStorage／真機／BFCache 模式等原 NOT_RUN 保留。事件前 model 雙語 metadata／空白初始化與截圖為歷史，不能證明 hidden 輸入隔離或目前 UI gate 已解除。
- 詳細交接與唯一 root evidence 下 m2/publication.json／zip-verification.json／publication-commands.json／fixed-candidate.json。M3／首頁僅主代理，等待後續任務，不輪詢。

## M1 歷史候選（以下不改寫）

M1_LOCAL_CANDIDATE_READY，2026-10-18，等待主代理獨立驗收及 M2 GO。非公開來源／live release／外部驗收交付。

- 純核心 C01–C24、schema、反射／getter、驗證順序、Unicode／UTF-8／數量、不可突變、版型／工具鏈／真實 loopback HTTP：npm test 116 passed，0 failed，0 skipped。
- 最終 node --version、npm test、npm run check、npm run build 均 exit 0。Node v24.14.0、npm 11.9.0，無安裝或外部依賴。
- dist/manifest.json 固定 18 個來源與 10 個靜態產物的 bytes/SHA-256，自身排除。manifest SHA-256：ac8bd6d532e1d8cd4fe8d80836945ba6d24ecf82bb70c2ff3cb8974a0f72746a。
- 根證據：.runs/label-printer/W18-30-M1-01a14c6b-20261018/；fixed-candidate.json 是完整工具檔案清單，spec-comparison.json 驗六份規格未改，commands-final.json／各 log／http-final.json／browser-results.json／截圖／environment-comparison.json 為實際證據。
- 實際瀏覽器完成兩語主要流程、修改失效、清除和語言確認、分頁／空白格、四版型長文字、320px、鍵盤焦點、純文字與歷史返回空白。最後只調整 print media 的相鄰頁 margin 重設及其回歸斷言，螢幕流程未變；最終重載確認空白初始狀態。
- NOT_RUN：原生 print preview、實體列印精度、完整 Network/Storage、真實 200% browser zoom、載入後離線及冷啟動離線、真正 JS-disabled、persisted BFCache 模式、低階真機、真實 screen reader/reduced-motion/mobile OS print。詳 HANDOFF 分項界線。
- Windows guard PASS，完整 Snapshots 前後一致；沒有 Git 發布，Git settings guard 本輪不適用。requested gpt-6.1-sol/max，backend identity 未獨立確認。
- 後續 UI 測試只用隔離隱藏瀏覽器分頁，不控制桌面/native/OS、既有分頁、剪貼簿或系統對話框，不再觸發列印。限制前的歷史結果原樣保留。

M2 未放行；production 工具鏈、公有 KYStr/glossquote-labs-label-printer、Git archive ZIP、Cloudflare、首頁及 external review 全未開始。M3 只由主代理處理。
