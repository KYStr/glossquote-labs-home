# 介面與 SEO 規格：行李清單與重量試算

狀態：SPEC_ONLY。預覽索引設定、正式 SEO 與瀏覽器外觀均 NOT_RUN。介面採 Gloss Tools Product App；主畫面直接是一張可編輯清單，沒有抽象行銷 Hero。

## 工作畫布

桌面首屏：頂端小型產品列；主要區域依序顯示清單資料表、摘要（已打包列 / 件數、已知重量/未知項目）、新增物品與重量上限。匯入/匯出與範例是清單附近的次要動作；清空放在明確的次要區且需確認。若摘要空間不足，置於清單下方，不擠壓欄位。

桌面草圖：頂端產品列顯示「行李清單與重量試算」及資料只留在此分頁；主區每列依序是名稱、數量、單件重量 g、已打包 checkbox、刪除。下方是完整摘要與重量上限。新增、下載備份、匯入 JSON、載入範例置於清單邊緣。

手機寬 320 CSS px：每列轉成垂直排列的可編輯區塊，不讓整張表水平捲動；名稱、數量、重量、checkbox、刪除保持標籤與易達觸控尺寸。摘要換行；下載與新增操作不被虛擬鍵盤遮住。資料欄多時可在列內排布兩欄，但讀序仍是名稱、數量、重量、打包、刪除。

## 主要狀態與介面文字

- 空狀態：「還沒有物品。新增第一項，開始整理清單。」
- 新列成功：「已新增物品。重量留白代表尚未量重。」
- 重量未知：「尚有 1 列（2 件）未填重量；目前只顯示已知重量小計。」
- 完整但未設上限：「總重量 800 g。尚未設定重量上限。」
- 有未知且已知小計不大於上限：「有 1 列重量未知，因此目前無法判斷是否超過 5,000 g。」
- 有未知但已知小計已超上限：「已知重量小計已超過上限至少 200 g；尚有未知重量，完整總重及實際超出量未知。」
- 完整超限：「總重量比你設定的上限多 250 g。」不可寫「不能登機」。
- 篩選無結果：「目前沒有未打包的物品。」全表摘要維持不變。
- 匯入成功解析後：「備份包含 2 列、3 件；取代目前清單前請確認。」按鈕明示「以備份取代目前清單」與「取消匯入」。
- 匯入錯誤：「無法使用這份備份。請選擇 GlossQuote 行李清單匯出的有效 JSON 檔。」不回顯任何原始內容。
- 覆蓋範例/清空確認說明會清掉目前資料；取消維持原資料。
- 刷新提示固定可見：「重新載入或關閉分頁會清除清單。要保留，請下載 JSON 備份。」

所有錯誤靠欄位 label/help/error 關聯；status 用文字和 icon，不只用顏色。新增列將焦點移至新名稱欄位；刪除後將焦點移至下一列同動作或前一列。確認 dialog Escape 可取消並還原焦點。

## 本地化 SEO 草稿

Slug packing-list；預定 host packing.glossquote.com 是未來已授權免費部署的目標，尚未部署。正式 canonical、hreflang、sitemap 只在 M2 固定來源後、M3 實際發布時填入真實 HTTPS URL。預覽兩語都必須有 noindex,nofollow；不得在 M1 宣稱已可索引。

繁中：
- title：行李清單與重量試算｜GlossQuote Tools
- description：整理旅行物品、打包狀態與已知重量。留白重量會標成未知，不會當作零；支援本機 JSON 備份與預覽匯入。
- H1：行李清單與重量試算
- intro：列出要帶的物品與數量，勾選已打包項目；輸入實際量到的重量後查看小計。重量未知時不會猜數字。
- FAQ：「留白重量會當作 0 嗎？」不會，會顯示未知並阻止完整總重及上限判斷。「這會套用航空公司行李規則嗎？」不會，上限由你自行輸入，結果不代表可否登機。「重新整理會保留清單嗎？」不會；請先下載 JSON 備份，工具不會把清單傳到伺服器。

英文：
- title: Packing List & Weight Planner | GlossQuote Tools
- description: Organize travel items, packed status, and measured weights. Unknown weights stay unknown; preview a local JSON backup before replacing a list.
- H1: Packing list and weight planner
- intro: List what you plan to bring, mark packed items, and enter measured weights when you know them. The tool never treats a blank weight as zero.
- FAQs: “Does a blank weight count as zero?” No; it is unknown and prevents a complete total and limit comparison. “Does this apply airline baggage rules?” No; you set the optional limit and the result is not boarding advice. “Will a refresh keep my list?” No; download a JSON backup first. The tool does not upload the list.

M2 production pages must include self canonical, reciprocal zh-Hant/en hreflang plus x-default to Chinese, aligned title/description/H1, OG locale/url and a static WebApplication schema matching visible text. M1 preview must not contain a live canonical or production sitemap. Never claim weight accuracy beyond user-entered values, user counts, savings, or search ranking.

