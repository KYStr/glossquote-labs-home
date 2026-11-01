# Flex Shrink 分配解說器 — specification admission brief

2026-10-31。短 BRIEF 公開候選，非完整 SPEC、正式承接或產品開工；不計 ready 庫存。此文件本身不授權上傳或實作。

## 目標與建議邊界

協助桌面使用者理解有限數字模型中各 flex item 為何縮成不同寬度，以及明確最小寬度造成的凍結與剩餘溢出。候選輸入為固定單列 3–6 個空白示意項目的容器內寬、px basis、非負 shrink 與明確 px min-width；輸出擬為逐輪數值表、示意條及可選取 CSS。具體範圍、精度、錯誤契約與算例留正式 SPEC 決定，現在不實作。

擬固定 horizontal-tb/ltr、row/nowrap、grow:0、content-box、零 margin/padding/border/gap、max-width:none；min-width 預設明確 0，而非 auto。以空白非替換元素排除字型與內容測量；標籤放外側。容器為明確 px 寬。正自由空間只保留不成長狀態，不提供 grow 設計器。不得保證所有輸入都能消除 overflow。

## 官方來源核正（2026-10-31 實讀）

依 [W3C CSS Flexbox §9.7](https://www.w3.org/TR/2025/CRD-css-flexbox-1-20251014/#resolve-flexible-lengths)：縮減權重含 inner flex base size，但仍有初始凍結、因子總和小於 1 的處理及 clamp/違例凍結迴圈；不能用一次比例分配冒充完整流程。依 [§4.5](https://www.w3.org/TR/2025/CRD-css-flexbox-1-20251014/#min-size-auto)：auto 最小尺寸受內容與 overflow 條件影響，不能一律當 0。因此本候選明確排除 auto/intrinsic basis、內容式最小尺寸、替換元素與 aspect-ratio；亦不計跨軸 baseline、換行、百分比或完整瀏覽器佈局。該來源是 Candidate Recommendation Draft，非宣稱通過瀏覽器一致性認證。

## 差異與碰撞來源

已核對 GitHub KYStr/glossquote-labs-home default codex/initial-publication registry391、catalog 56 項與可見 PR2–16，未發現相同分配解說範圍。Grid 是二維軌道/格位；Object-fit 是影像容器裁切；Box Fit 是三維裝箱；Fluid 是字級插值；Transform-Origin 是旋轉基點。本候選不是既有工具換皮。

此為可見來源的有限負面證據，未登記 local/未公開稿仍 UNKNOWN，不可寫成 0 或保證全域無重複。正式接入前須再次確認碰撞及協調結果。

## 建議識別、來源與合法入口

- Repository: `KYStr/glossquote-labs-home`；source 固定 `26525d5f6380915ea95dde879dec769442db0d95` 的 `README.md`。
- 建議 taskId: `labs-flex-shrink-spec-20261031`；workType: `spec`。
- 建議 specId: `spec-flex-shrink-20261031`；這些 ID 尚未登記或保留。
- 建議文件位置：`docs/specs/flex-shrink/BRIEF.md`，後續同目錄 SPEC/AUTHOR-CHECK 與由非作者本人出具的 INDEPENDENT-REVIEW；不包含產品程式。
- 建議 allowedExecutors: `["cloud-dot"]`，僅限此規格撰寫任務，不授權雲端產品製作。實際 owner/claim 必須由 registry 決定，本文件沒有指定或轉移 owner。

先固定 GitHub brief/source，再登記唯一 task、完整九面向及允許執行端；實際作者以本人有效 ACK、最新 registry/core/CAS claim 精確讀回後才啟動正式規格工作。雙端 reconciliation 或碰撞條件不符就停止。既有 owner 一律保留；不能由等待/離線推斷釋出。完整規格之後須另行固定來源並由不同作者獨立審查，才可進入 readiness。產品需另外合法承接，不沿用本 spec 任務授權。

## 後續八節工作提綱（尚未執行）

1. 固定來源、用途與非目標；2. 有限桌面使用流程及焦點/錯誤契約；3. 輸入 grammar/邊界與資料模型；4. 官方子集算法、終止與格式化；5. 示意/表格/CSS 輸出契約；6. 九面向驗收要求；7. 算例、邊界及正常桌面測試計畫；8. 交接、版本證據與獨審閉合。

九必要面向固定如下；各面向後續獨立產品評分門檻至少 90，未測 null。規格交付須把每列展開成可重現的輸入/結果/證據判準，不得刪列或以平均分替代。文件八節完整度獨審與產品評分分開。

|ID|規格必須涵蓋的完整要求|
|---|---|
|functionality|官方限縮模型、初始凍結、factor 合計小於1、違例迴圈、最小值與剩餘溢出；逐輪表/示意/CSS 同源且可追溯。|
|boundaries|數值 grammar/長度/範圍/精度、零權重、相等邊界、min大於basis、無可縮項、格式化及 stale/error/reset 狀態。|
|privacy|只處理非敏感數字；無資料上傳、URL輸入狀態、持久化、遙測、檔案讀取或額外權限；明訂未來實際驗證證據。|
|security|封閉解析/固定輸出、可信 style/text sink、惡意輸入拒絕與有界資源；不接受任意 CSS/HTML 或外部資源。|
|usability|普通桌面非作者能輸入、理解凍結與溢出、修正錯誤及手動選取CSS；清楚區分模型與完整browser行為。|
|accessibility|鍵盤/焦點/標籤/錯誤/文字替代、有限明確對比及縮放重排；不以顏色獨傳資訊，不加不可測設備硬門檻。|
|localization-seo|繁中/英文靜動態說明與錯誤一致；數值/CSS不隨語言改變；頁面lang/title/description及同語言連結可核驗。|
|toolchain-provenance|既有工具鏈、無新增相依、純核心與呈現分層、獨立期望算例、版本/來源/建置/交接及限制可重現。|
|compatibility|可用正常桌面瀏覽器的指定viewport/zoom、native模型比較及誤差契約、navigation/reset、有限性能量測；未支援明列。|

不擅增手機/讀屏或全 WCAG 認證硬門檻。具體算法、數值範圍、算例及測試矩陣屬後續合法 claim 後的完整 SPEC，不由這份入口 brief 冒充完成。

## 限制與停止點

無外部依賴、費用或敏感輸入；不讀檔、不接 URL、不上傳、不持久化使用者資料。產品、算法算例、瀏覽器比對與完整度獨審皆 NOT_RUN，九分數全 null。尚無完整 SPEC、branch、PR、task、claim、ready。此短 brief 僅供合法入口決策，不延展成未承接的製作。
