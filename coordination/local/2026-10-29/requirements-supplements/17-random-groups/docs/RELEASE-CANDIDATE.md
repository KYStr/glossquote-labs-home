# 發布候選狀態

2026-10-13：**READY_FOR_INTEGRATION / OWNER_RELEASED**。M1_PRIMARY_PASS；production 11項產物、隔離Wrangler dry-run、PUBLIC source固定HEAD、ZIP逐38個Git blobs與完整解壓重驗均PASS。正式部署、HTTP、首頁與外部複驗仍 NOT_RUN。

| Gate | 狀態 | 證據 |
|---|---|---|
| M1 local tests/check/build | PRIMARY PASS | 主代理獨立固定副本53/53、check/build、bytehash與代表browser驗收 |
| 真 Chrome/Edge M1 cases | CORE PASS / 部分 NOT_RUN | 兩語 B02–B06；額外 Chrome 邊界、320px、鍵盤；完整限制見 HANDOFF |
| Primary M1 acceptance | PASS | 主代理已明確放行 RG-M2-T01 |
| M2 test/check/build/production | OWNER PASS | 57/57、check、preview build、production build/check、release source check 均exit0 |
| Wrangler offline dry-run | PASS | 既有4.147.0與本地schema；隔離process env無token，exit0，未部署 |
| Public GitHub source | PASS | KYStr/glossquote-labs-random-groups，PUBLIC，HEAD a8711a7cb8dc477dfee18c5667935c5be44602e1 |
| Fixed source ZIP / restore | PASS | 104713 bytes；38 blobs逐bytehash一致；還原57/57與所有build/check exit0 |
| Cloudflare `groups.glossquote.com` | NOT_RUN | 尚未部署 |
| 雙語首頁 catalog/backlinks | NOT_RUN | 尚未整合 |
| 外部驗收 | NOT_RUN | 尚未交付候選 |

後續每個 gate 分開記錄命令、版本、固定 commit、source ZIP bytes/hash、正式 URL、瀏覽器版本、PASS/FAIL/NOT_RUN 和剩餘限制。候選 URL、程式碼中的預期 metadata、Node mock 或舊快照都不是 live PASS 證據。必要自動 gate 失敗不能交付 production candidate；允許的人工 NOT_RUN 要逐項揭露。

固定 code manifest：`.runs/random-groups/m1-20261013-01a13361/code-manifest.json`，16 個 source/test/tooling 檔案，SHA-256 `c7d8f1dc648365d0adaf58b1530ce03eaa0b614165b6e26e117e1f07e6534e83`；runtime SHA-256 `6dc7af1d6c7b1d19f4bd500f5be0f1dc1348a920c27e47a3a205eb5e1046fc1a`。這些是本機固定輸入識別，不能當成 Git commit 或 M2 source ZIP。

M2當前固定manifest：`.runs/random-groups/m2-20261013-01a13361/code-manifest-m2.json`。21 code SHA256 `257780e59a915f93069bb819d99371c866802604508784ebdfbb9830520431e5`；11 production SHA256 `11512b2ae9c8c66bc8a6a2f8c44c271245f74d5561e55c2f2ba5ec385528d74d`；38 public source SHA256 `a2994eeaa3ba5cc322c309e1e66b4e908eb08eb6e7bfcda94eb1ed790036444e`。ZIP `random-groups-source-a8711a7cb8dc477dfee18c5667935c5be44602e1.zip` SHA256 `ca4a81cb5e7b01a7bbede325601b49dcac14cf5d7f2f89b9f9bfbcf8812b05d4`。core/app/i18n/styles與主代理驗收M1逐byte不變；owner/pubcopy/ZIPrestore三份production完全相同。這是正式靜態候選，不是live PASS。
