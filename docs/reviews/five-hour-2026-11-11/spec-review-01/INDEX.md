# FH-spec-review-01 交接索引

**完成五份固定規格的本地獨立審查：105/105 字面案例重算一致，0/5 建議 ready。** 文件內有可重現退修點；另外五份的遠端製作驗收面向都誤登為文件八節。產品、瀏覽器與部署驗收均未執行。

| 固定規格 | 字面案例 | 退修證據 |
|---|---:|---|
| [壁紙用量計算](wallpaper-calculator/REVIEW.md) · [PR #226](https://github.com/KYStr/glossquote-labs-home/pull/226) | 17/17 | WALL-01 部分高度窗戶導致捲數物理上不敷；WALL-02 接受超過牆高的開口。 |
| [坪數換算](ping-area-converter/REVIEW.md) · [PR #227](https://github.com/KYStr/glossquote-labs-home/pull/227) | 27/27（含百列） | PING-01 30 坪在輸出精度分不出係數；第 100 列可替代。 |
| [服飾尺寸換算](clothing-size-converter/REVIEW.md) · [PR #228](https://github.com/KYStr/glossquote-labs-home/pull/228) | 21/21 | CLOTH-01 女裝 US 0 規則衝突；CLOTH-02 泛稱 EU 實為德國欄；CLOTH-03 固定值與聲稱來源有落差。 |
| [體感溫度計算](feels-like-temperature/REVIEW.md) · [PR #229](https://github.com/KYStr/glossquote-labs-home/pull/229) | 19/19 | TEMP-01 公式外推與官方定義域標示；TEMP-02 鄰近角落的負差值反例。 |
| [生理週期計算](period-cycle-calculator/REVIEW.md) · [PR #233](https://github.com/KYStr/glossquote-labs-home/pull/233) | 21/21（28 日期列） | PERIOD-01 工具天數不等於臨床判斷；PERIOD-02 匯出健康日期與估計聲明；PERIOD-03 「下一次」相對輸入日。另有作者角色對帳 PERIOD-PROV-01。 |

[製作面向對照](production-rubric.json) 的 `REG-RUBRIC-226/227/228/229/233` 各自獨立於原 spec task 八節評分。登記的 `spec.acceptanceCriteria` 目前等同原文件八項；coordination-core 要求 production 原樣繼承，因此正確九項會觸發 `RUBRIC_MISMATCH`。在正式權責下修復後再檢查既有 Build 與固定版本；不將這些項目計入可開工 ready。

交接讀回 2026-11-11T03:09:01Z，registry revision 1545、blob `7c06878996ff47b39783e472127ce173b2241a64`（2888009 bytes，Git blob 雜湊吻合）。五個 PR 仍 open draft；head、登記 SPEC commit、submission commit 相同，原 owner/claim 不變。spec draft、作者任務 reviewing；沒有匹配的已登記 production task。既有 Build PR #270/#274/#273/#271/#277 都保留。#273/#271/#277 的 PR 描述列出與本輪規格不同的完整 SHA，供主統籌對帳；這項觀察不等同兩邊的程式或 fixtures bytes 一定不同。

每份報告附八節布林／分數、產品九項 NOT_RUN、完整 literal／獨立推導／比對、命令與 exit、來源／反例及 SHA-256。以 Node v24.14.0 跑五份純資料驗算，均 exit 0；共享 [驗算函式](recheck-lib.mjs) 需與各資料夾一併保留。工具只讀固定 fixtures、以輸入先推導、再比對 expected；無產品程式、GUI、原生對話或長建置。完整 [交接核對](handoff-verification.json) 與 [證據檔案雜湊](SHA256SUMS.txt)。

公開副本以審查組識別呈現 reviewer，重現命令統一使用相對路徑。原始報告保存在本地，這份副本保留固定候選、登記 owner、評分、字面輸入與輸出。每份規格的狀態以交接讀回時間為準。

在任一規格子目錄執行 `node verify.mjs fixtures.json` 即可離線重算。子目錄內的 `fixtures.json` 是固定候選檔案的逐位元組副本，共用程式在本索引同層。Node 24 可直接執行。各規格的 `execution.json` 列有原始 GitHub 路徑、SHA-256 和當次 exit code。
