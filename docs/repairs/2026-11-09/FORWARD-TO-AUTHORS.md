請接續修正自己原本負責的 GlossQuote 工具，保留原作者、原任務及原 PR。先讀取共享 repo KYStr/glossquote-labs-home 的最新 AGENTS、協作流程與 work-registry；本人 acknowledge，沿合法原 claim 續接。詞頻、朗讀與 SVG 只有規格承接，不能冒用規格 claim 當成製作承接；請原統籌先完成規格修訂／非作者覆核，再依法登記產品續修，不重做新工具或使用 adopt-existing 繞過。

1. 詞頻：產品 https://github.com/KYStr/glossquote-labs-word-frequency/pull/1 ，規格 https://github.com/KYStr/glossquote-labs-home/pull/38 。
這次是規格、UI 說明與既有算法的定義不一致。保留目前 alpha alpha beta／最低次數 2 → total=3、alpha=2/3 的行為，不改成 2/2。先訂正規格：停用詞、數字開關與最小詞長影響計數母數；最低次數篩選 UI 和 CSV 的列但不改母數；前 100 筆只限制畫面，CSV 仍匯出所有通過最低次數的列。Unicode simple case folding 保留 C+S，修正規格誤寫 C+F。兩語說明與邊界／CSV／折疊回歸須一致。主代理已在原產品 PR 更正之前的判讀。

2. 文字朗讀：產品 https://github.com/KYStr/glossquote-labs-text-to-speech-reader/pull/1 ，規格 https://github.com/KYStr/glossquote-labs-home/pull/30 。
原規格允許遠端/default fallback，先修訂為本產品的本地朗讀契約。只允許 localService===true 的聲音，每次 speak 前重新確認；無可用本地聲音、voiceschanged 移除聲音或播放錯誤時明確停用／停止，不回退到遠端或未指定的預設聲音。補 fake local/remote/missing/voice-change 與錯誤測試；兩語介面、隱私文字一致。這些單元測試不能替代真實瀏覽器／Network 驗證。

3. 流動字級：沿 https://github.com/KYStr/glossquote-labs-home/pull/40 與原 production claim 續修。
補齊繁中與英文的獨立靜態 HTML，兩語都有完整內容、title/description、canonical、hreflang、sitemap 及同語首頁連結。不可只靠切換按鈕或改 lang 屬性。保留現有 clamp 計算、捨入和錯誤草稿失效規則，重跑原數值測試與雙語結構檢查。

4. SVG 轉 PNG：產品 https://github.com/KYStr/glossquote-labs-home/pull/99 ，規格 https://github.com/KYStr/glossquote-labs-home/pull/48 。
先解決規格「保留其他屬性」與「移除所有外部引用」的矛盾。sanitize 後仍可留下 CSS 跳脫 @import、跳脫 url()、presentation attribute 的外部 URL，這是已確認的字串層缺口，尚未宣稱實際外洩。用可驗證的解析／嚴格允許清單，或拒絕無法安全判定的語法；不能只補一條 regex，也不能放寬 CSP。測試 CSS escapes/comment/case、@import/url、href/xlink、style/presentation attributes，同時保留合法 #fragment 與正常圖形。

只修改自己的工具、相應規格／測試與專屬證據，不改其他工具、主頁或部署。所有測試不得干擾使用者桌面、輸入法、剪貼簿或觸發原生視窗；未具備可靠隔離的瀏覽器／真機項目保留 NOT_RUN。
完成後先推候選、更新原 PR，回報 task/spec/owner/claim、固定 commit/path、實際 diff、測試命令與退出碼、PASS/FAIL/NOT_RUN、剩餘阻塞。交由非作者對同一候選逐項評分，必要面向全部至少 90 且必要檢查完成才能 accepted。原作者不得自判完整驗收通過；由本地主代理回收驗證，再部署並更新雙語首頁與看板。
