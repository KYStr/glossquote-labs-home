# 六款受阻工具的原作者續接 — 2026-11-09

## 本輪目標與邊界
使用者已要求繼續處理影片轉音訊、逐字稿、詞頻統計、文字朗讀、流動字級及SVG轉PNG，並重傳先前中央來源與預案ZIP。主代理只負責規格、原作者協調、獨立驗收與發布；不接走原作者產品責任。
本輪先完成一個可核實的續接里程碑：修復原作者接續條件，將具體缺陷交回原作者，取得固定修訂/證據或真實阻塞；具備放行條件者再驗收與發布。不能把留言、啟動或來源推送記成產品完成。

## 來源與修正任務
| ID | 原來源/owner | 本輪工作與檢查 |
| --- | --- | --- |
| R11 | labs-11-video-to-audio；原對話01a12398-eeee-71e2-ab1e-162d7c8b1c0c，claim migration-11-adopt-1793224718800 | 固定原本地產品/2026-10-22保存點（NEW22修訂2）與缺漏runtime，遷入tools/video-to-audio時先做byte-identical commit，再補可重現依賴、來源授權、大小與發布清單；保留Chrome+Edge及T02必要gate，未核實隔離前不得啟動本地瀏覽器、native helper或sampler。 |
| R12 | labs-12-audio-transcription；原對話01a12398-f45b-72d1-8690-66d3b6b7e93e，claim migration-12-adopt-1793225004019 | 固定原產品與NC25-12-INTEGRATED保存點；先保留遷移bytes，補model/runtime完整manifest、來源/授權、可再現分發及檔案上限方案。既有69 FAIL/3 missing terminal與fullNetworkAccepted/fullT02Accepted=false不得消除或換成PASS。 |
| RWF | 原作者cloud factory；KYStr/glossquote-labs-word-frequency PR1@180dcb19d56416da352e26405955aaba69a09acc | 已核對原SPEC PR38@6598ac51cddee252a83685d461589537d56fa3e0與實作：程式已令minimum count只過濾顯示列，alpha alpha beta閾值2保留alpha=2/3、total=3；原SPEC卻寫filtered total，介面未區分計數過濾與顯示過濾。這是契約/說明不一致，不是證實程式算法錯誤。主代理決定保留既有2/3行為：先由原作者提出SPEC errata，明訂stopwords/numbers/minLength改變母數、minimum count篩選UI與CSV列但不改母數/total；top100只截斷畫面，CSV仍匯出全部通過minimum count的列。兩語UI/CSV與測試對齊。大小寫fold保留已實作的Unicode simple C+S及既有例子，修正SPEC誤寫C+F；固定來源、版本與回歸證據，不偷換成full folding或toLowerCase。 |
| RTTS | 原作者cloud factory；KYStr/glossquote-labs-text-to-speech-reader PR1@45164104bdc713fc352ea37dfe5a5509d5d9864d | 本地處理承諾必須由行為保證：只選localService===true聲音；無本地聲音/載入失敗/voiceschanged移除時停用朗讀，不fallback到remote/default；每次speak前重驗voice。兩語實際介面、metadata與安全說明一致；fake local/remote/missing/voice-change tests。 |
| RFT | labs-fluid-typography-cloud-production-20261101；原owner cloud-dot:01a17302-361a-7582-accd-8565c98f6033:/root/prepare_labs_spec_stock；共享PR40@1e7a28b214542e6ed095338fe9b05d6955d76023 | 補繁中與英文的獨立靜態入口及實際語言內容、metadata/hreflang/canonical/sitemap/同語首頁；不以同份中文HTML改lang假裝英頁。原clamp計算、舍入/錯誤草稿/state契約保留；兩語重跑原數值及結構回歸。 |
| RSVG | 原作者cloud factory；共享PR99@af98d8ca9b4df2365f7991c512e178ac788d3708 | CSS escaped import/url及SVG presentation外部URL被sanitize後仍存活、removed=0。三個固定反例與證據在前輪 releases/seo-inspection-2026-11-09及原PR99 comment。採完整語法可證明的安全allowlist或拒絕不支援語法；不能只多加一個正則，不能放寬CSP；測CSS escapes/comment/case/@import/url/href/xlink/style/presentation、本地fragment與合法圖形。尚未透過瀏覽器證明外洩，勿將字串反例說成外洩實測。 |

## 承接及修改範圍
每位實際owner先讀最新共享AGENTS/handbook/registry，自己ACK；保留task/spec/claim及兩邊成果。本輪啟動時R11/R12的spec為reserved，這是歷史起點而非目前狀態。非作者已完成八面向文件覆核，兩spec於registry r1195（commit 6eef7fa888e4a6c757c3a72126246547eec2b640）轉為原任務的consumed，原owner/claim及必要驗收未變。固定覆核見[媒體規格審查](media-spec-review/REVIEW.md)。後續原owner必須重讀最新registry，沿原claim以resume CAS及operationId/owner精確讀回接續；不要再次mark-spec-ready、重領任務或依本頁快照覆寫進度。規格可接續不代表產品或T02通過。root不得替原owner ACK/start。
RWF/RTTS/RSVG有公開候選但沒有正規production claim。三者的規格尚未ready：詞頻SPEC的分母/fold定義不一致；朗讀SPEC允許remote/default fallback，需先修正為此產品的local-only契約；SVG SPEC的preserve-other-attributes與移除全部外部引用衝突。先完成原SPEC修訂及非作者固定版本審查，再依最新協議登記合法產品續修責任；不得把本頁修正要求當作spec已ready。不能冒用spec作者claim當產品claim；先向原cloud coordinator回報及補齊可審查的實際作者/規格/修正責任，不重做同一工具、不以adopt-existing繞過已完成reconciliation。既有來源只讀保存。
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

## 已收回的M1與使用者轉傳安排（本輪更新）
R11已提出共享PR175@543a14bd1ef6e605e1d5323663813312c21ef5ff；主代理驗證46個候選blob及原30檔不變，18/18離線測試、runtime核對、check/build通過。尚缺GPL對應來源閉合、超過靜態主機單檔上限的WASM處理，以及Chrome+Edge T02。詳見原PR175 comment 6737483847。
R12已提出共享PR181@c4db2022957cb57b6e782dc61a9e37bb2414fdd3；主代理驗證96個候選blob、55/55離線測試、19資產/102581371 bytes、check/build及獨立Python三片重組hash通過。分片尚未接入產品推論流程，Chrome+Edge/fullNetwork/T02/native memory仍未通過，不能部署。詳見原PR181 comment 6737851870。
使用者已明確改為代傳雲端原作者：把本頁RWF/RTTS/RFT/RSVG項與共通承接/回報要求傳至各自原對話即可。不得把使用者同意代傳當成作者已讀、已claim或已開始。WF舊退修判讀的更正已留原PR1 comment 6737845546。原SPEC修訂入口為共享PR38（詞頻）、PR30（朗讀）、PR48（SVG）；流動字級沿原production PR40/claim續接。新修訂須固定commit/PR由非作者審查；通過後再交主代理處理部署和雙語首頁。
