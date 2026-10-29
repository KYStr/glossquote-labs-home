# W16-25-M1 實際委派

2026-10-16。create_thread成功，threadId 01a141fe-9022-7040-9359-bb4c36e0083e，host local，title 活動流程時間表。請求gpt-6.1-sol/max；backend identity未獨立確認。M0六份文件經主代理退回矛盾修正後讀閱，18檔/5相對連結通過。M1授權。

任務 W16-25-M1：實作「活動流程時間表」。此對話為原功能對話，後續同功能修正與M2公開來源皆由你接手。create_thread指定gpt-6.1-sol/max；backend identity不能靠自述確認。禁止再委派或另開對話。

根專案 C:/Users/<LOCAL_USER>/Documents/Codex/GlossQuote-Labs；只擁有 tool-projects/25-event-timeline/，證據可寫根 .runs/event-timeline/ 下唯一task目錄。先讀18份工具文件與根安全契約；六規格由主代理實際讀閱、退回修正，18檔結構/連結檢查已通過。產品仍SPEC_ONLY。不要動兄弟、根既有變更、共用首頁、舊外部驗收包。

使用者工作：主持活動/課程/會議，改活動時長或順序後，一次重算所有起訖時刻與目標結束差。嚴格ASCII HH:MM，1–60列，每段1–720整分鐘，全程≤1440；休息就是普通列。不處理日期/時區/DST/提醒/列印/儲存。跨午夜明寫次日，目標需明確next-day。空target搭true failclosed，UI清空target時清false。09:00 +10/35/10 =>09:55，共55，目標10:00早5；23:40+30/20=>次日00:30。C64英文報告是獨立英文names fixture，不翻譯使用者輸入；row schema/type錯誤ID尚未驗故rowId=null。

只放行 M1 T00–T05：完整兩語靜態工作表、up/down可鍵盤排序、純函式/固定測試、報告/剪貼簿/TXT、即時失效、clear/語言confirm、pagehide清空與loopback工具鏈。allowed本工具package.json/.gitignore/public/**/scripts/*.mjs/test/**/dist/**，必要輔助可建；狀態可更新HANDOFF、TASK-ENTRY append-only、project.json、START-HERE、docs/RELEASE-CANDIDATE（此為主代理明確補充TASKS狀態檔範圍）。不可改PRODUCT/TECHNICAL/ACCEPTANCE門檻或先建production/推GitHub/部署。Node24 ESM/built-ins零依賴，不npm install；dev127.0.0.1:4205，兩頁/index.html與/en/index.html；官方node/npm路徑 C:/Program Files/nodejs。

clipboard同一當前結果single-flight；編輯/清除/離頁遞增token並清pending，新結果可以請求B；舊A的resolve/reject/finally比對revision/requestId/pageGeneration不符即完全no-op，不能清B busy/改訊息/焦點。已開始原生write不可撤回，不宣稱取消。每筆download URL延後60s清除、最多8筆，滿8暫停，pagehide立即全revoke，不能重複下載或newresult提早撤銷舊下載。

必要gate全部C01–C66、npm test/check/build，兩語真實B01–11/B13/B15/B24/B27；B20/B22/B23用受控離線app harness驗真實程式競態、URLtimer、生命週期，不能冒充真BFCache/原生API。現有CUA實際操作瀏覽器與320px；原生clipboard/下載檔案/200%/真機/完整NetworkStorage無能力可逐項NOT_RUN，不能用mock標原生通過。最終候選穩定後必要commands各一次，修正才重跑受影響gate。

前後執行 $env:USERPROFILE/.codex/check-persistent-environment.ps1、比對完整PATH與Environment fingerprints。禁止persistent PATH/Env/registry/Git/gh auth更動、gh auth setup-git/login/refresh、讀帳戶憑證或authdebug。不停止其他服務，不kill byname/port。需新依賴/權限/費用、未知漂移、路徑衝突、規格oracle矛盾或同錯兩輪無新證據停止相關步驟回主代理，不降gate。

完成M1凍結並final交回真實修改檔案、命令/exit/測試數、browser輸入觀察、固定manifest bytes/SHA、preview URL/session、guards、NOT_RUN/風險/需主代理決定事項。主代理獨立驗收後才放行M2由你做production候選+public KYStr/glossquote-labs-event-timeline+固定commit ZIP；M3 agenda.glossquote.com部署與首頁由主代理。不越級，不要求使用者轉貼。

工具結果：
```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"threadId\":\"01a141fe-9022-7040-9359-bb4c36e0083e\",\"hostId\":\"local\"}"
    }
  ],
  "isError": false
}
```

