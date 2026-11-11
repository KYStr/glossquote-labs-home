# 生理週期計算：獨立文件審查

**退修；不建議 ready。** 21/21 字面案例相符，成功案例的 28/28 日期列逐欄一致。退修點在結果語義及使用限制：工具天數不能當健康判斷；下載資料會留在頁面外，檔內也缺少估計及避孕限制；摘要「下一次」實為相對輸入日，不保證仍在未來。

- [規格 PR #233](https://github.com/KYStr/glossquote-labs-home/pull/233) open draft、head `3fc93c6c679974e7b0830ad45a01f2af968839a6`；任務 `labs-period-cycle-calculator-spec-20261109`、規格 `spec-period-cycle-calculator-20261109`。2026-11-11T03:08:13Z 留證。四份固定文件完整讀取並對上 [Git blob 與 SHA-256](source-identity.json)。
- 核對 [預產期規格](https://github.com/KYStr/glossquote-labs-home/blob/5f61f3140d5ef61012b49c7571a4a9df9b6e31f0/docs/specs/pregnancy-due-date-calculator/SPEC.md)（妊娠日期、孕週、孕期）、[既有日期計算](https://github.com/KYStr/glossquote-labs-date-calculator/blob/98cee2eedce5a0035ae29d448528e6011cb87fd4/README.md)（通用加減和差距）、[睡眠週期規格](https://github.com/KYStr/glossquote-labs-home/blob/7d53d6bf41a2e92ad3cdeaeff75f0b79a9dadc62/docs/specs/sleep-cycle-calculator/SPEC.md)（單夜時鐘與 90 分鐘），均不等同本規格。
- 已有 [Build PR #277](https://github.com/KYStr/glossquote-labs-home/pull/277)，head `d91f9fcde299dcc2655f9f16d8fe1e2b8c027690`；其說明所列規格 SHA `3fc93c6c3501795ceafdb56f544f5be2d4d24718` 不等於本次 #233。Registry 未查到對應的 production task；只留重疊對帳證據，不重派、不推論 Build bytes 或接受狀態。

| 八節 | 完整 | 分數 | 規格證據 |
|---|---|---:|---|
| goal | true | 93 | SPEC 9–16：行動規劃與桌面表格／報告，具體輸入與用途，估計而非醫療。 |
| scope | true | 93 | 16–26：單一平均、四列、無診斷、無同步，和三既有工具區隔。 |
| userFlow | false | 82 | 30–48：可回復的狀態及常駐聲明；缺「相對輸入日」摘要和匯出前的落盤提示。 |
| inputsOutputs | false | 81 | 52–66：整數日曆、精確欄位及結果，日期可重算；下載缺估計語義。 |
| implementation | true | 94 | 70–77、129–130：離線、零依賴 Gregorian/Worker/資源，沒有主機日期依賴。 |
| acceptance | true | 94 | 81–93、127–142：九項有方法；真 Network/Storage、Chrome/Edge、雙語及正式 SEO 另驗。 |
| tests | false | 83 | 21/21 相符、28/28 列相符；缺支援界線文案、報告估計標記及舊日期摘要案例。 |
| handoff | false | 86 | 146–152 交接說明完整；固定作者文件和 registry 的作者角色未對上，見 PERIOD-PROV-01。 |

**PERIOD-01（SPEC 57、140）：37 天被拒不能推出健康結論。** `{"lastPeriodStart":"2026-10-26","cycleLength":"37","periodLength":"5"}` 依工具上限回 `RANGE`。現 FAQ 隨即把長期超出 21–35 天與就醫建議相連，但 [FIGO 2018 原文](https://www.research.ed.ac.uk/files/75445783/Munro_et_al_2018_International_Journal_of_Gynecology_26_Obstetrics.pdf) 和 [HHS 女性健康辦公室](https://womenshealth.gov/menstrual-cycle/your-menstrual-cycle) 所述常見參考範圍為 24–38 天。保留 MVP 估算上限即可；兩語對 37 天應說明「超出本工具的估算範圍」，不可把這個產品上限等同臨床異常。就醫提示可依持續不規則、變化或使用者疑慮另述，不能單由本工具拒絕推出。固定 14 天只是一個近似：[ASRM 委員會 2026 正文](https://www.asrm.org/practice-guidance/practice-committee-documents/diagnosis-and-treatment-of-luteal-phase-deciency-a-committee-opinion/) 確認黃體期有變動；[HHS 估算工具](https://womenshealth.gov/ovulation-calculator) 將結果標示為估計，不能當避孕或醫療依據。這些來源不證成四輪預測能確認排卵。

**PERIOD-02（BRIEF 5–7；SPEC 14、36–37、64–66、87）：匯出會持久留下健康日期，檔內沒有估計限制。** 用合成 `regular-28`，下載的 561 bytes 只含 `cycles`，`cycles[0].start` 重現輸入日 2026-10-26，並含四輪推估易孕期／排卵日；未攜帶頁面警語或估計狀態。檔案是使用者主動保存，並非已觀察到外流。修正 BRIEF、頁面與驗收：明講網站不自動儲存或上傳，主動下載則會留下含敏感日期的檔案；下載前在按鈕旁揭露。匯出若保留該欄，明定版本及「估計／不可當避孕依據」的可讀與機器語義，釘字面 bytes。若不想匯出敏感推估日期，則明定刪除欄位與介面文案。

**PERIOD-03（SPEC 35–37、56、62–64、137）：「下一次」是相對輸入日。** 以 2026-11-11 為示範檢視日，輸入 2026-09-01、28 天、5 天，四列開始日期為 09-01、09-29、10-27、11-24，現摘要指「下一次」09-29，早已過去。核心不讀今天是合理的；預期用「輸入日起第 1 次推算開始日」，區分第一列輸入與其餘推算，勿稱相對今日的下次、當前或已實際發生。保留日期算法，加舊輸入摘要案例。

**PERIOD-PROV-01（協作對帳）**：固定 AUTHOR-CHECK 第 3 行自述另一位實際作者；registry revision 1537 的 spec author、提交者與 owner 都是原 cloud owner，未查到文件作者的同 ID actor。兩份可追溯證據均保留，不能由共用帳號推定代簽或更換 owner。本 reviewer 與兩者皆不同、未參與作者工作。請主統籌核對實際寫作者／提交者分工和 #277 固定規格版本，再處理正式登記。

[verify.mjs](verify.mjs) 從原始輸入逐日走公曆，不使用 JDN、系統日期或產品核心；用 100／400 年規則、逐月邊界和事件順序獨立推導，再讀 expected 深比。Node v24.14.0、`node verify.mjs fixtures.json`、exit 0；18 core（7 成功的 28 列、11 錯誤）和 3 controller。1900、2100 的 2/29 無效，2000 的 2/29 有效；2100-12-31 輸入可推到 2101 年而 2101-01-01 本身不可作輸入。[逐案例、額外反例與報告 SHA-256](verify-output.jsonl) · [命令及雜湊](execution.json)。非阻斷：21/10 的模型會讓兩個估計區間重疊，勿暗示其餘日期是安全日；移除合成檔案的樣板文字。

九項產品面向維持 **NOT_RUN**：functionality（日期與匯出、常駐聲明）、boundaries（合法與首錯）、privacy（乾淨 profile 的實際 Network/Storage/URL/log）、security（固定檔名、惰性字串、CSP、回收）、usability（桌機/手機和取消）、accessibility（實際鍵盤/焦點/320px/200%）、localization-seo（雙語、候選 noindex、正式另驗）、toolchain-provenance（固定來源、exit、重建 hash）、compatibility（隔離 Chrome/Edge/Blob）。未聲稱四 TZ 產品測試或瀏覽器通過。

另列 ready 阻斷 **REG-RUBRIC-233**（不改原規格任務的八項分數）：在遠端 registry revision 1537、blob `73e05eb696e26d943c8eb1fed2e7f5e2bdc89c50`，`spec-period-cycle-calculator-20261109`.acceptanceCriteria 實填 `goal, scope, userFlow, inputsOutputs, implementation, acceptance, tests, handoff`，和原文件任務八節一致；固定 SPEC 的 `acceptance` 則預宣告 `functionality, boundaries, privacy, security, usability, accessibility, localization-seo, toolchain-provenance, compatibility`。現行 coordination-core（Git blob `4782dd1f249995ceeec00b2d0a89b57d9b9bbb7d`，103、287 行）要求 production 完全繼承已登記 spec 的 criteria，填入正確九項時會被 RUBRIC_MISMATCH，沿用現狀又會用文件八節取代產品驗收。請先依正式權責修正 spec 登記，再以固定版本核對九項和既有 Build；目前不可計入可開工 ready。

未取得串行 slot；未 ACK、寫正式 review 或改 ready。
