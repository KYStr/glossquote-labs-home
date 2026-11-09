# 加班費計算機 R3 驗證

2026-11-10，Windows Node v24.14.0。命令在工具根目錄執行，使用離線合成資料。此紀錄為實作者的本機結果。

| 檢查 | 結果 |
| --- | --- |
| 來源與規格 SHA-256 | 來源基線及原規格清單所列的 32 個檔案全數相符。 |
| 修正前重現 | 月總平日 3 小時回 NT$650，月總休假日 2 小時回 NT$1,200。舊核心接受月薪 getter 並呼叫 1 次。 |
| `npm test` | exit 0，46 pass。涵蓋 19 個字面核心、3 個控制器案例及月份／日別、日界、46 小時、格式、descriptor、過期工作和報告驗證。 |
| `npm run check` | exit 0，雙語結構、預覽 noindex、程式語法、固定 Worker、能力掃描與核心純度。 |
| `npm run build:preview` 兩次 | exit 0，9 個產物，兩次清單 SHA-256 相同。 |
| `npm run check:generated:preview` | exit 0，檔案集合、bytes、SHA-256、雙語中繼資料、Worker 來源與 robots 皆相符。 |
| Windows 環境前後指紋 | PASS，HKCU/HKLM PATH 與完整 Environment 指紋相同，兩者暫存路徑計數均 0。 |

最終 BUILD-MANIFEST.json SHA-256 `d228bfb5b94b8658d7a6d6aaf5096dbd67a8974b10a81348fe0c4cb396caf04e`。R3 規格與測試副本 fixtures SHA-256 `500769055a1326f09793ba6bd99e2cb63f88ec90db47f02c2fefe81770632172`。

- NT$36,000 平日案例，三天各 1 小時 NT$600，同一天 3 小時 NT$650。
- NT$36,000 未調移國定假日案例，兩天各 1 小時 NT$2,400，同一天 2 小時 NT$1,200。
- 休息日級距對照，兩天各 1 小時與同一天 2 小時皆 NT$400。
- 46 小時不顯示提醒，46.5 與 48 小時顯示提醒。getter／setter 呼叫計數 0，重複日期、無效閏日及第 32 列拒絕。環境前後快照檔 SHA-256 `ea0bbfd445a4f59d1e16fe8649003024a46c63c8d04802063a0c0777a9ce68ba`。

## 待驗項

實作者的桌面與本機瀏覽器操作記為 NOT_RUN_USER_FOCUS_INCIDENT。遠端隔離瀏覽器的兩語互動、非作者同版驗收、檢視發布與發布後核對由主代理留證。原生下載／裝置、實機 200% 縮放、輔助技術、完整網路儲存檢查、正式域名與外部重驗分項留證。
