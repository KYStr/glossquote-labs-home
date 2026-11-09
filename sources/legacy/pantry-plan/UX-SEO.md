# 工作區與雙語SEO
這是規格，Product App模式，遵守[設計系統](docs/DESIGN-SYSTEM.md)。
上方料理分組需求表、旁邊現有庫存可摺疊；主要按鈕產生採買清單；結果以還要買優先、已有足夠另折疊，單項可展開來源，手機一欄編輯與清單。

```text
桌面：工具名 / 語言 / 返回首頁
      [來源與相鄰設定] [主要工作畫布或結果]
      [欄位錯誤/限制] [明確產出動作]
手機：工具名 → 來源/設定 → 主動作 → 結果 → 匯出
```
初始「加入資料開始 / Add data to begin」；進行「處理中，可取消 / Processing, you can cancel」（只async）；空結果「沒有符合的項目 / No matching items」；invalid「請修正標示欄位，舊結果已清除 / Fix the marked fields; the previous result has been cleared」；不支援顯示必要能力與停止。單一primary action隨階段變化，禁多層等高卡片/巨型hero。真人資料不預填。
鍵盤順序依實際工作；44px觸控、兩層focus、正常字4.5:1、控制邊3:1。320px周邊重排，表格/畫布可具名局部捲動；200%/reduced motion。所有日期/數字含必要單位、結果長字容錯。labels/錯誤/id兩語對照，勿靠placeholder。

## 真實文案
繁中title：食材差額採買單｜本機處理工具 - GlossQuote
繁中H1：食材差額採買單
繁中description：煮幾道菜時同一食材分散在不同食譜，家裡也有一些，想一次知道到底還要買多少。 使用 食材差額採買單，在瀏覽器本地整理資料並取得可下載成果。
English title: Pantry-aware shopping list | GlossQuote
English H1: Pantry-aware shopping list
English description: Pantry-aware shopping list in your browser. Review the result and export it locally without uploading your input.
工具說明必須以PRODUCT的完整使用情境與結果翻譯，不只翻按鈕。至少以下FAQ兩語可見：
### 可以把克換成毫升嗎？
不能。不同材料密度不同，請用同類單位。

### Can grams convert to millilitres?
No. Mass and volume remain separate.

### 同名材料會自動合併嗎？
名稱去頭尾空白後精確相同且單位相容才合併，不猜同義詞。

### How are ingredients grouped?
By the trimmed exact name and compatible unit dimension.

### 會記住我的庫存嗎？
不會自動保存；請下載專案JSON，下次自行匯入。

### Is inventory saved automatically?
No. Export and re-import the project JSON when needed.

## Preview與正式
M1 robots noindex,nofollow，無production canonical/sitemap，不能偽造live。首頁固定https://glossquote.com/index.html / https://glossquote.com/en/index.html；切換/en/index.html及/index.html不附任何輸入。domain候選shopping-list.glossquote.com，不是已部署網址。
M2/M3主代理放行後production每頁自指canonical；hreflang zh-Hant/en/x-default（fallback繁中）互返，robots/sitemap精確兩網址，title/description/H1各語，SoftwareApplication JSON-LD只寫可見真實能力無rating。CSP default-src self; connect-src none; frame-ancestors none、nosniff、no-referrer等依release契約，實際HTTP再驗。沒有analytics/font/CDN。未知路徑真404不是首頁200。
