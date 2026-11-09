# 技術契約 — 食材差額採買單
這是規格，Node24與瀏覽器原生ESM，零runtime/dev依賴，禁止npm install。正式站純靜態。

## 模組與介面
public/index.html、en/index.html、404.html、_headers、styles/app.css、js/app.mjs、js/controller.mjs、js/locales/zh-Hant.mjs與en.mjs；純核心於js/core/：quantities.mjs、shopping.mjs、schema.mjs、session.mjs。test/*.test.mjs；scripts/check.mjs、build.mjs、serve.mjs；package.json/private/type module/engines>=24。
parseQuantity(text)->bigint千分之一單位; normalizeIngredient(name)->string; calculateShopping({meals,stock})->{buy,enough,unmatchedStock}; validateProject(value)->validated schema1。
核心不引用DOM、File、storage、network或console。controller擁有FileReader/bitmap/BlobURL與generation，不在核心塞副作用。

## 確定算法及資料契約
每個數量原字串只接受ASCII十進位0..1000000最多3小數，不允許e/+/-/空字串；0合法表示暫不需。BigInt千分之一份為base。g以mg為整數、kg乘1000到g；ml以千分之一ml為base，L乘1000到ml。piece或自訂count單位以千分之一個保留，不猜顆/個/包等同義。unit只能g/kg/ml/L/piece/customCount；customCount需1..20字且NFC trim精確識別。材料名NFC.trim，保留大小寫與內部空白，1..120字。key=(材料名,dimension,customCountName)，不能只名稱合併。需求名稱同但dimension不同要顯示無法互換提示並各列保留。
預設新料理1份；M1不做食譜份數縮放（既有20號負責），直接填本次真正需求。meal{id,name,items[{ingredient,quantity,unit,unitLabel}]}至多30/總300列；stock同型300列。重複需求/庫存加總，合計最多1000000000 base顯示單位（以BigInt比較），超限拒整批。buy=max(required-stock,0)，surplus=max(stock-required,0)。輸出預設g/ml/piece或customCount，去小數尾零；g999顯示999g，不自動換kg以免採買誤認。全部都有零餘額時顯示不需額外購買。
所有項都附來源料理名/原量與扣掉庫存量明細，可勾已買只影響本頁進度不再重扣庫存；修改來源重置勾選、輸出失效。不提供熱量/營養/保存安全建議。提供schema1 JSON明確下載/載入，無storage。匯入2MiB，exactkeys/唯一id/上限/不安全控制字元驗證，頁內預覽後確認替換，取消原狀。TXT購物清單與完整JSON報告均含未合併單位說明。

## 共同狀態與失效
idle→editing→running（僅async）→ready/error；來源/設定input同步revision++、停用下載/複製、清輸出；cancel終止worker/reader，晚到generation不可restore。pagehide清資源。未知exception轉固定雙語錯誤碼，不回顯raw stack或輸入。保留明確的unsupported安全退出。
可引用既有兄弟工具作唯讀研究，但本工具必須複製自己需要且經審查的模組並帶測試，不runtime import兄弟工具。

## 工具鏈
scripts/check.mjs實驗ESM語法、public靜態allowlist、雙語結構、安全禁止項；純regex只初步掃描不作安全證明。build拒symlink/junction/unknownfile，只複製public封閉清單到dist，舊未知輸出不任意刪除。serve只loopback 127.0.0.1:4234，GET/HEAD，精確MIME/path/Host與404/405，不能提供workspace。M1不啟動serve。
來源UTF8，文本匯出UTF8無BOM、JSON兩空格LF尾LF。結構化資料匯入依工具自訂exact schema與上限，危險prototype不能進object assignment。下載無公式CSV（如需報告用TXT/JSON，避免發明CSV防護承諾）。
