# FH-PRODUCT-WALL-PING-INDEPENDENT｜壁紙與坪數複審

[PR #325](https://github.com/KYStr/glossquote-labs-home/pull/325) 固定 `8fbd9ac4d98865480444ce11c4b772389a54ea3c`。**指定修正的離線查核通過。兩款產品均建議退修**。合成探針重現兩款的晚到回傳及 Worker 建構失敗問題，壁紙另有 SCHEMA／ENUM 首錯差異。三項均可在 #283 基線追溯。兩款 `requiredChecksComplete=false`。 [結構化評分](review.json)

審查者 `local-codex:01a1c87c-f580-7382-b037-3b6d83eee0f7` 未參與製作。Registry r1643 讀回維護任務 `labs-five-hour-product-wallpaper-ping-20261111` 為 `working`，owner 為 `local-codex:01a1c890-bac0-7ab2-ae49-eb422b49efb0`，claim `fh-reg-sched-15-wall-ping-claim`，submission 為 null。查核時候選仍 open draft。 [讀回](registry-readback.json) · [固定維護任務](https://github.com/KYStr/glossquote-labs-home/blob/6c8413f577bcc5bc26471c5c9fff6cc09ed88014/docs/reviews/five-hour-2026-11-11/dispatch/product-wallpaper-ping/TASK.md)

## 指定修正

- 壁紙尺寸清單按完整牆寬估算。12 m 案為 **23 幅／8 捲**，開口寬度摘要 240 cm、採購寬度 1,200 cm。3.18 m 半高開口案為 **6 幅／2 捲**，淨面積 **6.04 m²**。等高合法。逐欄格式錯誤先於開口超高，第一筆超高先於開口寬度合計與捲長錯誤。繁中與英文的 10 個模擬定位均指向正確的開口、牆列或純量輸入，並核對 ARIA 與提交時的 focus 呼叫。 [壁紙固定規格](https://github.com/KYStr/glossquote-labs-home/blob/c2c3f7715023990b1427e052a25c52f1987eaca9/docs/specs/wallpaper-calculator/SPEC.md)
- 坪數精確係數保留。100 坪為 **3558.32 ft²**，以 3.3058 代替精確係數會得到 3558.33。速查全 100 列逐列相符，第 100 列與單次換算一致。30 坪 99-byte canonical 報告保留同一 SHA-256。 [坪數固定規格](https://github.com/KYStr/glossquote-labs-home/blob/c2c3f7715023990b1427e052a25c52f1987eaca9/docs/specs/ping-area-converter/SPEC.md)
- 壁紙保留原 17 個 fixture ID，增加五個，原尺寸清單案例的輸出按全牆寬修訂。坪數保留原 27 個 fixture 並增加 100 坪案例。兩份產品 fixtures 均與 #299 固定檔位元組相同。 [案例、報告與命令讀回](checks.json)

## 九面向

分數依固定 SPEC。觀察到會影響功能的缺陷為 80。必要證據不足的面向以 `null` 記分。

| 面向 | 壁紙 | 坪數 | 證據與缺項 |
| --- | ---: | ---: | --- |
| functionality | null | null | 指定計算及 7 份獨立 canonical 報告通過。兩語真實頁面輸入、畫面和下載待驗。 |
| boundaries | 80 | 80 | 六個固定 controller 案例通過，額外的晚到回傳順序在兩款失敗。壁紙另有 SCHEMA／ENUM 首錯差異。 |
| privacy | null | null | 靜態來源未見禁用的網路、持久化和工作日誌呼叫。真實 Network、Storage、URL 及 console 待驗。 |
| security | 80 | 80 | 兩款 CSP、安全標頭、唯讀輸入與本機路徑防護通過離線查核。Worker 建構失敗時 Blob URL 未撤銷。 |
| usability | null | null | 壁紙雙語說明、估算寬度欄與錯誤位置已核對。坪數雙語畳提示與速查區已核對。桌面、行動實際流程待驗。 |
| accessibility | null | null | 壁紙 10 次模擬 focus、標籤與 ARIA 相符。兩款兩語頁均有狀態及捲動區語意。真鍵盤、讀屏、320px、200% 縮放、觸控與 reduced motion 待驗。 |
| localization-seo | null | null | 四個雙語入口、訊息鍵與 preview noindex 已驗。兩語相對首頁 href 保留原值，部署路由下的實際回鏈及正式 HTTPS／SEO 待驗。 |
| toolchain-provenance | 100 | 100 | 64 檔公開位元組、57 檔遷移底稿、三份實際 diff、零依賴、兩次重建與固定 preview 相符。 |
| compatibility | null | null | 兩款嵌入 Worker 各有兩筆 Node 回傳通過，九個預覽資產各有 GET／HEAD 證據。隔離 Chrome、Edge、reflow 和原生下載待驗。 |

[執行明細](checks.json) · [檔案與雜湊](candidate-source-check.json) · [diff 重建](diff-audit.json)

## 退修證據

### PWP-01｜舊工作可在新工作忙碌時取得結果

兩款 controller 各啟動兩次計算，保留第一份 Worker 的回傳。第二份工作進入 busy 後先交付舊回傳，再交付當前回傳。預期忽略舊回傳，保持 busy、下載關閉，並採用當前回傳。實際舊回傳把狀態改為 success、開啟下載並終止當前 Worker。當前回傳無法取代舊結果。兩款 controller 的候選檔與 #283 位元組相同。這是合成 Worker 時序證據。 [壁紙 controller](https://github.com/KYStr/glossquote-labs-home/blob/8fbd9ac4d98865480444ce11c4b772389a54ea3c/tools/wallpaper-calculator/public/js/controller.mjs#L98-L117) · [坪數 controller](https://github.com/KYStr/glossquote-labs-home/blob/8fbd9ac4d98865480444ce11c4b772389a54ea3c/tools/ping-area-converter/public/js/controller.mjs#L79-L98)

請原 owner 檢查兩款 `public/js/controller.mjs` 的目前世代與 Worker 身分。重驗舊回傳先於新回傳、新工作維持 busy、新回傳採用，以及原三個 controller cases。

### PWP-02｜壁紙缺必要欄位時先回 ENUM

以周長模式省略必要的 `perimeterM`，同時給未知的 `openingsMode`。固定 SPEC 要求先處理缺欄 SCHEMA，預期 `SCHEMA / null / null`。#325 與 #283 都回 `ENUM / openingsMode / null`。 [驗證順序](https://github.com/KYStr/glossquote-labs-home/blob/c2c3f7715023990b1427e052a25c52f1987eaca9/docs/specs/wallpaper-calculator/SPEC.md#L63-L75) · [候選核心](https://github.com/KYStr/glossquote-labs-home/blob/8fbd9ac4d98865480444ce11c4b772389a54ea3c/tools/wallpaper-calculator/public/js/core/wallpaper.mjs#L266-L276)

請原 owner 核對 `public/js/core/wallpaper.mjs` 的已知模式必要欄位與枚舉首錯，並保留合法形狀下的既有 ENUM 與逐欄／跨欄順序。

### PWP-03｜Worker 建構同步失敗時 Blob URL 未撤銷

兩款 `createWorker` 先建立 Blob URL。合成 Worker 建構器拋出例外時，各觀測到建立 1 個 URL、撤銷 0 個。正常建構並終止時為建立 1、撤銷 1。候選的兩個函式均與 #283 相同。此證據限 Node 內的建構失敗路徑。 [壁紙 createWorker](https://github.com/KYStr/glossquote-labs-home/blob/8fbd9ac4d98865480444ce11c4b772389a54ea3c/tools/wallpaper-calculator/public/js/app.js#L161-L171) · [坪數 createWorker](https://github.com/KYStr/glossquote-labs-home/blob/8fbd9ac4d98865480444ce11c4b772389a54ea3c/tools/ping-area-converter/public/js/app.js#L114-L124)

請原 owner 在兩款 `public/js/app.js` 核對建構失敗的 URL 生命週期。重驗正常終止與失敗各只撤銷一次，錯誤後仍可保留草稿並重試。

## 執行與來源

- Node 24.14.0，壁紙 **58/58**，坪數 **61/61**。各自 `check`、兩次 preview build 及 `check-generated` 都 exit 0，重建的 9 個預覽資產與 manifest 逐檔相符。
- 獨立核心壁紙 **35/36**，坪數 **37/37**。43 個固定核心案例全數通過，另 30 個合成判別案例有一筆 SCHEMA 首錯差異。7 份報告 bytes 和 SHA-256、100 列速查、六個固定 controller 案例和 10 筆壁紙模擬定位已核。額外時序和 Worker 建構缺陷各在兩款重現。
- 公開候選 **64** 檔全部重算 Git blob 與 SHA-256。遷移 `f77c60a84e6251cf296d06029b80b403b2d1a0bd` 的 **57** 檔逐 byte 相符 #283。PR diff、遷移 diff、修正 diff 分別重建 64、57、29 個檔案。坪數核心及預覽與基線一致。 [候選來源證據](candidate-source-check.json) · [全 diff 重建](diff-audit.json)

真實瀏覽器、真機、鍵盤、讀屏、Network／Storage、原生下載為 `NOT_RUN_USER_FOCUS_INCIDENT`。正式 HTTPS／SEO、部署、合併與 Registry 寫入為 `NOT_RUN`。建議原 owner 修正後交回新的固定 head，並補齊九面向必要實證。
