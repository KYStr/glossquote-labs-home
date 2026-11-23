# NEW22 修訂 2：靜態來源保存

這裡只保留原修訂 2 的七個第一方來源／靜態檢查檔。每個檔案的原 bytes 和 SHA-256 見 [PROVENANCE](PROVENANCE.json)。原封存清單 SHA-256 為 `3f5fec3cfa159f3fc030ba20294c048c94672c45997e3b492317032cdd40e5fe`。原 DLL hash 是歷史收據；沒有提交 DLL，也不宣稱不同編譯器能產生同一 binary。

原驗證範圍為 C# x64 靜態編譯 exit 0、warning-as-error、128 狀態來源契約與 AST／語法檢查。若後續另需重跑靜態檢查，先把這整個目錄複製到獨立、未追蹤的審查副本，再使用已存在的 Node／Framework CSC。保留原 src 及 history 供比較：

```sh
node static-check.mjs static-1
node lifecycle-static-regression.mjs
node --check idle-node.mjs
```

這些是原靜態重現命令，M1 沿用未變來源的既有結果，沒有重跑或載入 DLL。不要執行 Primary-Adapter、idle Node 校準或瀏覽器。原生 CloseHandle failure injection、PSS/desktop proof、kill-on-close、完整 Chrome＋Edge T02 維持 NOT_RUN。

接續邊界：可信離線校準可使用已證明非互動的 station；本任務新建 desktop 的專有來源、原始 handles、完整 owned job 和失敗時保留宿主的能力仍是必要條件。station 可共用，不能靠名稱判定物件，也不宣稱對惡意同使用者程式的隔離。實際宿主由主代理另審。待釋放／失敗／回執不全時保留宿主，不能自動退出或清理不明程序。
