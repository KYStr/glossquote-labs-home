# M2 初步獨立審查

範圍為 `labs-blocked-four-repairs-20261109` 的四款維護候選與共用檢查站整合。這是隔離工作副本的初步審查。正式評分需綁定公開 PR 的凍結修正 commit、實際發布證據及交付封包。

**已關閉**。以下 Fluid 問題為發布前歷史發現。PR 219 凍結候選 `df37047f963e0f06044e0136448c70c95aa58a2e` 已修正。兩語的實際發布通知 HTML/CSS 已通過隔離 Chromium 的六次樣式與導覽檢查。見 [發布前複驗](predeploy-review.md)。

## Fluid Typography 發布前須修正

從繁中檢查頁點工具列的語系連結後，`tools/fluid-typography/src/app.mjs` 使用 `history.pushState` 切換至英文 URL，更新主內容與 `#labs-home`。`prepare-release.mjs` 額外注入的 `.gq-inspection-notice` 未納入語系切換，因而仍顯示繁中文案、繁中首頁及繁中檢查目錄連結，通知區語系連結也仍指向當前英文頁。英文起點切回繁中時會遇到相反問題。現有 fake DOM overlay 測試只替換 canonical、alternate 與工具列首頁連結，沒有實際檢查注入的通知區。

修正後以真正的 overlay 輸出覆蓋兩個語系起點、往返與 history popstate，檢查通知區文案、首頁、檢查目錄及另一語系連結，並保留已產生的 CSS 與既有表單狀態。

## 其他候選

- 詞頻已檢視文字與測試差異。計數前詞元篩選、計數後列門檻、Unicode C+S 及 CSV 全列行為互相吻合。
- 語音已檢視目前聲音重新列舉、`localService === true` 判斷及取消路徑。實際 OS 語音與網路行為為 NOT_RUN。
- SVG 已檢視只允許已知名稱及安全值的重新序列化。瀏覽器資源載入、影像解碼及畫布輸出為 NOT_RUN。

上述三款的初步原始碼檢視目前沒有發現同級發布阻礙。公開修正 commit、實際 HTTP 標頭與位元組、路由隔離及單一 ZIP 完整性仍待後續核對。真實瀏覽器與原生介面維持 NOT_RUN_USER_FOCUS_INCIDENT。
