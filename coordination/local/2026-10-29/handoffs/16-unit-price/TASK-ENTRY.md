# THREAD-16-unit-price

名稱：購物單價比較。請求模型 gpt-6.1-sol，推理 max；後端未由 host 證據提供時標未確認。

## 完整目標

實作本規格的單價比較，讓人輸入同一幣別的整組實付價、每包容量與包數，獲得精確排序及最低單價；處理全在使用者瀏覽器。完成中英文、必要驗證、PUBLIC GitHub、免費 Cloudflare 發布配置與固定來源包；配合主對話驗收、部署、首頁與之後外驗修正。不要只產提示詞或計畫。可用 Goal 時建立此有界交付目標，不能以其他未完成目標假 complete 來替換。

## 本輪 M1/T00

完整可操作本機版本，詳細範圍與驗收見 TASKS。非目標：正式部署/首頁、買域名/付費/新授權、商品查價/API、匯率/稅務、自動優惠券、商品品質判斷、其他工具修正。M1 完成後交付凍結版本，由主對話親驗後才放行 M2。總目標存在不授權自行越過里程碑。

## 所有權

- 工具目錄：孵化器根下 tool-projects/16-unit-price/；產品及複製後的測試不得引用父或兄弟專案 source。
- 只寫本工具當前 allowed paths。专用 append-only 證據可寫孵化器根 .runs/unit-price/；M2 發布副本 .runs/github-publish/glossquote-labs-unit-price/。先核對現存副本，不刪除重建/force push。
- dev 127.0.0.1:4196；必要假 fixture 預覽 127.0.0.1:5196。占用改用 OS 分配 port，記錄；不停止占用者。
- PUBLIC source 目標 https://github.com/KYStr/glossquote-labs-unit-price；正式目標 https://price.glossquote.com/index.html 與 /en/index.html，均是待建立候選，不能宣稱已存在。
- 不寫 00-home、任何兄弟工具、根 AGENTS/.codex、GlossGate 或 040141.xyz。不能部署正式 Worker、碰 Cloudflare 帳戶或讀 token。主對話負責這些已授權整合。
- 只用假資料與自己新增的瀏覽器分頁/程序。禁止讀私人資料、profile、環境秘密及憑證庫。

## 停止與回報

同檔另有寫入者、必要 gate 失敗、未知持久環境漂移、需要額外權限/成本/依賴、重大規格矛盾時，停止受影響部分並回報證據。不要以雲端替代、不省精度、不修改接受條件換取綠燈。結果須列實際檔案、命令/exit、未驗項、已知風險、待主代理決策；完成 M1 後釋放 owner 並保持檔案不變供驗收。
