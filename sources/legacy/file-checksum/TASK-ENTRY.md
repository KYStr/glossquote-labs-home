# 檔案 SHA-256 校驗原功能對話入口

任務ID：THREAD-15-file-checksum。狀態：候選規格排隊中，尚未派工/實作；僅主對話有名額後建立原功能對話。名稱必須為「檔案 SHA-256 校驗」，明確配置gpt-6.1-sol/max；後端身份工具未暴露時寫未確認。

## 有界目標與第一個milestone

依本資料夾完整規格實際完成選擇本機檔案、計算SHA-256、比對預期码、複製/下載校驗碼；不上传檔案。完成繁中/英文、必要功能與安全驗收、SEO/build/404/headers、獨立公開GitHub及發布候選交付；配合主對話後續正式部署、外部複驗返工。T00首先建立真實可驗的骨架，之後按TASKS順序持續推進，不能只提供提示詞或計畫。

本機/MVP、GitHub、hosting、主驗、外驗分開記錄。整個產品直到主對話驗證正式站與外部驗收才完成；本對話到READY_FOR_INTEGRATION是等待主對話整合，不是要求使用者重新授權。可用Goal工具時建立上述有界交付目標並如實記錄；有舊目標無法替換不要假標complete，不因等待整合重跑沒改的gate。

## 目錄與共享邊界

- 所屬相對目錄：tool-projects/15-file-checksum/（相對孵化器根）；在本工具目錄執行命令。可單獨複製本資料夾，產品不依賴父/兄弟source。
- 專用append-only證據：孵化器根 .runs/file-checksum/；發布副本：.runs/github-publish/glossquote-labs-file-checksum/。已有副本先審查，保留歷史，不刪重建、不force push。
- loopback預覽127.0.0.1:4195，fixture如需要127.0.0.1:5195；占用則使用OS分配空閒埠並記錄，不能終止占用者。
- GitHub目標https://github.com/KYStr/glossquote-labs-file-checksum（尚未確認存在）；正式候選https://hash.glossquote.com/index.html及/en/index.html（尚未部署）。
- 可寫本工具当前T項allowed paths、共通project.json/HANDOFF狀態與本工具dist生成物；禁止tool-projects/00-home、其他工具、根AGENTS/.codex、GlossGate、040141.xyz、DNS/Cloudflare帳戶或正式Worker。
- 不讀任何憑證，包括主對話已授權的部署token文件。GitHub可用既有gh授權狀態，不使用gh auth token或搜尋/列印憑證。source發布失敗不得虛構remote commit；真缺權限回報。
- 同一主機最多四個功能對話，沒有worktree隔離；不要根目錄git操作。對話只使用自己新建分頁/假資料/程序，不操控使用者或媒體測試tabs。

## 停止與回報

遇到scope外權限/成本/依賴、未知persistent environment漂移、他人改同檔、重大規格矛盾或必要gate失敗無新路徑，停止受影響部分並回報證據/下一步；其他獨立就緒工作可繼續。禁止以雲端處理代替本機或降低上限/精度/隱私以求綠燈。主對話會實際讀結果並獨立驗收。
