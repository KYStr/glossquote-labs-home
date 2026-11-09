# 驗證狀態（候選，未發布）

2026-10-28，Node v24.22.1。證據：`evidence/commands-20261028.log`。

| 階段 | 實際結果 | 能證明 / 不能證明 |
|---|---|---|
| `npm test` | PASS，45/45，exit 0 | 20 core、17受控DOM lifecycle、8 build/檔案/HTTP handler測試；不是原生瀏覽器證明 |
| `npm run check` | PASS，exit 0 | 語法、閉合public allowlist、兩語靜態頁與renderer一致、靜態危險模式掃描、零依賴契約 |
| `npm run build` | PASS，exit 0 | 9個noindex preview assets＋build manifest；測試另驗重建逐byte一致 |
| 反例：source/dist hardlink與symlink | PASS（預期拒絕） | 不覆寫獨立測試副本外的hardlink證據；未知dist檔不刪除 |
| 受控HTTP handler | PASS | 精確路由、Host拒絕、GET/HEAD/405、MIME、CSP/noindex/security headers；未啟socket，不是實際hosting驗證 |
| 受控decode/encode race | PASS | cancel/clear/pagehide/restore過期callback不復活圖片；timeout/late close與單一原生lease；不是實際BFCache或原生GC |
| 真瀏覽器獨審 | PENDING | 由獨立reviewer以共用managed preview及C UA驗證；未完成前不得稱UI全通過 |
| 真圖片解碼、PNG與索引實際下載 | PENDING | 受控fixture產物不冒稱原生下載證據 |
| 真EXIF 1–8像素方向 | NOT_RUN | Node目前只驗metadata/dimensions，不證明鏡像方向像素 |
| 完整Network/Storage、離線、真BFCache | NOT_RUN | 靜態掃描與受控事件不能替代 |
| 320px、200%zoom、鍵盤焦點與取消 | PENDING | 等獨立雲端瀏覽器實測 |
| 物理裝置、AT、其他引擎 | NOT_RUN | 不宣稱WCAG認證或所有瀏覽器支援 |
| GitHub push、新repo、部署、首頁catalog | NOT_RUN／未授權 | 本任務沒有執行這些外部寫入 |

## 已修獨審發現

1. Source/dist的普通檔必須`nlink===1`，避免hardlink越界讀寫；負面測試在拋棄副本進行。
2. pagehide增加epoch、detach active；persisted pageshow重新初始。舊job僅可清理自己，不可改寫新頁status或control state。
3. 原生decoder最多一個lease，UI等待30秒後可恢復控制；未settle lease拒絕後續decode並清楚提示重試/重新整理。晚到bitmap必close。UI期限不意味作業系統解碼被終止。
4. 清除/首頁/語言導航採頁內確認，可取消及Escape；dialog開啟時Escape不誤觸外層取消處理。
5. 手機視覺與DOM順序一致；空數字設定不再靜默視為零。

## 執行環境界線

這是managed Linux雲端工作區，沒有使用使用者本機、profile或原生桌面。沒有安裝依賴、開啟自行管理的瀏覽器/CDP或另啟server。測試HTTP只直呼handler。

本工作區GUI須由reviewer排共用`sites-preview` daemon，並用它返回的exact URL；不得直接跑`npm run dev`搶占/另建daemon。README的傳統loopback命令供非managed、獲授權的環境使用。Managed靜態QA copy會保留dist bytes，清空dev並加static.directory配置；該配置不影響runtime bytes但要明列差異。
