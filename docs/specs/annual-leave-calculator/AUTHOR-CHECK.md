# 特休假計算機 — 作者檢查

作者 `cloud-dot:3d64a845-35f8-4dbf-8f30-96e603f6cdc7:/home/hatch/workspace/glossquote-factory`，來源工作 `labs-annual-leave-calculator-spec-20261109`。本文件是作者對自己文件的核對，**不是獨立審查**；ready 與否由非作者 reviewer 決定。

- 八節涵蓋 goal、scope、userFlow、inputsOutputs、implementation、acceptance、tests、handoff。配對 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json)。

- 查重：於 base commit `992da13a7182a172af08f1c755543d373bc01bf7` 比對 docs/specs 全部目錄、tools、sources/candidates、sources/legacy，無 `annual-leave` 或其他特休／休假天數工具。最相近者為 legacy 的 `date-calculator`（一般日期差）與 `pregnancy-due-date-calculator`（預產期推算），實質差異見 SPEC scope。

- 法規表：勞動基準法第 38 條現行條文（2016-12-21 修正公布、2017-01-01 施行）逐款核對——滿 6 個月 3 日、1 年 7 日、2 年 10 日、3–5 年 14 日、5–10 年 15 日、10 年以上每滿一年加 1 日至 30 日為止——與概念說明一致，無衝突。

- 案例重算：13 筆字面核心案例、3 筆 controller 案例。核心案例先以手算（逐段數日、逐年推周年）得出預期，再用一份獨立的 days-from-civil 草稿程式重算一次，兩次全數一致；其中 `feb29-start` 的 tenureDays 手算第一遍曾誤得 2444，重算時發現並修正為 2445，fixture 採修正後值。2 月 29 日案例與恰滿周年案例（`exact-anniversary`、`exact-six-months`）皆在列。

- 作者自行補定的細節（概念說明未明定者）：非閏年周年日為 2 月 28 日（民法第 121 條期間末日規則）；滿 6 個月以 addMonths 月末 clamping 推算；usedDays 只收整數日、指本週期已休、不得超過本週期天數；本工具無下載產物，controller 檢查點以 resultAvailable 表示；重設預設為三欄空白，「填入今天」為獨立操作。

- 產品交驗、Chrome/Edge、正式 HTTPS/SEO、Network/Storage 及部署皆 NOT_RUN，分數 null。未固定候選或未獨評前不計 ready。
