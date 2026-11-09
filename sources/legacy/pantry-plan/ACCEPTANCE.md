# 驗收契約
這是規格，未執行項不能預填PASS。需求對照[PRODUCT](PRODUCT.md)。
|案例|需求|輸入/步驟|精確預期|層級|
|---|---|---|---|---|
|A01 質量合併|FR-01/02/04/09|500g+0.75kg，stock300g|buy950g|Node純核心/假controller；非真browser|
|A02 體積合併|FR-01/02/04/09|0.5L+250ml，stock0.25L|buy500ml|Node純核心/假controller；非真browser|
|A03 不可互轉|FR-01/02/04/09|奶500g與500ml|兩個dimension各500，不合併|Node純核心/假controller；非真browser|
|A04 無欠量|FR-01/02/04/09|need3piece stock5|buy0 surplus2|Node純核心/假controller；非真browser|
|A05 部分單位|FR-01/02/04/09|need1.5piece stock0.5|buy1|Node純核心/假controller；非真browser|
|A06 規格空白|FR-01/02/04/09|材料 米 與米|trim後同名；米 A與米  A不同|Node純核心/假controller；非真browser|
|A07 單位標籤|FR-01/02/04/09|包與袋|customCount不同，不猜等同|Node純核心/假controller；非真browser|
|A08 壞數字|FR-01/02/04/09|1e3/-1/+1/1.0001|INVALID_QUANTITY|Node純核心/假controller；非真browser|
|A09 累加|FR-01/02/04/09|同庫存A2g+A3g|stock5g只扣一次總量|Node純核心/假controller；非真browser|
|A10 零|FR-01/02/04/09|need0g stock0g|無需購買，不NaN|Node純核心/假controller；非真browser|
|A11 匯入取消|FR-01/02/04/09|舊米/新麵preview cancel|仍舊米|Node純核心/假controller；非真browser|
|A12 惡意文字|FR-01/02/04/09|料理<img>|安全純文字，TXT原字串不執行|Node純核心/假controller；非真browser|

## 必要M1 gate
Node24+；npm test含上述精確期望且expected不可由被測實作生成。npm run check真查結構與安全；npm run build真產物；source前後hash一致，實際證據寫evidence/m1。反例須確認錯輸入拒絕且成功結果失效。所有測試假資料，不讀個人文件；不得裝套件或啟動瀏覽器。

## 必要browser/release gate（目前NOT_RUN_USER_FOCUS_INCIDENT）
- B01 兩語真實輸入→主要操作→預覽→本地下載，下載byte內容符合核心且使用者可拿走使用。
- B02 成功後改來源/設定與錯值，舊輸出立即失效；快速重選/clear/cancel不復活。
- B03 惡意文字只文字，Network完整初載/操作/隱藏/離頁、同源/cdn-cgi/rum均核對；Storage前後無使用者資料。
- B04 鍵盤完整流程、焦點不受遮擋、讀屏label/status、320px、200%、mobile真機、權限拒絕、下載/列印原生行為獨立記錄。
- B05 中文英文切換與首頁互連、正式canonical/hreflang/x-default/robots/sitemap/安全HTTP與真404。
只用主代理確認真正隔離機制，禁止CUA/hidden-IAB/桌面/native/key/IME/clipboard測試。Node假DOM/Canvas/Audio與靜態檔不能冒充B01–05。手動NOT_RUN授權不等必要release gate全免除。
