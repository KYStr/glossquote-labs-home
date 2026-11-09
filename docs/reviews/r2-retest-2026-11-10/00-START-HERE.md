# 外部 r2 複驗已接收：限定缺陷結案

這次沒有新增確認的產品缺陷，沒有修改產品或重新部署。[190 款總表](STATUS.csv)、[機器可讀總表](STATUS.json)、[外部結論與限制](EXTERNAL-RESULTS.json)、[主代理核對](PRIMARY-CHECKS.json)。

| 項目 | 外部覆核結果 | 結案範圍 |
| --- | --- | --- |
| 朗讀 Unicode 分句 FUNC-M2-01 | 通過並再次確認 | 分句與預覽；真實語音未測 |
| 流動字級 FUNC-M2-02 | 通過並再次確認 | 語言切換保留草稿與錯誤狀態 |
| 百分比 FUNC-R3-01 | 較晚上線版本的限定複驗通過 | 非同步成功／失敗與選定過期工作情境 |
| 加班費 FUNC-R3-02／03 | 較晚上線版本的限定複驗通過 | 逐日級距與選定邊界、getter 零次讀取；非完整薪資法律驗收 |

**兩個 r2 並非同一包。** 外部主要輸入是 glossquote-retest-fixes-2026-11-09-r2.zip（75ac894e…），候選 e9eb54813a55bd9f0a04b703ecbccee8c2510f4d；其中百分比與加班費仍是歷史舊版，5 FAIL／3 根因保留。外部另擷取較晚正式 HTTPS 的修正檔案，對照 069bd37af1a6100f366afaebe5afb26aa953c5a3 來源，15 個針對性案例及 5 個 GUI 案例通過。主代理核對 7 份後期 HTTP 檔案與凍結發布 bytes 一致，兩份固定 Git 依賴與已審來源一致。

外部回報沒有完整驗過最新 glossquote-remaining-audit-fixes-2026-11-10-r2.zip（d94d62dc…），也沒有擷取百分比完整 live 依賴樹；不得把有限範圍的晚版修正通過改稱整個新交付包／整款工具全通過。

外部計數分開保留：原有工具測試 50、發布測試 11、6 個命令、r2 新案例 16；後期另 15 案例；GUI 共 22＝21 PASS＋1 真實聲音因環境無本機音色而 NOT_RUN。HTTP 48＋7＝55，含多個回應類型，不能稱全部200，也不與其他測試混算通過率。這些是外部提供者的執行結果，本輪主代理做證據核對，沒有宣稱親自重跑。

SEO-01 分享預覽圖、SEO-03 media 額外307仍開放。真實語音、全量 Network／Storage、真機／Safari／讀屏、跨站iframe、完整47正式站／140工具功能、Lighthouse／實際索引仍待驗。47個歷史正式站、140個檢查站、3個保留／受阻項目維持；本輪新增部署0、更新部署0，未切換 noindex。

原報告在16:30 UTC觀察PR275仍draft，這是當時正確紀錄；目前PR275／278均已合併，R3維護登記r1508 accepted。這個後續狀態由本主代理另查GitHub，不改寫原外部報告。[固定修正來源](https://github.com/KYStr/glossquote-labs-home/pull/275)、[先前完整修正證據](https://github.com/KYStr/glossquote-labs-home/pull/278)。

本包 external-input 保留外部原ZIP；evidence 保存核對與限定證據，不重複複製未變產品。固定來源仍在共用GitHub；歷史交付包與hash保留。解壓後 `python verify-package.py` 核對全包，從未操作使用者桌面／IME／clipboard。GitHub登記與ZIP最終驗證回執另附於此輪PR，避免封包hash自我引用。
