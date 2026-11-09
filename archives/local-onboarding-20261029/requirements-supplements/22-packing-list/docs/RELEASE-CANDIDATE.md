# 發布候選紀錄：行李清單與重量試算

狀態（2026-10-13）：M1 R1 主驗已放行；PACK-M2-T01 production與PUBLIC來源已交付，待主代理M2複驗/M3部署。原M1/R1證據保留。最新repocommit02e9bc9a39ed12530e157806e49283455eb84632，ZIPsha48474e34fb48825733c600cadb709b77ba21b98c7749ac9c488404ca9f4a2bca。正式hosting與外驗尚未完成。

M2 evidence：../../.runs/github-publish/glossquote-labs-packing-list/m2-20261013-01/。38 source檔逐Gitblob驗證、固定ZIP安全解壓，workspace/ZIP-rebuild各68/68及六gates exit0，production12檔digest9b070df077b19d759d558e406e759f5017b8412678856c54a67c7420621f6eec相同。Git與Environment guards均PASS_UNCHANGED；owner本機CSP/native備份/缺頁驗完。WranglerCLI、Cloudflarelive、200%zoom/完整NetworkStorage/實體mobileAT NOT_RUN。

下表為保留的R1候選歷史；目前狀態以上方M2、HANDOFF與實際PUBLIC verification為準。

| 欄位 | 狀態 |
|---|---|
| M1 source manifest / SHA | ../../.runs/packing-list/m1-r1-20261013/source-manifest.json；逐檔 bytes/hash 與 reviewed-source |
| Node 版本 / 測試命令與 exit | v24.14.0 / npm11.9.0；R1 test 60/60、check、build exit 0，commands.json / final-*.log |
| 中文 / 英文 browser 主流程 | 原 M1 B01–B08/B11 未受影響證據重用；R1 雙語 native import error/recovery/preview/cancel/confirm/stale 重驗 PASS |
| 匯入、匯出、取消人工證據 | R1 真 FileChooser 合成 fixture：DUPLICATE_ID優先、UNKNOWN_FIELD形狀優先、有效preview/cancel/confirm/stale；匯出原M1 native證據重用 |
| 完整 Network / Storage | NOT_RUN |
| M1 主代理驗收放行 | NOT_RUN |
| M2 production manifest / source ZIP | NOT_RUN |
| GitHub URL / visibility / commit | NOT_RUN |
| Cloudflare live commit / 雙語 HTTP | NOT_RUN |
| 首頁 catalog / 兩語導覽 | NOT_RUN |
| 外部驗收 | NOT_RUN |

R1 code digest 1e56d7257093fd9993ba88be6a0e435331645edf6198fe5e20cb08e28178a310；runtime/dist digest 78db8ea2db30c6cca515459c47cdf88fc0f5bf20fb9120672760f5af6e0b8474。R1 Windows 全 Snapshots 比較 PASS_UNCHANGED。原 T00 source digest 368e690fa79b3384f0b9f6155cf2953c5a904efa8274e1f216d47e9ae8a26a48 保留作差異基準。

實際 200% zoom、完整 Network/Storage、實體手機/虛擬鍵盤/螢幕閱讀器 NOT_RUN，詳 HANDOFF。320 CSS px 已實測，不能替代這些項目。M1 本機 PASS 不代表主驗、M2、公開 source 或上線。

只可在對應任務完成時以固定輸入與證據更新；不得因範例或規格存在改成 PASS。
