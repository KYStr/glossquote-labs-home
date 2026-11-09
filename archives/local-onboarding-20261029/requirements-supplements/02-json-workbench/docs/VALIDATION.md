# 驗收紀錄（2026-10-10）

> 2026-10-13 U02候選新增「前往錯誤位置」；新驗收見文末與 [U02案例](U02-ERROR-LOCATION.md)。舊版本紀錄保留，不當作新版外部通過。

Node v24.14.0、npm 11.9.0、Windows；Edge 154.0.4258.62。Browser 用現有工具 runtime 的 Playwright 啟動獨立 headless Edge context，沒有安裝套件或使用既有使用者 profile。

| 要求 | 證據與判定 |
|---|---|
| JS-01–19 | Node lexer/parser/formatter 測試 PASS；exact raw token 比對、大數／escape／duplicate／prototype／Unicode／全部邊界；writer overflow永久停止 |
| JS-20 | session reducer stale／clear／edit／mode／cancel 及固定reply schema PASS |
| JS-21 | 真正 Blob Worker 處理 HTML-looking 合成文字；沒有 image/script DOM、彈窗或運算HTTP PASS |
| JS-22 | 延遲真正 Worker fixture，cancel/clear/mode/source終止，結果不回來 PASS |
| JS-23 | 真實瀏覽器 formatted.json 下載byte比對，UTF8無BOM、大數／-0／1.2300／1e400／escape保留；clipboard拒絕fixture可手動選取 PASS |
| JS-24 | 初次頁面完整載入後斷網立即運算；zero HTTP、空 cookies/local/session storage/IDB、無操作console；Worker／下載URL撤銷 PASS |
| JS-25 | 禁用Worker→UNSUPPORTED；無回覆真正Worker→實際5秒TIMEOUT PASS |
| JS-26 | 完整鍵盤 source/mode/run/output/copy/download/clear、可見双層focus、320px實際viewport PASS；CSS200%縮放重排PASS；native zoom200% NOT_RUN |
| 双語 | 兩語靜態title/description/H1／教學／完整限制／4 FAQ、locale全部錯誤和state；兩語offline／下載／copy拒絕／empty／duplicate／dirty／320px／reducedmotion PASS |
| 無JS | 两語初始HTML說明／FAQ／限制可讀 PASS |
| 外觀 | 桌面／手機實際截圖審查，畫布主導、長英文標籤重排、無頁面水平溢出 PASS |
| server | Loopback/public-only、traversal/dotfile/NUL/decode/junction escape拒絕、GET/HEAD/405／MIME/security header Node實測 PASS |

人工 NOT_RUN 已獲允許：Firefox、實體手機／觸控、native browser zoom200%、螢幕閱讀器／完整WCAG獨立稽核、實際成功寫入OS剪貼簿（只測拒絕與成功fixture）、live HTTPS/Cloudflare header/DNS／首頁catalog、搜尋收錄。320px 是瀏覽器viewport，CSS200%是瀏覽器CSS重排測試，均不冒充實體裝置或native zoom。

必要技術 gate 沒有略過：原生 module Worker 離線失敗，已修為固定local bundle＋Blob Worker並以實際離線運算驗證；未以人工例外放行。其他早期失敗均是有證據的test harness／check範圍問題，修正後補足受影響案例。

本機詳細證據保留在專用 .runs/json-workbench/2026-10-10-initial，未納入公開來源。正式來源 SHA256 清單由 reviewed publishing copy 生成，排除清單本身以避免自我hash；實際URL與remote HEAD在workspace HANDOFF／release candidate追加。模型配置已由建立工具接受 gpt-6.1-sol / max；後端路由未確認。

Windows持久環境guard前值PASS，HKCU/HKLM ephemeral entries均0；終了的hash／type／length／全Environment指紋須一致，具體比較記錄在HANDOFF。沒有改持久PATH、TEMP/TMP或系統設定。

T08：npm.cmd test 32/32、check、preview build（17 exact files）與release build（18 exact files）全部exit0。正式產物不改public預覽來源；metadata、robots/sitemap、404、CSP/MIME規則與所有asset bytes由verify-build逐份核實。

T09最終來源：npm.cmd test 33/33、check（16 static／27 syntax）、preview build與release build全exit0。新增publication inventory test核對雙語source／test、排除workspace規範／private/build內容、SHA256與無重複path。T08 guard前後PATH hash、registry type／length、完整Environment-key fingerprint與ephemeral=0完全一致。

Source publication採reviewed copy，明確清單排除根協作規範／TASK-ENTRY／HANDOFF／.runs與dist。這是來源發布，不代表正式網站已上線。後續commit／PUBLIC驗證與終了guard結果附於workspace release candidate／HANDOFF。

## U02-ERROR-LOCATION-20261013

focused3/3 PASS；Chrome154.0.8037.98兩語22項PASS，另兩語320px目前寬行插入點／focus補驗2项PASS。直接DOM佐證selectionStart/End與activeElement；長1,500行來源、20,000字元寬行；錯誤完成不搶焦點、late callbacks／null／invalid／unknown拒絕、edit/mode/clear/recheck/cancel失效均通過。pointer與keyboard移動原生textarea，來源逐字未改，不自動重檢。

大數原文、-0／1.2300／1e400、下載精確UTF8與首次載入後offline PASS，操作HTTP0／console0／空 cookies/storage/IDB。320px頁面不水平溢出、CSS200%／reducedmotion PASS，native200%與實體裝置仍NOT_RUN。

本機專用證據為.runs/json-outcome-2026-10-13，沒有加入公開source。完整gate／PUBLIC／ZIP及環境guard結果於驗收後追加；新版候選待主驗、正式部署與外部複驗，這些項目不能承接2026-10-11的舊版本通過。

本任務最終gate：npm.cmd test **36/36 exit0**、check **17 static／29 syntax exit0**、build **preview18 files exit0**、build:release **release19 files exit0**；verify-build核對每份asset bytes及SEO/header规则。parser／formatter／worker bundle未改；舊數字、Unicode、duplicate／prototype、大小／深度、匯出與session gate全部仍通過。

前後持久環境guard皆PASS，HKCU/HKLM PATH hash／registry type／length、ephemeral entries、所有Environment-key指紋含TEMP/TMP精確一致。來源更新保留已核對的公開repo歷史；只有reviewed副本可commit/push，主repo index／branch未操作。
