# FH-NEXT8 八份規格內容預審

八份文件的八節內容可供後續合法映射；本次未發現新的阻擋缺陷。這是 preflight，不是 mapping 任務正式 review、accepted、apply 或 ready。尚無新 mapping 候選，故沒有對不存在的 task、criteria、contributors 或 submission 作正式裁決。

實際範圍為 wallpaper/ping 兩份、pricing 兩份、tax/stock/baking/savings 各一份，共八份；原派工的「pricing 三份」經主統籌更正，不增造第九份。

## 實際證據範圍

本 reviewer 親讀八份 SPEC、BRIEF、AUTHOR-CHECK 全文與 fixtures 結構、關鍵字面案例及六組 peer REVIEW 全文，逐節判斷目標、範圍、流程、數值契約、實作方法、驗收方法、測試及交接是否可落地。64 格實質理由見下表；標題存在檢查只是輔證，不是內容判斷的替代品。

本次固定下載 53 份公開檔案（32 候選、21 peer 證據），Gitblob 與 SHA-256 實讀。32 候選檔案逐一與 peer provenance 的同一 bytes/Blob 綁定。8×8 章節定位與8×9產品驗收 labels 完整。258 個現有案例中，225 筆 peer 計算輸出本次與目前字面 expected 做深比對，另股票 33 筆僅核 ID 覆蓋及 exit 0 成功摘要。沒有重新執行作者或 peer 算術 oracle；沒有把資料相等核對說成新算術通過。

本次執行：`node fetch-inputs.mjs` exit 0（53 固定檔），`node audit-inputs.mjs` Node v24.14.0 exit 0（2026-11-11T05:34:51.004Z）。初次資料稽核曾把 ping table 的合法 null input 誤設為 truthy，僅修正 reviewer 的形狀檢查為 own-field 存在，再得到上述 exit 0；沒有變更候選。持久環境前後完整輸出一致，原始指紋僅存本地 private 檔。無來源發布、registry 寫入、產品修改或 GUI 操作。

## 候選與庫存界線

| 規格 | 固定來源 | 本次內容判斷 | 新製作庫存 |
|---|---|---|---|
| wallpaper-calculator | [PR299 / c2c3f7715023990b1427e052a25c52f1987eaca9](https://github.com/KYStr/glossquote-labs-home/blob/c2c3f7715023990b1427e052a25c52f1987eaca9/docs/specs/wallpaper-calculator/SPEC.md) | 八節可映射之預審 | legacy-candidate-continuation; existing build PR270; exclude from new ready stock |
| ping-area-converter | [PR299 / c2c3f7715023990b1427e052a25c52f1987eaca9](https://github.com/KYStr/glossquote-labs-home/blob/c2c3f7715023990b1427e052a25c52f1987eaca9/docs/specs/ping-area-converter/SPEC.md) | 八節可映射之預審 | legacy-candidate-continuation; existing build PR274; exclude from new ready stock |
| breakeven-calculator | [PR298 / dbbf6eea51e5ea88bb58f34983aa915e584889b4](https://github.com/KYStr/glossquote-labs-home/blob/dbbf6eea51e5ea88bb58f34983aa915e584889b4/docs/specs/breakeven-calculator/SPEC.md) | 八節可映射之預審 | potential-new-stock; central deduplication and legal mapping/apply/ready still required |
| markup-margin-calculator | [PR298 / dbbf6eea51e5ea88bb58f34983aa915e584889b4](https://github.com/KYStr/glossquote-labs-home/blob/dbbf6eea51e5ea88bb58f34983aa915e584889b4/docs/specs/markup-margin-calculator/SPEC.md) | 八節可映射之預審 | potential-new-stock; central deduplication and legal mapping/apply/ready still required |
| tax-included-converter | [PR297 / 9dde67ee408491dbfcef0cbadbb6a7f1a876bd02](https://github.com/KYStr/glossquote-labs-home/blob/9dde67ee408491dbfcef0cbadbb6a7f1a876bd02/docs/specs/tax-included-converter/SPEC.md) | 八節可映射之預審 | potential-new-stock; central deduplication and legal mapping/apply/ready still required |
| stock-profit-calculator | [PR305 / 95ead301f8735dede61bc1911bbc7ed6c4b79bb5](https://github.com/KYStr/glossquote-labs-home/blob/95ead301f8735dede61bc1911bbc7ed6c4b79bb5/docs/specs/stock-profit-calculator/SPEC.md) | 八節可映射之預審 | potential-new-stock; central deduplication and legal mapping/apply/ready still required |
| baking-pan-converter | [PR303 / 8e717e5cd93ea9df06b54ede8dec8c7f7d1f0927](https://github.com/KYStr/glossquote-labs-home/blob/8e717e5cd93ea9df06b54ede8dec8c7f7d1f0927/docs/specs/baking-pan-converter/SPEC.md) | 八節可映射之預審 | potential-new-stock; central deduplication and legal mapping/apply/ready still required |
| savings-goal-calculator | [PR306 / 35b2d302033af86e48337b7019a286180d5e8259](https://github.com/KYStr/glossquote-labs-home/blob/35b2d302033af86e48337b7019a286180d5e8259/docs/specs/savings-goal-calculator/SPEC.md) | 八節可映射之預審 | existing-tool-upgrade of compound-interest-calculator; exclude from new ready stock |

wallpaper、ping 已有原 build，savings 為既有 compound-interest 工具升級，這三份不增加新 ready。另五份僅是可能的新預案，仍待全庫去重；本 reviewer 本次未重新執行 catalog/tree/source-index/production registry 的完整去重，因此沒有聲稱五份已可開工。

## 八節實質矩陣

### wallpaper-calculator

| 章節與固定位置 | 預審 | 實質判斷 |
|---|---|---|
| [goal:L7](https://github.com/KYStr/glossquote-labs-home/blob/c2c3f7715023990b1427e052a25c52f1987eaca9/docs/specs/wallpaper-calculator/SPEC.md#L7) | PASS_CONTENT | 購買壁紙前由牆面及捲尺寸取得幅數、裁切長和捲數，桌機與行動的具體工作明確。 |
| [scope:L16](https://github.com/KYStr/glossquote-labs-home/blob/c2c3f7715023990b1427e052a25c52f1987eaca9/docs/specs/wallpaper-calculator/SPEC.md#L16) | PASS_CONTENT | 周長或逐牆計算、圖案重複及損耗有界；門窗只減淨面積，整牆寬仍決定採購幅數，各牆餘料不共用。既有 build 續作裁定另綁入映射。 |
| [userFlow:L29](https://github.com/KYStr/glossquote-labs-home/blob/c2c3f7715023990b1427e052a25c52f1987eaca9/docs/specs/wallpaper-calculator/SPEC.md#L29) | PASS_CONTENT | 雙語主操作、兩種牆面模式、列新增刪除、範例與 reset、dirty/busy/cancel/error/success、錯誤焦點及失效下載均可操作化。 |
| [inputsOutputs:L51](https://github.com/KYStr/glossquote-labs-home/blob/c2c3f7715023990b1427e052a25c52f1987eaca9/docs/specs/wallpaper-calculator/SPEC.md#L51) | PASS_CONTENT | 整數 cm、面積 cm²、首錯及跨欄位順序明確。開口高度先逐列檢查，再檢查總寬/面積和捲長；等於牆高合法。輸出字串精度及 canonical JSON 明確。 |
| [implementation:L97](https://github.com/KYStr/glossquote-labs-home/blob/c2c3f7715023990b1427e052a25c52f1987eaca9/docs/specs/wallpaper-calculator/SPEC.md#L97) | PASS_CONTENT | 純核心、controller、Worker、DOM 分層；固定程式來源、工作世代、URL 撤銷、離線和禁止網路/持久儲存具體，Node built-ins 無新依賴。 |
| [acceptance:L106](https://github.com/KYStr/glossquote-labs-home/blob/c2c3f7715023990b1427e052a25c52f1987eaca9/docs/specs/wallpaper-calculator/SPEC.md#L106) | PASS_CONTENT | 九產品面向各有方法，含實際瀏覽器/無障礙/隱私檢查，仍 NOT_RUN；三面向維護或本次八節預檢均不冒稱產品通過。 |
| [tests:L122](https://github.com/KYStr/glossquote-labs-home/blob/c2c3f7715023990b1427e052a25c52f1987eaca9/docs/specs/wallpaper-calculator/SPEC.md#L122) | PASS_CONTENT | 19 核心與 3 controller，包含部分高度門窗仍 6 幅 2 捲、第二列先錯、同高合法、損耗先膨脹幅數。2 個字面下載及逐牆最小性不等式可重現。 |
| [handoff:L179](https://github.com/KYStr/glossquote-labs-home/blob/c2c3f7715023990b1427e052a25c52f1987eaca9/docs/specs/wallpaper-calculator/SPEC.md#L179) | PASS_CONTENT | 四檔、固定候選、owner/claim、獨立審與後續發布 gates 有交接；未來映射須明列既有 PR270 責任，不能重開新產品製作。 |

數值方法審讀：3.18×2.50 m 牆、1.59×1.20 m 窗的淨面積 6.042 m²；0.53 m 幅寬需 6 幅。含 10 cm 裁切裕度每幅 260 cm，780 cm 每捲 3 幅，故 2 捲。門窗淨面積不是可用整幅材料的替代判據。這是正文推導審讀，完整 22 案算術採 provided。

沿用證據（provided，未重跑）：PR302 / round2-wallpaper-ping：Python 22 案、面積材料下限、2 個固定下載；本次只重新比對其輸出與候選字面值。

### ping-area-converter

| 章節與固定位置 | 預審 | 實質判斷 |
|---|---|---|
| [goal:L7](https://github.com/KYStr/glossquote-labs-home/blob/c2c3f7715023990b1427e052a25c52f1987eaca9/docs/specs/ping-area-converter/SPEC.md#L7) | PASS_CONTENT | 由坪、m²、ft² 或榻榻米取得可比面積，買屋/空間規劃的桌機與手機用途及快速表明確。 |
| [scope:L16](https://github.com/KYStr/glossquote-labs-home/blob/c2c3f7715023990b1427e052a25c52f1987eaca9/docs/specs/ping-area-converter/SPEC.md#L16) | PASS_CONTENT | 4 單位精確常數，榻榻米 1.62 m² 是選定近似慣例；原近似 3.30579 不再作中間轉換。既有 PR274 不另計庫存。 |
| [userFlow:L29](https://github.com/KYStr/glossquote-labs-home/blob/c2c3f7715023990b1427e052a25c52f1987eaca9/docs/specs/ping-area-converter/SPEC.md#L29) | PASS_CONTENT | 雙語輸入、單位、範例、1–100 坪表、結果與下載；編輯使舊結果失效，取消/錯誤/reset/切語資料生命週期完整。 |
| [inputsOutputs:L50](https://github.com/KYStr/glossquote-labs-home/blob/c2c3f7715023990b1427e052a25c52f1987eaca9/docs/specs/ping-area-converter/SPEC.md#L50) | PASS_CONTENT | 坪=400/121 m²、ft²=145161/1562500 m²；有理數一路到最終捨入。正數最小輸入顯示 0 合法；兩位與榻榻米一位、首錯及精確 schema 均明確。 |
| [implementation:L93](https://github.com/KYStr/glossquote-labs-home/blob/c2c3f7715023990b1427e052a25c52f1987eaca9/docs/specs/ping-area-converter/SPEC.md#L93) | PASS_CONTENT | 純核心、固定 Worker、世代與 Blob dispose、同源靜態資產、無持久儲存或資料外傳、兩語入口和安全 DOM 方法具體。 |
| [acceptance:L103](https://github.com/KYStr/glossquote-labs-home/blob/c2c3f7715023990b1427e052a25c52f1987eaca9/docs/specs/ping-area-converter/SPEC.md#L103) | PASS_CONTENT | 九產品面向方法包含 100 列表、兩種瀏覽器、真實 zoom、下載 bytes、零工作 request；未驗保持 NOT_RUN。 |
| [tests:L119](https://github.com/KYStr/glossquote-labs-home/blob/c2c3f7715023990b1427e052a25c52f1987eaca9/docs/specs/ping-area-converter/SPEC.md#L119) | PASS_CONTENT | 24 核心、1 個 100 列表、3 controller；100 坪 ft²=3558.32 對近似模型 3558.33 可區別；0.605/1.05 ties 與 99-byte 報告固定。 |
| [handoff:L176](https://github.com/KYStr/glossquote-labs-home/blob/c2c3f7715023990b1427e052a25c52f1987eaca9/docs/specs/ping-area-converter/SPEC.md#L176) | PASS_CONTENT | 四檔與來源/獨評/發布責任完整；映射需保留原 build PR274 的續作定位。微小文字將有小數的常數稱為整數，不改變明示有理數公式。 |

數值方法審讀：換算先乘來源的精確 m² 因子，再除目標因子，避免中途把坪截成 3.30579。100 坪案例能辨識差一個顯示單位的近似誤差；半入案例也指定正確 tie 規則。完整 28 案與 100 列沿用 provided。

沿用證據（provided，未重跑）：PR302 / round2-wallpaper-ping：Python 28 案（含 100 列）、精確有理數對照及 99-byte 報告；本次核對固定來源及字面輸出。

### breakeven-calculator

| 章節與固定位置 | 預審 | 實質判斷 |
|---|---|---|
| [goal:L7](https://github.com/KYStr/glossquote-labs-home/blob/dbbf6eea51e5ea88bb58f34983aa915e584889b4/docs/specs/breakeven-calculator/SPEC.md#L7) | PASS_CONTENT | 固定成本、單價與變動成本求損益兩平量及預估銷量安全餘額，具體幫助小型銷售決策。 |
| [scope:L16](https://github.com/KYStr/glossquote-labs-home/blob/dbbf6eea51e5ea88bb58f34983aa915e584889b4/docs/specs/breakeven-calculator/SPEC.md#L16) | PASS_CONTENT | 單品線性成本假設，無稅/多產品/市場預測；P≤V 的四種固定成本情形以 NO_MARGIN 說明數學限制。 |
| [userFlow:L30](https://github.com/KYStr/glossquote-labs-home/blob/dbbf6eea51e5ea88bb58f34983aa915e584889b4/docs/specs/breakeven-calculator/SPEC.md#L30) | PASS_CONTENT | 必填成本欄、可選預估銷量、範例、主結果與次級安全餘額、雙語狀態和資料失效/下載/reset 流程完整。 |
| [inputsOutputs:L61](https://github.com/KYStr/glossquote-labs-home/blob/dbbf6eea51e5ea88bb58f34983aa915e584889b4/docs/specs/breakeven-calculator/SPEC.md#L61) | PASS_CONTENT | 金額整數分與 BigInt；M=P−V，最小整件 U=ceil(F/M)。E=0 安全百分比為 null。負數 floor(x+1/2) tie 規則有明示，不借用別工具捨入。 |
| [implementation:L96](https://github.com/KYStr/glossquote-labs-home/blob/dbbf6eea51e5ea88bb58f34983aa915e584889b4/docs/specs/breakeven-calculator/SPEC.md#L96) | PASS_CONTENT | 原生 ESM、純核心/controller/Worker、固定來源、界內輸入、零外傳及資源釋放可落實；超大營收採字串，整件數仍在安全整數內。 |
| [acceptance:L105](https://github.com/KYStr/glossquote-labs-home/blob/dbbf6eea51e5ea88bb58f34983aa915e584889b4/docs/specs/breakeven-calculator/SPEC.md#L105) | PASS_CONTENT | 九面向各列計算、邊界、私隱、安全、兩語、無障礙、工具鏈及瀏覽器證據；產品未驗狀態保持。 |
| [tests:L121](https://github.com/KYStr/glossquote-labs-home/blob/dbbf6eea51e5ea88bb58f34983aa915e584889b4/docs/specs/breakeven-calculator/SPEC.md#L121) | PASS_CONTENT | 21 核心與 3 controller，正/零貢獻、F=0、E=0、盈虧及界值均有案例。2.665→2.67 新 tie 能區別 half-even，最小件數以前一件虧損證明。 |
| [handoff:L176](https://github.com/KYStr/glossquote-labs-home/blob/dbbf6eea51e5ea88bb58f34983aa915e584889b4/docs/specs/breakeven-calculator/SPEC.md#L176) | PASS_CONTENT | 固定來源、四檔、有效 owner/claim、同 head 獨評、產品與部署分離。仍須新 mapping 註冊的八節及 makers 閉包；現有維護 accepted 本身不足以 ready。 |

數值方法審讀：M>0 時線性利潤 U×M−F 單調，ceil(F/M) 確為最小非虧整件量；P≤V 不可使用除法公式。營收以整件與精確分數兩種語意分列，避免把四捨五入件數誤當可售件數。

沿用證據（provided，未重跑）：PR301 / round2-pricing：本工具 24/24、和 markup 合計 65/65，BigInt 有理數、tie/零固定成本及固定下載；本次比對全部字面輸出，未重跑 oracle。

### markup-margin-calculator

| 章節與固定位置 | 預審 | 實質判斷 |
|---|---|---|
| [goal:L7](https://github.com/KYStr/glossquote-labs-home/blob/dbbf6eea51e5ea88bb58f34983aa915e584889b4/docs/specs/markup-margin-calculator/SPEC.md#L7) | PASS_CONTENT | 讓定價者區別成本基準加成與售價基準毛利，從目標比例反求能真正達標的最小整分售價。 |
| [scope:L16](https://github.com/KYStr/glossquote-labs-home/blob/dbbf6eea51e5ea88bb58f34983aa915e584889b4/docs/specs/markup-margin-calculator/SPEC.md#L16) | PASS_CONTENT | report/solveMarkup/solveMargin 三模式、單品未含其他費用；零售價 margin 無定義、100% 以上目標毛利無解皆明確。 |
| [userFlow:L29](https://github.com/KYStr/glossquote-labs-home/blob/dbbf6eea51e5ea88bb58f34983aa915e584889b4/docs/specs/markup-margin-calculator/SPEC.md#L29) | PASS_CONTENT | 切模式保留草稿並停用不作用欄；目標與實際達到比例分列、範例、報告、dirty/error/cancel/reset 的雙語操作完整。 |
| [inputsOutputs:L51](https://github.com/KYStr/glossquote-labs-home/blob/dbbf6eea51e5ea88bb58f34983aa915e584889b4/docs/specs/markup-margin-calculator/SPEC.md#L51) | PASS_CONTENT | 成本整數分、目標 milli-percent；反求分子/分母後 ceil 最小整分，不把目標假充實際比率。符號×絕對值 half-up 定義負數 tie，模式/欄位上限順序明確。 |
| [implementation:L81](https://github.com/KYStr/glossquote-labs-home/blob/dbbf6eea51e5ea88bb58f34983aa915e584889b4/docs/specs/markup-margin-calculator/SPEC.md#L81) | PASS_CONTENT | BigInt 中間運算、Number 僅安全界內欄位；純核心與固定 Worker、世代檢查、canonical JSON、零網路與資料失效釋放均具體。 |
| [acceptance:L91](https://github.com/KYStr/glossquote-labs-home/blob/dbbf6eea51e5ea88bb58f34983aa915e584889b4/docs/specs/markup-margin-calculator/SPEC.md#L91) | PASS_CONTENT | 九產品面向列最小整分性、反算錯誤、兩語對照表、下載、安全/無障礙與瀏覽器方法，尚未執行產品檢查。 |
| [tests:L107](https://github.com/KYStr/glossquote-labs-home/blob/dbbf6eea51e5ea88bb58f34983aa915e584889b4/docs/specs/markup-margin-calculator/SPEC.md#L107) | PASS_CONTENT | 38 核心+3 controller，含 13 最小性成功案、價格 ceil 後越上限、零售價、負利潤和13列比較表。成本1分目標25%，售價2分實際加成100%/毛利50%。 |
| [handoff:L178](https://github.com/KYStr/glossquote-labs-home/blob/dbbf6eea51e5ea88bb58f34983aa915e584889b4/docs/specs/markup-margin-calculator/SPEC.md#L178) | PASS_CONTENT | 固定維護來源/作者、四檔與候選獨評可承接；後續要另行完成八節 mapping 與全庫去重，才可能成為新製作預案。 |

數值方法審讀：固定成本 C 時 markup 分母 C 不隨售價改；margin 分母 P 則隨售價改，解得不同 ceil 公式。以 (P−1)d<n≤Pd 證明最小整分，目標100% margin 使分母0，因此須先拒絕。

沿用證據（provided，未重跑）：PR301 / round2-pricing：本工具 41/41 與 13 最小整分證明、7 組補充 probes、3 組報告（兩工具合計）；本次固定來源與輸出相等驗證。

### tax-included-converter

| 章節與固定位置 | 預審 | 實質判斷 |
|---|---|---|
| [goal:L7](https://github.com/KYStr/glossquote-labs-home/blob/9dde67ee408491dbfcef0cbadbb6a7f1a876bd02/docs/specs/tax-included-converter/SPEC.md#L7) | PASS_CONTENT | 將單筆整元金額與多列金額的含稅/未稅試算分清楚，明示估算用途，非發票/報稅承諾。 |
| [scope:L13](https://github.com/KYStr/glossquote-labs-home/blob/9dde67ee408491dbfcef0cbadbb6a7f1a876bd02/docs/specs/tax-included-converter/SPEC.md#L13) | PASS_CONTENT | 單筆雙向、多列僅 net、預設5%及自訂0.01–100%；單筆 reverse 後 forward 不保證還原原 gross，輸出差異而非藏掉。 |
| [userFlow:L27](https://github.com/KYStr/glossquote-labs-home/blob/9dde67ee408491dbfcef0cbadbb6a7f1a876bd02/docs/specs/tax-included-converter/SPEC.md#L27) | PASS_CONTENT | 兩模式、金額列、稅率與 basis、雙語狀態、載入範例、錯誤定位、重試、reset、取消及下載完整；取消與 Worker 故障各有恢復。 |
| [inputsOutputs:L57](https://github.com/KYStr/glossquote-labs-home/blob/9dde67ee408491dbfcef0cbadbb6a7f1a876bd02/docs/specs/tax-included-converter/SPEC.md#L57) | PASS_CONTENT | 整元 ASCII 文法、12位總額上限、20列、exact-own schema、Array 巨大長度先拒；BigInt half-up；逆算先淨額捨入，稅為差額，forwardDiff−1/0/+1 明確。 |
| [implementation:L96](https://github.com/KYStr/glossquote-labs-home/blob/9dde67ee408491dbfcef0cbadbb6a7f1a876bd02/docs/specs/tax-included-converter/SPEC.md#L96) | PASS_CONTENT | 純核心與 controller、固定 module Worker、身份/世代/shape 檢查、5秒 timeout、事件 error handlers、Blob 1秒撤銷、pagehide/bfcache 清理均具體。 |
| [acceptance:L116](https://github.com/KYStr/glossquote-labs-home/blob/9dde67ee408491dbfcef0cbadbb6a7f1a876bd02/docs/specs/tax-included-converter/SPEC.md#L116) | PASS_CONTENT | 新補齊完整九面向及各項可觀察方法，要求實際兩瀏覽器、Network/Storage、CSP、安全和兩語；與文件三面向/八節分離。 |
| [tests:L134](https://github.com/KYStr/glossquote-labs-home/blob/9dde67ee408491dbfcef0cbadbb6a7f1a876bd02/docs/specs/tax-included-converter/SPEC.md#L134) | PASS_CONTENT | 48 核心+7 controller+3 export。10@5%逆算 forward差+1、99@0.51%差−1、多列總額/逐列稅差異、孤立surrogate/尾換行/超大Array等可重現。 |
| [handoff:L145](https://github.com/KYStr/glossquote-labs-home/blob/9dde67ee408491dbfcef0cbadbb6a7f1a876bd02/docs/specs/tax-included-converter/SPEC.md#L145) | PASS_CONTENT | 原截斷文檔已補成八節、四檔及原責任可追溯；法源查核沿用同日 peer 紀錄，本預審不另作稅務法律認證，正式實作仍需時效覆核。 |

數值方法審讀：gross/(1+r) 先取整 net，再令 tax=gross−net，與拿 net 做一次 forward 可能差1元；因此 roundtrip差異是必要模型輸出。多列四捨五入與先加總再捨入不可交換。

沿用證據（provided，未重跑）：PR301 / round2-tax：58/58、27,775組逆算與27,775組 forward samples、7 probes及3字面報告。候選四檔 bytes/sha 本次一致，全部58輸出本次只核對資料。

### stock-profit-calculator

| 章節與固定位置 | 預審 | 實質判斷 |
|---|---|---|
| [goal:L7](https://github.com/KYStr/glossquote-labs-home/blob/95ead301f8735dede61bc1911bbc7ed6c4b79bb5/docs/specs/stock-profit-calculator/SPEC.md#L7) | PASS_CONTENT | 買進一批股票並賣出部分時，估算手續費、賣出稅、已售成本、盈虧與理論損平價格，非交易建議。 |
| [scope:L16](https://github.com/KYStr/glossquote-labs-home/blob/95ead301f8735dede61bc1911bbc7ed6c4b79bb5/docs/specs/stock-profit-calculator/SPEC.md#L16) | PASS_CONTENT | 單次買賣/部分股數，券商參數可改；當沖須確認且整張匹配；理論0.01價格格線不冒稱交易所可下單跳動單位。 |
| [userFlow:L34](https://github.com/KYStr/glossquote-labs-home/blob/95ead301f8735dede61bc1911bbc7ed6c4b79bb5/docs/specs/stock-profit-calculator/SPEC.md#L34) | PASS_CONTENT | 買/賣股數、價格、費率及當沖確認，狀態和報告清楚；當沖條件變更會失效確認與舊結果，有特定controller測例。 |
| [inputsOutputs:L57](https://github.com/KYStr/glossquote-labs-home/blob/95ead301f8735dede61bc1911bbc7ed6c4b79bb5/docs/specs/stock-profit-calculator/SPEC.md#L57) | PASS_CONTENT | BigInt有理數分攤，已售成本以未捨入值比較；全部10金額輸出固定兩位字串避免超安全整數。整元手續費/稅跳點可使 net 非單調，搜尋有嚴格全域界。 |
| [implementation:L112](https://github.com/KYStr/glossquote-labs-home/blob/95ead301f8735dede61bc1911bbc7ed6c4b79bb5/docs/specs/stock-profit-calculator/SPEC.md#L112) | PASS_CONTENT | L(G) 連續下界及±1元捨入誤差推導 lo/hi，最多206個cent逐項掃描；固定純核心/Worker、資源上限、兩語及不外傳條件具體。 |
| [acceptance:L143](https://github.com/KYStr/glossquote-labs-home/blob/95ead301f8735dede61bc1911bbc7ed6c4b79bb5/docs/specs/stock-profit-calculator/SPEC.md#L143) | PASS_CONTENT | 九面向含全域最小cent證明、理論價格說明、法規時效、雙語/無障礙/瀏覽器與安全，現階段產品全部 NOT_RUN。 |
| [tests:L159](https://github.com/KYStr/glossquote-labs-home/blob/95ead301f8735dede61bc1911bbc7ed6c4b79bb5/docs/specs/stock-profit-calculator/SPEC.md#L159) | PASS_CONTENT | 29核心+4controller，額外非單調/跳動價格組與2字面報告；49/50/51價格對net49/48/49可否定二分單調假設，103/300成本可辨識先捨入錯誤。 |
| [handoff:L217](https://github.com/KYStr/glossquote-labs-home/blob/95ead301f8735dede61bc1911bbc7ed6c4b79bb5/docs/specs/stock-profit-calculator/SPEC.md#L217) | PASS_CONTENT | 原固定來源先byte-identical延續再修正，owner/claim/獨評責任保留；當沖稅率到期日是產品需覆核的明示約束，不因目前文件通過免除。 |

數值方法審讀：每個整元費/稅各有最多0.5元誤差，net對連續L的誤差至多1元；先證下界之下必虧，再以安全上界確保至少一解，於中間全枚舉而非二分，才可找非單調價格曲線的全域第一個解。

沿用證據（provided，未重跑）：PR308：Node exit0，29核心/4controller/8price probes/2reports/16原案；288掃描帶其中172從首cent枚舉411,968次，最大帶206。此輸出只存案例摘要，故本次核本工具4檔bytes和33個案例ID覆蓋，未聲稱逐案例數值重新相等或重算。

### baking-pan-converter

| 章節與固定位置 | 預審 | 實質判斷 |
|---|---|---|
| [goal:L7](https://github.com/KYStr/glossquote-labs-home/blob/8e717e5cd93ea9df06b54ede8dec8c7f7d1f0927/docs/specs/baking-pan-converter/SPEC.md#L7) | PASS_CONTENT | 由原模/新模容量比例調整配方數量並了解壁高差，避免把容器壁高當成實際麵糊高度或直接推算烘焙時間。 |
| [scope:L16](https://github.com/KYStr/glossquote-labs-home/blob/8e717e5cd93ea9df06b54ede8dec8c7f7d1f0927/docs/specs/baking-pan-converter/SPEC.md#L16) | PASS_CONTENT | 11固定模具、圓/矩自訂幾何、bundt/tube標稱容量各有basis；237ml/cup是明示選定慣例，填充比例與實際高度分開。 |
| [userFlow:L34](https://github.com/KYStr/glossquote-labs-home/blob/8e717e5cd93ea9df06b54ede8dec8c7f7d1f0927/docs/specs/baking-pan-converter/SPEC.md#L34) | PASS_CONTENT | 兩側表列/自訂、形狀/尺寸/深度、可選材料量單位、範例及壁高提示；停用欄不參與容量，編輯/取消/錯誤/reset/下載流程完整。 |
| [inputsOutputs:L57](https://github.com/KYStr/glossquote-labs-home/blob/8e717e5cd93ea9df06b54ede8dec8c7f7d1f0927/docs/specs/baking-pan-converter/SPEC.md#L57) | PASS_CONTENT | 圓/矩按未捨入容量求ratio；輸出容量取整不回饋公式。factor/percent/quantity正常精度若正值變0，從原值改8位再去尾零，最小合法值有正下界。 |
| [implementation:L109](https://github.com/KYStr/glossquote-labs-home/blob/8e717e5cd93ea9df06b54ede8dec8c7f7d1f0927/docs/specs/baking-pan-converter/SPEC.md#L109) | PASS_CONTENT | 固定π計算順序、封頂14欄raw/value、純核心/controller/Worker與安全DOM；不作用的自訂欄只按明示規則處理，報告僅結果避免草稿污染。 |
| [acceptance:L119](https://github.com/KYStr/glossquote-labs-home/blob/8e717e5cd93ea9df06b54ede8dec8c7f7d1f0927/docs/specs/baking-pan-converter/SPEC.md#L119) | PASS_CONTENT | 九產品面向各有容量表/自訂/低量邊界/兩語壁高提示與報告方法，真實瀏覽器及發布仍 NOT_RUN。 |
| [tests:L135](https://github.com/KYStr/glossquote-labs-home/blob/8e717e5cd93ea9df06b54ede8dec8c7f7d1f0927/docs/specs/baking-pan-converter/SPEC.md#L135) | PASS_CONTENT | 23核心+3controller、18字面JSON，原18cases與10reports保留；11表列和121有序配對、最小quantity/ratio與7 rounding transitions 已有peer證據。 |
| [handoff:L194](https://github.com/KYStr/glossquote-labs-home/blob/8e717e5cd93ea9df06b54ede8dec8c7f7d1f0927/docs/specs/baking-pan-converter/SPEC.md#L194) | PASS_CONTENT | 四檔、固定來源、獨立維護與未來八節/產品九項責任分離；常見的 File.arrayBuffer 模板文字不適用無檔案欄，但不改動具體14欄或下載契約。 |

數值方法審讀：比例用未捨入容量，表列整數體積另有明確定義。最小正 scaled quantity 為π/864000，遠大於8位小數半單位，不會被補救顯示再次捨為0。壁高8→4與底面400→100時縮量保持填充比例，不保持麵糊實際高度。

沿用證據（provided，未重跑）：PR311：23核心+3controller、11容量/121配對/18報告/10邊界/7transitions；本次26筆 provided derived 深比對當前字面值並核4檔hash，沒有重跑幾何 oracle。

### savings-goal-calculator

| 章節與固定位置 | 預審 | 實質判斷 |
|---|---|---|
| [goal:L7](https://github.com/KYStr/glossquote-labs-home/blob/35b2d302033af86e48337b7019a286180d5e8259/docs/specs/savings-goal-calculator/SPEC.md#L7) | PASS_CONTENT | 已知目標/現有存款/利率/固定月存者，求最早達標月、尾款和計畫期末餘額；模式A保留作模型回歸，利率只是假設。 |
| [scope:L21](https://github.com/KYStr/glossquote-labs-home/blob/35b2d302033af86e48337b7019a286180d5e8259/docs/specs/savings-goal-calculator/SPEC.md#L21) | PASS_CONTENT | 明列既有#44/#80已含兩種反算，提案是未逐月捨入的尾款模型與1200月界限；原模型逐月捨分、600月及既有表格/CSV責任保留，後續另案整合。 |
| [userFlow:L31](https://github.com/KYStr/glossquote-labs-home/blob/35b2d302033af86e48337b7019a286180d5e8259/docs/specs/savings-goal-calculator/SPEC.md#L31) | PASS_CONTENT | 雙語模式、共用與不作用草稿、目標/尾款/計畫餘額/存全額餘額分列、固定no-growth/beyond-horizon句、修改取消晚到與下載失效完整。 |
| [inputsOutputs:L54](https://github.com/KYStr/glossquote-labs-home/blob/35b2d302033af86e48337b7019a286180d5e8259/docs/specs/savings-goal-calculator/SPEC.md#L54) | PASS_CONTENT | 金額整數分、利率bp、B(k)精確有理數；先B(1200)篩選再界內二分。尾款ceil差額，餘額half-up，利息由顯示餘額減本金和實存，目標不假充期末。 |
| [implementation:L98](https://github.com/KYStr/glossquote-labs-home/blob/35b2d302033af86e48337b7019a286180d5e8259/docs/specs/savings-goal-calculator/SPEC.md#L98) | PASS_CONTENT | BigInt冪與餘額入口在運算前拒非整數或0–1200外索引，最大6137位分子有限；固定Worker、世代、30秒Blob撤銷、無storage及外傳。 |
| [acceptance:L108](https://github.com/KYStr/glossquote-labs-home/blob/35b2d302033af86e48337b7019a286180d5e8259/docs/specs/savings-goal-calculator/SPEC.md#L108) | PASS_CONTENT | 三維護面向明確與未來九產品面向分列，後者分數null/NOT_RUN；真實BigInt跨瀏覽器一致、既有兩反算回歸、資料/無障礙方法完整。 |
| [tests:L124](https://github.com/KYStr/glossquote-labs-home/blob/35b2d302033af86e48337b7019a286180d5e8259/docs/specs/savings-goal-calculator/SPEC.md#L124) | PASS_CONTENT | 23核心+3合成controller；1200/1201、正利率超期、0.5分差額尾款1分、零尾款成長超額等明示。first-hit和一分最小性不等式、資金恆等及索引記錄能反駁錯誤。 |
| [handoff:L179](https://github.com/KYStr/glossquote-labs-home/blob/35b2d302033af86e48337b7019a286180d5e8259/docs/specs/savings-goal-calculator/SPEC.md#L179) | PASS_CONTENT | 明確現階段只文件、保留owner及原PR245，既有compound工具後續另claim整合，提案不計新ready。REG-01依現行core另作mapping，不用舊措辭跳gate。 |

數值方法審讀：B單調非減且PV<FV時，精確B(1200)已達標才進二分，最多11中點。尾款ceil(max(0,FV−beforeTail))且不超PMT；若beforeTail≥FV可為零，餘額可能明顯高於目標。0.505+0.01=0.515顯示0.52，不能把目標0.51硬塞回餘額。

沿用證據（provided，未重跑）：PR310：Fraction逐月獨算26案、1200首次達標位置、96資金/非負利息樣本、3canonical報告，與原21案保留/7預期調整記錄。本次26個actual對目前expected相等，未重跑Fraction。

## 沿用的固定獨評來源

- [PR302 / round2-wallpaper-ping](https://github.com/KYStr/glossquote-labs-home/blob/9542f4b3604dda9164d9d74eab6706cdcc368a3c/docs/reviews/five-hour-2026-11-11/spec-review-01/round2-wallpaper-ping/REVIEW.md)，固定 9542f4b3604dda9164d9d74eab6706cdcc368a3c。
- [PR301 / round2-pricing](https://github.com/KYStr/glossquote-labs-home/blob/8fd296a78c43c1c4b8af0fc4ceff81c776671a38/docs/reviews/five-hour-2026-11-11/spec-review-03/round2-pricing/REVIEW.md)，固定 8fd296a78c43c1c4b8af0fc4ceff81c776671a38。
- [PR301 / round2-tax](https://github.com/KYStr/glossquote-labs-home/blob/8fd296a78c43c1c4b8af0fc4ceff81c776671a38/docs/reviews/five-hour-2026-11-11/spec-review-03/round2-tax/REVIEW.md)，固定 8fd296a78c43c1c4b8af0fc4ceff81c776671a38。
- [PR308 / round2-stock](https://github.com/KYStr/glossquote-labs-home/blob/ceb491150015a6d75627d3152167eb186113da0a/docs/reviews/five-hour-2026-11-11/spec-review-03/round2-stock/REVIEW.md)，固定 ceb491150015a6d75627d3152167eb186113da0a。
- [PR311 / round2-baking](https://github.com/KYStr/glossquote-labs-home/blob/51daef523d9cccd3ef368cd5d861e78171dea338/docs/reviews/five-hour-2026-11-11/spec-review-07/round2-baking/REVIEW.md)，固定 51daef523d9cccd3ef368cd5d861e78171dea338。
- [PR310 / round2-savings](https://github.com/KYStr/glossquote-labs-home/blob/d12da87f4e0269f2833a2fc1e94b7e9ea32a7d50/docs/reviews/five-hour-2026-11-11/spec-review-04/round2-savings/REVIEW.md)，固定 d12da87f4e0269f2833a2fc1e94b7e9ea32a7d50。

## 非阻擋文字與必要後續

- Ping 把有小數的常數稱作「整數」、部分共同模板提及本工具沒有的 File.arrayBuffer，屬文字清理；具體有理數公式、有效欄位與下載規則已消除執行歧義，不要求為此擴大修正範圍。
- 舊 handoff 對「新產品製作」的通用描述不能覆蓋 wallpaper/ping 既有 build 與 savings 升級裁定；將來 mapping/dispatch 必須明列續作定位、原 owner、所有來源維護 contributors。
- 稅/當沖的法源與時效採同日 peer 已記錄查核，本次只審文件的明示假設和方法，沒有獨立重新開啟法源，也不給法律或投資認證。實作/發布時應核當時有效條件。
- 將來固定 mapping 候選後，需驗其 byte mapping、預宣告 targets/八 criteria、所有來源 makers 的歷史閉包、current registry source acceptance、實際 owner/claim/submission，再由非作者正式評分；不能把本報告或維護三項分數直接當 ready。
- 文件預審不需要產品 GUI；產品九面向、實際下載、兩瀏覽器、focus isolation、Network/Storage、HTTPS/SEO、部署與外驗全未執行，仍為 NOT_RUN / NOT_RUN_USER_FOCUS_INCIDENT（適用者）。

## 可重現入口

本資料夾已含固定下載副本，可執行 `node audit-inputs.mjs`；它只核 bytes/來源對應/章節定位/既有輸出相等，不執行產品或 oracle。從乾淨目錄重建時，先複製 `input-manifest.json`、`fetch-inputs.mjs`、`audit-inputs.mjs` 到該目錄，執行 `node fetch-inputs.mjs` 再 `node audit-inputs.mjs`。下載器以 wx 保護既有檔案，應在新資料夾執行，不能覆蓋當前證據。

[固定來源 manifest](input-manifest.json) · [53 檔下載結果](download-verification.json) · [本次資料稽核結果](input-audit.json) · [64 格實質矩陣 JSON](semantic-matrix.json)
