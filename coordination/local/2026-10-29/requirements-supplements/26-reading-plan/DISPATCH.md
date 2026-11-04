# W16-26-M1 實際委派

2026-10-16。create_thread成功，threadId 01a141fc-daf1-7980-aa82-93eb337a17b8，host local，title 閱讀進度規劃。請求gpt-6.1-sol/max；backend identity未獨立確認。M0六份文件主審後通過，18檔結構檢查通過。主代理親自收斂C49 infeasible summary與剪貼簿鎖規格，無產品程式代作。M1授權。

任務 W16-26-M1：實作「閱讀進度規劃」。此對話為原功能對話，後續同功能修正與M2公開來源皆由你接手。create_thread明確請求gpt-6.1-sol/max；backend identity不可用自述確認。禁止再委派或另開對話。

根專案 C:/Users/<LOCAL_USER>/Documents/Codex/GlossQuote-Labs；只擁有 tool-projects/26-reading-plan/。證據可寫根 .runs/reading-plan/ 下唯一task目錄，禁止改兄弟/根既有變更/共用首頁/舊外部驗收包。先讀本工具18份完整文件及根安全契約，尤其PRODUCT/TECHNICAL/ACCEPTANCE/TASKS與docs。M0已由主代理閱讀、修正矛盾並核對文件結構；目前尚無產品。

使用者工作：一本書的剩餘頁數按自己可讀星期與截止日分配；落後後更新已讀頁與開始日重排。單書、無儲存/追蹤/通知/日曆整合。total1..10000、completed0..total、嚴格1900–2100 civil YYYY-MM-DD、inclusive≤366天、unique ISO weekdays1..7。R/D均分、餘數給前幾日；R<D保留零頁flex/null頁碼；R0成功無排程但仍驗輸入；R>0D0拒絕。cap不足是infeasible容量摘要、沒有schedule/report/copy/download，不能當成功。P5 100/40、2026-10-19..23周一至五 =>每天12頁，41–52至89–100；cap10 =>容量50/缺10/至少6個可讀日。

M1 only，T00–T07本機完整MVP。允許本工具package.json/.gitignore/public/**/scripts/*.mjs/test/**/dist/**與HANDOFF、TASK-ENTRY append-only、project.json、START-HERE、docs/RELEASE-CANDIDATE狀態。scripts輔助檔可建立，根據規格做必要focused測試；不可改PRODUCT/TECHNICAL/ACCEPTANCE門檻或提前push/deploy。Node24 ESM built-ins、零外部依賴，dev127.0.0.1:4206；官方node/npm C:/Program Files/nodejs。雙語URL /index.html、/en/index.html，語言切換清草稿且明示。

主代理最後釐清（已寫文件）：C49 infeasible有容量summary但無title/schedule；plan帶trim後title供報告。clipboard同一當前結果single-flight；編輯/清除/離頁遞增revision/requestId/pageGeneration並清busy，新結果可新請求；舊A的resolve/reject/finally全部no-op，不能影響新B忙碌/訊息/焦點，不宣稱撤銷原生已開始寫入。date文字切回原生之前先驗，不能默默抹掉無效raw。

必要驗收：全部核心C01–49、真正npm test/check/build、兩語主要plan/infeasible/zero/stale/clear/date fallback/keyboard/320px流程與metadata；使用可用CUA實際操作瀏覽器。UI callback/Blob/pagehide/URL timer可用離線app harness驗真實程式邏輯，不能把stub當原生clipboard/下載/BFCache，也不強迫不支援的browser注入；原生/200%/真機/完整NetworkStorage能力不足可逐項NOT_RUN，必要邏輯與核心不可略過。最終穩定版必要commands各一次，修正後只重跑受影響gate。

工作前後執行 $env:USERPROFILE/.codex/check-persistent-environment.ps1，比對全部HKCU/HKLM PATH與Environment fingerprints；禁止persistent PATH/Env/registry/Git/gh auth改動，禁止gh auth setup-git/login/refresh、讀帳戶憑證或authdebug。保留其他程序，不kill by name/port。缺權限/依賴/費用、未知漂移、規格矛盾或同錯兩輪無新證據即停相關工作報主代理。

完成M1凍結：回報真實修改檔案與內容、命令/exit/測試數、browser案例與限制、固定manifest bytes/SHA、preview URL/session、guards、NOT_RUN/風險/需決定事項。由主代理獨立閱讀與重驗後才放行M2，M2仍由你做正式候選+public KYStr/glossquote-labs-reading-plan+固定commit ZIP；M3 hosting reading.glossquote.com與首頁由主代理。不要自行越級，不要求使用者轉貼。

工具結果：
```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"threadId\":\"01a141fc-daf1-7980-aa82-93eb337a17b8\",\"hostId\":\"local\"}"
    }
  ],
  "isError": false
}
```

