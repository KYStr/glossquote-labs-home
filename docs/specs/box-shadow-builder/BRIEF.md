# CSS 卡片陰影編輯器規格工作說明

產品方向：CSS 卡片陰影編輯器 / Box Shadow Builder  
預定 Spec ID：`spec-box-shadow-builder-v1`  
交付類型：一份完整製作規格與作者查核；本文件只是開工 brief，不是完整預案、實作或 ready。

## 使用者與問題

網站維護者需要為卡片調整陰影的方向、邊緣柔和程度、擴散與層次；只調顏色無法看懂幾何變化，手寫多層 CSS 容易把前後層及 inset 搞反。工具讓人輸入有界參數，觀看同一快照的正常卡片預覽，取得可貼用的確定格式 box-shadow。這是具體用途假設，不聲稱已訪談或有使用量證據。

## 範圍

完整規格須定義 1–4 層陰影，每層有水平/垂直偏移、模糊半徑、擴散距離、六位 HEX、整數不透明度及外陰影/內陰影選擇。層順序有意義，提供正常按鈕增刪及前後移動，不要求拖曳。負值只適用偏移及擴散，模糊不可負；所有 raw 格式、長度、數值界及錯誤優先序須固定。

主要成果是瀏覽器原生 CSS 卡片預覽、文字參數摘要、可選取/複製及下載的固定格式 CSS。預覽背景/卡片尺寸與圓角要明示，不把預覽輔助值偷偷加入輸出；不保證任意網站都相同或以像素逐位元匹配判跨瀏覽器品質。

無帳戶、上傳、儲存、遠端服務、套件安裝、任意 CSS 匯入/執行、圖片/Canvas 匯出、text-shadow、filter/drop-shadow、動畫、漸層、對比評分或自動美化。當前工作不部署、不建新網站、不修改首頁/catalog/權限/費用。

## 固定來源與去重

- 主頁基線：[26525d5 README](https://github.com/KYStr/glossquote-labs-home/blob/26525d5f6380915ea95dde879dec769442db0d95/README.md)。
- [既有目錄](https://github.com/KYStr/glossquote-labs-home/blob/dd059fc489ffc79c64754182ce09bc84151ae054/catalog.json)：56展示項不是ready庫存。
- [registry319](https://github.com/KYStr/glossquote-labs-home/blob/c6b91394a25064b62b4d61c69666e59933fafe7d/coordination/work-registry.json)：原有保留項/責任不動；只有完成且未消耗的預案才計存量。
- [Color Palette](https://github.com/KYStr/glossquote-labs-home/blob/be197ea30d909b1353e7f77bdf16b1811ac41f71/coordination/local/2026-10-29/specs/10-color-palette/SPEC.md)：單色轉換/平面對比/色票或color配對，不編輯陰影幾何與層次。
- [Linear Gradient Builder](https://github.com/KYStr/glossquote-labs-home/blob/aaa8ff63e8673efccc0c21ff2d32632a510f7f42/docs/specs/linear-gradient-builder/SPEC.md)：角度/有序停止點產生background-image，沒有偏移/blur/spread/inset；本件不能改名重交同一流程。
- [Image Overlay](https://github.com/KYStr/glossquote-labs-home/blob/be197ea30d909b1353e7f77bdf16b1811ac41f71/coordination/local/2026-10-29/specs/53-image-overlay/SPEC.md)：輸入兩張點陣圖、逐像素混合及PNG，不是CSS陰影。
- CSS語義參考：[CSS Backgrounds and Borders 3 固定版本](https://www.w3.org/TR/2024/CRD-css-backgrounds-3-20240311/#box-shadow)。只採限定語法與原生呈現，不重做瀏覽器陰影演算法。

最新 registry、PR、所有原owner及本人ACK仍須在承接時重新核對。brief或候選本身不算ready；不得承接已有reserved的相似工作來充新庫存。

## 文件完整度的八項必要驗收

| ID | 必須可核的內容 |
| --- | --- |
| goal | 明確受眾、具體問題、可觀察成功條件、假設與非目標。 |
| scope | 包含/排除功能，固定來源及近似方向的用途/操作/輸入輸出差異；不搶owner、不靠改名重複。 |
| userFlow | 初始、正常編輯/產生/層序/取出、修錯、清除/語言取消及重複操作；正常可見UI，不靠隱藏入口。 |
| inputsOutputs | 有界raw/schema、所有端點、符號/透明度/層序、確定CSS與UTF-8/MIME/檔名、精確有效/無效例及生命週期。 |
| implementation | 純核心/controller/DOM分層、靜態ESM/Node24零依賴、雙語/可及性/安全/CSP與可執行的開發驗證順序。 |
| acceptance | functionality、boundaries、privacy、security、usability、accessibility、localization-seo、toolchain-provenance、compatibility九面向的方法/預期/證據完整；未測NOT_RUN，不用純測代原生或自造分數。 |
| tests | 獨立expected、有效/無效/合法端點與相鄰值、晚到copy/URL清理、負值/模糊/透明/層序，以及必要桌面瀏覽器檢查。 |
| handoff | 同候選固定SPEC/作者查核/open PR、非作者八節布林完整度核實、同ID修訂，另productiontask/claim；未實作不宣稱產品品質或部署。 |

九項產品品質仍需逐項至少90及必要檢查全完成，不能由規格文件完整度換算。原協議mark-spec-ready使用八節布林；沒有預先固定的文件數值錨點就不捏造八項90，不把spec ready和task數值accepted混成一件事。

## 完成與停止界線

完整SPEC至少八節，給出真正可直接實作的限定契約及可反駁測試。作者查核只陳述實際文件核對與未做事項。不同作者親讀固定commit核完整後才可ready；作者不可自評或代簽。正式製作另有合法task/allowedExecutors/claim，規格claim不能沿用。遇到來源未知、所有權衝突、公開動作拒絕或不明結果，停相依動作並如實回報，不換路徑繞過。
