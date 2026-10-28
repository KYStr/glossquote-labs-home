# 成績目標試算候選清單

目前 M2：原對話已完成工具鏈與公開來源，待主代理獨立驗收，沒有部署；下面 M0/M1 段落保留為歷史。63/63 tests、check、production build/check、release:check 及乾淨副本 gates 全 exit0。M1 public/dist 20份原件 bytes/SHA 不變。

- PUBLIC source：[KYStr/glossquote-labs-grade-target](https://github.com/KYStr/glossquote-labs-grade-target)，branch codex/grade-target-m2，固定 commit **66c574d718c1cf17b79f5510975ba46615296789**，遠端 ref 與 default branch 已核對。
- Flat git archive：根 `.runs/grade-target/m2-20261017-source/glossquote-grade-target-source.zip`，109838 bytes，SHA-256 **a8d8c7fe7af36a84a7b7c917d4d07efc89077abf668145c0265e0f511fb2cda0**。44檔逐一與 Git blob 及審核副本一致，package.json 在 ZIP 根。
- 全 source manifest / archive verification / publication commands：同目錄 `source-manifest.json`、`archive-verification.json`、`publication-commands.jsonl`。Source entries fingerprint f278b90dda58c87132835a91d63ab20c189d39983b0eb114ed79190c55874dc6。
- production manifest：`dist-production/manifest.json`（同時保存 evidence/production-manifest.json），12產物，manifest本身1894bytes / SHA-256 b4dc09c2bd20967cde76d11635cbf58260c59f6f60fce06c0e7385838e7cde75。
- 44檔 reviewed publishing copy 在根 `.runs/grade-target/m2-20261017-source/publishing-copy/`。6份說明/狀態文件為明確公開版本，排除本機路徑、對話ID及環境指紋；差異 hash/reason 完整記入 publication-review.json；程式/測試/config及重建的所有產物逐位元一致。
- Environment 前後完整 Snapshots 相同；Git settings guard capture/verify及after fingerprints相同。未改 persistent 設定或 gh auth；Cloudflare呼叫0，未讀token。5208只本機HTTP模型；正式站/首頁/外部驗收尚未完成。

目前SPEC_ONLY。沒有程式、測試結果、固定commit或部署。M1完成後記錄public/core/app/工具鏈固定bytes與SHA-256、精確命令及exit、假資料瀏覽器結果、NOT_RUN及必要gate。M2另附PUBLIC repo/remote commit/source ZIP/各檔與git blobs一致證據及production manifest。M3由主代理完成。

## 2026-10-17 M1 固定本機候選

以上為 M0 歷史。現狀：**本機候選已建立，待主代理最終獨立驗收，尚未 M2 GO**。

- 候選：M1-b1607c5df51aa350；19 份程式/測試/工具鏈來源清單 SHA-256：b1607c5df51aa350e34c5a9af0d18f69668bf441943e9281a5599f0c4e5aacae。
- 完整 manifest：根 `.runs/grade-target/m1-20261017-implementation/candidate-manifest.json`（各檔 bytes/SHA-256，來源與 11 份 preview 產物）；build 原生 `dist/manifest.json` 排除自身。
- 最後 `C:/Program Files/nodejs/npm.cmd test` exit 0，57 pass/0 fail；`run check` exit 0；`run build` exit 0，11 檔、preview noindex。build 內部 verifyBuild 與候選固定時 verifyBuild 都通過；測試最後僅補上界 oracle/移除無效 assertion，未改 build inputs。
- calculate-target.js：3866 bytes / fd5cedc00279c58f17cb368c6eb49125c2221eb3eb9efb88d2924a7ebb49595f。主驗後唯一 public 更動是 raw.length > 320 名稱預檢；原 257 oracle 證據是舊 core hash，最終主驗需重新固定。
- 瀏覽器與 NOT_RUN、環境完整前後比較及命令紀錄見 [HANDOFF](../HANDOFF.md)。真機、原生或完整觀測未驗不能以 mocks/HTTP 替代。
- public source 未發布，Cloudflare 未配置/未部署，首頁未更動；5208/production/release:check 均屬 M2，未開始。
