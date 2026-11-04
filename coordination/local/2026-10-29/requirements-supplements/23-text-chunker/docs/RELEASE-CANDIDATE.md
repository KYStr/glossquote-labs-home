# 發布候選紀錄：文字分段與字數限制

狀態：CHUNK-M1-R1 修正候選凍結，等待 primary independent recheck；沒有 production candidate。當前證據在 `.runs/text-chunker/m1-r1-20261013/`，原 M1 證據保留（相對孵化器根）。

| 欄位 | 狀態 |
|---|---|
| M1 fixed source manifest / SHA | source/code/runtime/dist manifests 已固定，逐檔 bytes/SHA256 |
| Node version / npm test / check / build | v24.14.0 / 59 PASS / exit 0 / exit 0 |
| A01–A28 | PASS，literal fixtures；0 skip |
| Browser 中文 / 英文主流程 | PASS，R1 affected native copy/edit/reload、英文320px鍵盤；原主流程證據保留 |
| CHUNK-M1-R1 state-instance callback collision | 修正；actual app ESM 整合8組 + 空replacement/owner測試 PASS，red/green/trace/diff留證 |
| Keyboard / IME / 320px / 200% | Keyboard/320px PASS；synthetic composition 回歸 PASS（不是 native）；真設備 IME、實際 200% NOT_RUN |
| 原生 clipboard / fallback | 成功 payload BC/Z PASS；原生負向/pending NOT_RUN；manual readonly selection PASS |
| Network / Storage | 完整 DevTools 各自 NOT_RUN |
| 真 BFCache + 原生 pending clipboard 跨 state 回呼 | NOT_RUN；controlled integration不冒充 native |
| 主代理 M1 放行 | NOT_RUN |
| Production metadata / 404 / headers | NOT_RUN |
| GitHub public visibility / commit / ZIP | NOT_RUN |
| Cloudflare / homepage / external review | NOT_RUN |

只可跟隨固定版本更新，不可把模擬或原規格預期改寫為 PASS。

R1 code digest `538aeb379eff1e85b1998a14f00dd35e0de9d5e6e6ca0be1d8c3246b41259621`；runtime/dist digest `3608f282455e7f666e967d11121e144463429bd9790a556b976ee77d19aa474c`。
R1 Environment before/after full Snapshots identical，guard PASS。兩個同值ticket的舊resolve/reject不再改新copy；actual production app直接import執行，未重寫回呼邏輯。原生 clipboard Permissions Policy/opaque frame 的歷史測量缺口仍 NOT_RUN。完整 input/output、commands/exits、限制與 milestone 見 HANDOFF/TASK-ENTRY。
