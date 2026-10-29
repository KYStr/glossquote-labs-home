# U14 v2 主代理驗證 — 本機程式通過，發布尚未完成

日期：2026-10-12。狀態：`LOCAL_CODE_VERIFIED_RELEASE_INCOMPLETE`。這不是新版外部驗收通過，也不是正式發布紀錄。

## 最新需求及實作分工

最新規格為 [OUTCOME-UPGRADE-2026-10-12.md](OUTCOME-UPGRADE-2026-10-12.md) v2。快速、進階一律精確加總各人已付；快速平均分攤，進階可依份數分攤；兩種都列誰付給誰。手填總額與可選墊款開關已從兩語UI移除。舊 calculateBill 只保留內部相容，不再是頁面入口。

全部產品程式、兩語文案、測試及fixture修復均實際交原「分帳與墊款結算」對話 `01a12df5-270a-73e3-9694-3a070e65e23a`。主代理僅寫決策/派工/驗收文件、審查真實來源與diff、執行獨立驗證。send_message_to_thread明確指定gpt-6.1-sol/max且工具接受；後端模型身份未確認。主代理沒有代寫產品，沒有切換到其他模型或以本地實作子代理替換原對話。

## 主代理實際執行

固定程式副本：`.runs/outcome-upgrade-2026-10-12/code-candidate/`。來源SHA清單：`code-candidate-sources.json`。原對話此時僅擁有Markdown同步工作，程式/測試已固定。

| 檢查 | 結果 |
| --- | --- |
| `node --test --test-concurrency=1 test/*.test.mjs` | 31/31 PASS，exit0；包含真loopback及安全負例 |
| `node scripts/check.mjs` | 12 public assets PASS，exit0 |
| `node scripts/build.mjs` | 14 preview assets PASS，exit0 |
| `node scripts/build.mjs --production` | 14 production assets PASS，exit0 |
| `node scripts/check.mjs --production` | exact production output PASS，exit0 |
| 自行推導的核心案例 | 8固定例、5,000份數不變量、5,000平均/快速一致比較、19邊界 PASS |
| 修正後報告語意 | 14雙語案例 PASS；加權英文不再稱Equal share；結算先列 |
| 真Chrome操作 | 中英文900/300/0平均及2/1/1份數、0份付款者、全0付款、全0份數拒絕、模式方向鍵切換、隱藏非法份數忽略/返回再驗、舊結果失效 PASS，限已列案例 |
| 兩語320px | innerWidth320、documentWidth305；無水平溢出。臨時viewport已reset，不冒充真機或200% |
| 原生剪貼簿/TXT | 英文進階複製內容等於DOM報告；實際新下載檔512bytes與DOM報告逐位元組一致、UTF8無BOM/LF。下載事件觀測API逾時，實體檔以前後清單及獨特假名Primary A精確辨識 |
| Windows永久環境 | HKCU/HKLM全Environment snapshots及PATH hash/type/length均與開始相同，ephemeral entries均0 |

詳細證據均位於 `.runs/outcome-upgrade-2026-10-12/`：`primary-checks.json`、五份primary logs、`paid-final-results.json`、`report-final-results.json`、`native-output-results.json`、兩份preview-observations.md與environment前後檔。較早v1的18,648案例及手填總額操作紀錄只保留歷史；不當成v2全部通過。

## 已實際退回並確認修正

1. 進階也應自動加總：依使用者最新校正，移除重填總額/核對付款合計的UI。
2. 新範例按鈕、空結果提示及TXT順序：改成份數2/1/1，不再要求輸入total，結算優先。
3. 英文進階TXT600/300/300曾標Equal share：原owner改成Share並補語意測試；兩語頁首說明快速平均、進階可按份數。
4. Windows測試fixture rename出現EPERM：原owner改成直接建outside fixture、junction拒絕與unlink後複製實體目錄，保留全部安全斷言。owner實際scaffold3/3，primary後續完整31/31。

## 為何尚未發布

原對話在長回合、縮短交付、單一fixture任務及後續Markdown任務均反覆發生服務stream disconnected。已收回其中確實寫入/執行的成果與原始tool證據，但最新文件任務在完成前再次中斷，停止反覆無效重送。沒有假造final回覆或將服務失敗算成產品測試成功。

仍需原owner完成PRODUCT/TECHNICAL/UX-SEO/ACCEPTANCE/README與測試交接的current狀態同步；目前個別文件仍保留舊手填總額規則，不能作為v2操作契約。之後才由原owner完成reviewed PUBLIC來源commit及固定ZIP/manifest。主代理再核對程式hash沿用本輪證據、完成正式部署及首頁同語文案整合。首頁文案規格已就緒，尚未派發或修改catalog。

GitHub已重新唯讀核對為PUBLIC、default branch main，仍是舊版 `88f2036a619a98398cd2f72ccd7adebe49dda18a`。本輪未讀部署Token、未push新source、未部署Cloudflare、未改首頁。舊版外部通過紀錄只對該舊commit成立。

人工/設備項維持NOT_RUN：真200%縮放、讀屏/AT、真實行動裝置、完整Network/Storage及全部瀏覽器矩陣。本輪有界Chrome結果不冒充這些驗證。

本里程碑判定：**本機功能與必要自動化驗證通過；文件、公開來源與正式發布階段未完成，因此整體發布里程碑未通過。** 無需使用者重新授權GitHub或免費部署；下一步仍回原功能對話完成未交付文件，服務恢復後續作，不換模型、不丟失證據。
