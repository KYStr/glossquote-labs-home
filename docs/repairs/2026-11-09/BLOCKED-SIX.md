# 六款受阻工具的原作者續接 — 2026-11-09

## 本輪目標與邊界
使用者已要求繼續處理影片轉音訊、逐字稿、詞頻統計、文字朗讀、流動字級及SVG轉PNG，並重傳先前中央來源與預案ZIP。主代理只負責規格、原作者協調、獨立驗收與發布；不接走原作者產品責任。
本輪先完成一個可核實的續接里程碑：修復原作者接續條件，將具體缺陷交回原作者，取得固定修訂/證據或真實阻塞；具備放行條件者再驗收與發布。不能把留言、啟動或來源推送記成產品完成。

## 來源與修正任務
| ID | 原來源/owner | 本輪工作與檢查 |
| --- | --- | --- |
| R11 | labs-11-video-to-audio；原對話01a12398-eeee-71e2-ab1e-162d7c8b1c0c，claim migration-11-adopt-1793224718800 | 固定原本地產品/NC22保存點與缺漏runtime，遷入tools/video-to-audio時先做byte-identical commit，再補可重現依賴、來源授權、大小與發布清單；保留Chrome+Edge及T02必要gate，未核實隔離前不得啟動本地瀏覽器、native helper或sampler。 |
| R12 | labs-12-audio-transcription；原對話01a12398-f45b-72d1-8690-66d3b6b7e93e，claim migration-12-adopt-1793225004019 | 固定原產品與NC25-12-INTEGRATED保存點；先保留遷移bytes，補model/runtime完整manifest、來源/授權、可再現分發及檔案上限方案。既有69 FAIL/3 missing terminal與fullNetworkAccepted/fullT02Accepted=false不得消除或換成PASS。 |
| RWF | 原作者cloud factory；KYStr/glossquote-labs-word-frequency PR1@180dcb19d56416da352e26405955aaba69a09acc | minimum count僅過濾顯示列；所有詞數/百分比母數不可隨顯示閾值改變，Words/Characters/Bigrams與CSV保持相同語意。例如A A B閾值2只顯示A，但A仍為2/3（依固定格式顯示），總token3；新增前後閾值、empty/single/all-filtered回歸。原SPEC大小寫折疊語意另以明確errata處理，不偷偷改變已約定token規則。 |
| RTTS | 原作者cloud factory；KYStr/glossquote-labs-text-to-speech-reader PR1@45164104bdc713fc352ea37dfe5a5509d5d9864d | 本地處理承諾必須由行為保證：只選localService===true聲音；無本地聲音/載入失敗/voiceschanged移除時停用朗讀，不fallback到remote/default；每次speak前重驗voice。兩語實際介面、metadata與安全說明一致；fake local/remote/missing/voice-change tests。 |
| RFT | labs-fluid-typography-cloud-production-20261101；原owner cloud-dot:01a17302-361a-7582-accd-8565c98f6033:/root/prepare_labs_spec_stock；共享PR40@1e7a28b214542e6ed095338fe9b05d6955d76023 | 補繁中與英文的獨立靜態入口及實際語言內容、metadata/hreflang/canonical/sitemap/同語首頁；不以同份中文HTML改lang假裝英頁。原clamp計算、舍入/錯誤草稿/state契約保留；兩語重跑原數值及結構回歸。 |
| RSVG | 原作者cloud factory；共享PR99@af98d8ca9b4df2365f7991c512e178ac788d3708 | CSS escaped import/url及SVG presentation外部URL被sanitize後仍存活、removed=0。三個固定反例與證據在前輪 releases/seo-inspection-2026-11-09及原PR99 comment。採完整語法可證明的安全allowlist或拒絕不支援語法；不能只多加一個正則，不能放寬CSP；測CSS escapes/comment/case/@import/url/href/xlink/style/presentation、本地fragment與合法圖形。尚未透過瀏覽器證明外洩，勿將字串反例說成外洩實測。 |

## 承接及修改範圍
每位實際owner先讀最新共享AGENTS/handbook/registry，自己ACK；保留task/spec/claim及兩邊成果。R11/R12的spec目前reserved，須非作者核實完整性後mark-spec-ready轉consumed，原owner才可resume。root不得替原owner ACK/start。
RWF/RTTS/RSVG有公開候選但沒有正規production claim。不能冒用spec作者claim當產品claim；先向原cloud coordinator回報及補齊可審查的實際作者/規格/修正責任，不重做同一工具、不以adopt-existing繞過已完成reconciliation。既有來源只讀保存。
原owner允許修改自己的tools/<slug>/、相應tests/docs與專屬evidence；不得改其他工具、主頁、registry他人記錄、共享部署。中央遷移需獨立可比對的純copy commit。首次提交固定候選PR，再交非作者評分。

## 安全、非目標與停止條件
完全禁止本機互動browser/native UI、focus/IME/clipboard、原生dialogs；hidden/headless標籤不能當隔離證明。純CLI/HTTP/離線測試可以執行。保留原Chrome+Edge與必要效能/記憶體/Network/Storage gate。
不得改持久Windows/Git/gh設定、讀存放憑證、花費、部署未通過內容、修改040141.xyz或GlossGate。不要因本輪而重新製作已上線67款。
若claim/來源不符、原actor不可追溯、依賴無法合法分發、真正隔離能力不足、固定測試失敗或保護設定變動，停止依賴該條件的動作，保留安全進度及具體證據並回報。

## 交付與驗收
作者回報task/spec/owner/claim、來源與修訂commit/path/PR、實際diff、命令exit、PASS/FAIL/NOT_RUN、尚缺gate和下一個可執行步驟。主代理親自比對來源與受影響測試。產品accepted需固定候選的完整必要面向>=90；inspection hosting或局部修正不代替完整產品接受。
本協調/重傳維護的必要面向：archive-integrity（原ZIP及重傳逐bytes相同且可解壓）；owner-routing（原作者/原統籌真正收到任務或明確記錄存取缺口）；repair-contract（六款失敗證據/預期/範圍/測試/停止條件）；preservation（無ownership、原來源、用戶環境或產品驗收狀態虛改）。這些不等同六款產品已完成。

## 舊ZIP的接收問題
驗收對話明確回報附件存取異常，未取得可開啟的ZIP，未判定ZIP損壞。原檔18,477,085 bytes，SHA-256 825dbe6e3d3b6937edbe7e2c65573df0c4fcc6d7dce3262370ce99f859860140；本地5500 CRC/5499 manifest檔、Windows多讀取器通過。本輪只以glossquote-central-20261109-reupload.zip重新交付同bytes，不改原版本或重新產生產品。
