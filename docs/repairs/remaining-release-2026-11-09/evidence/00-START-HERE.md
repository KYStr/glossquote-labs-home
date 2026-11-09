# GlossQuote 剩餘工具發布與解阻交接

目前狀態以[總表 STATUS.csv](STATUS.csv)與[STATUS.json](STATUS.json)為準。[中文工具檢查總表](https://review.glossquote.com/index.html)／[英文總表](https://review.glossquote.com/en/index.html)。正式首頁兩語均連到同語檢查總表。本輪新增39款，合計47款歷史正式工具、140款公開檢查工具；1款血型候選與2款媒體尚未上線。

## 已做什麼

40個原雲端PR及1055來源檔、160份固定規格資料已追溯保留；其中血型規格真的被截斷，未作 ready/accepted。主代理親閱修補並獨立重跑39款1566個tests／156個命令關卡，修復Windows路徑與27個錯誤 Blob CSP；stock含空白/#路徑另重跑47tests與4關卡。這些追加測試是重跑，不灌入不同產品案例數。來源在 [PR232](https://github.com/KYStr/glossquote-labs-home/pull/232)，固定來源0756d08151129931f5f152dd7c6440158a07f830，發布候選6dd878e270a7cb9c926504e147138c1bc0a76e40。

逐字稿decoder已接三片載入：實際53707539 bytes重組雜湊一致，完整檔HTTP路徑404，取消、竄改、錯誤MIME/長度拒絕；58tests/check/build由主代理重跑，非作者另驗實際片段。保留19個邏輯資產、21個實體檔，沒有改模型或推論參數。Chrome+Edge真實語音、OS記憶體、完整T02尚待驗，入口仍停用，沒有上線。影片轉音訊的固定WASM對應完整GPL來源仍不可追溯，也未通過完整Chrome+Edge門檻；沒有猜版本或冒充可下載成品。

## 上線證據

免費Worker版本53f7b254-1bb5-43eb-bb05-2ac63b68ee86，141個精確主機路由。新增39筆DNS，原150筆保留。原101站1174個工具資產逐byte相同；檢查總表另更新。39新站用逐站實際讀回的嚴格CSP，不放寬到泛用政策。[主代理實際HTTPS](current/evidence/live-verification.json)驗1631資產及423別名/錯誤回應，全數通過；[雙語導覽](current/evidence/navigation-live.json)與[DNS核對](current/evidence/dns-verification.json)另附。

這是 **noindex 公開檢查發布，不是產品全部驗收通過**。健康、金融與法規資料的完整準確性、所有邊界、真機、無障礙、完整Network/Storage、原生下載仍有待驗項；較早外部驗收只對原固定版本有效。公開站可檢查canonical、hreflang、回鏈及內容，尚不開放索引。原47站狀態未被本次維護改寫。

## 驗證者從這裡開始

1. current/sources/<slug>/tools/<slug>/ 是本次40款固定來源；同層docs/specs是該PR固定的原規格，包含血型原截斷證據。Node24，依package.json跑check/test/build:preview/check:generated:preview。各工作資料夾獨立，不需要token、帳戶或node_modules。
2. [來源追溯清單](current/evidence/candidate-audit/source-provenance.json)、[修正patch](current/evidence/candidate-fixes/repair.patch)、[主代理結果](current/evidence/primary-candidates/results.json)、[逐字稿傳輸結果](current/evidence/primary-media/results.json)。current/media/audio-transcription只含98個固定來源檔，不含約103MB模型/第三方資產；以其既有manifest和stage-model腳本準備資產後才可重跑模型傳輸測試，不能把缺資產結果當產品失敗。
3. current/deployed-inspection-artifacts包含本輪完整固定產物；current/independent-review保留非作者實際審查。腳本內的本機工作路徑為原執行證據；重現時只可調整位置，不改固定版本或預期數值。
4. previous保留前一整包內容，舊入口改名ARCHIVED-START-HERE.md但內容不變；[原ZIP雜湊](previous-archive-receipt.json)保留。原M1/M2歷史NOT_RUN或修前FAIL不能用本輪局部PASS抹除。9個他人claimed及1個本地未提交候選的歷史保存點仍在previous/M1/evidence/INVENTORY.md，未擅自接管或當作完成。

委派實作與非作者審查均明確要求 gpt-6.1-sol / medium；工具接受該指定，底層實際模型身份未額外可驗證。測試全程沒有操作使用者桌面/鍵盤/IME/剪貼簿。Windows持久環境與Git設定前後保持一致。

FILES.json逐檔bytes/SHA256，執行python verify-package.py可驗；ZIP另作CRC、安全路徑、大小寫唯一及入口相對連結檢查。本包只留一個00-START-HERE.md。
