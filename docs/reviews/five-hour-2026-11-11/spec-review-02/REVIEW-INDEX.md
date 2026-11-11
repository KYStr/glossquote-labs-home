# FH-spec-review-02｜獨立規格審查索引

五份固定候選均完成本地文件審查，**全部建議 revision，0 份建議 ready**。101 筆字面測例獨立重算：核心 86/86，狀態 14/15，合計 100/101。唯一不符是 VO₂max 的 `state-replace-late`：文檔每次 edit/run 遞增，重建為序號 4，作者 literal 為 3。這與產品瀏覽器結果無關。

|候選|PR|核心／狀態|主要退修理由|
|---|---|---|---|
|[步數換算](steps-converter/REVIEW.md)|[#234](https://github.com/KYStr/glossquote-labs-home/pull/234)|19/19＋3/3|步長係數溯源、單一步長語義、未捨入值與熱量假設|
|[酒精濃度估算](bac-calculator/REVIEW.md)|[#235](https://github.com/KYStr/glossquote-labs-home/pull/235)|13/13＋3/3|避免個人駕駛倒數、實際法條與罰額分級、嚴格門檻、逐列 schema|
|[最大攝氧量估算](vo2max-calculator/REVIEW.md)|[#236](https://github.com/KYStr/glossquote-labs-home/pull/236)|24/24＋2/3|Cooper 邊界、來源和常模、狀態序號、資料持久化、驗收與交接|
|[兒童身高預測](child-height-predictor/REVIEW.md)|[#238](https://github.com/KYStr/glossquote-labs-home/pull/238)|14/14＋3/3|輸入親生父母語義與孩子性別、歷史區間的適用性及脫離網頁的報告|
|[理想體重計算](ideal-weight-calculator/REVIEW.md)|[#239](https://github.com/KYStr/glossquote-labs-home/pull/239)|16/16＋3/3|WHO 邊界、Robinson 原式與 Miller 版本、低身高外推及報告用途|

共通阻擋 `S02-REGISTRY-01`：五筆 `spec.acceptanceCriteria` 都錯用作者文件任務的八節。production 必須原樣繼承該欄，因而無法對正文的九產品面向作正式驗收。八節文件分數保留，主統籌依現行契約協調同 spec ID 的修訂，原 owner／claim 不動。

GitHub 登記讀回 r1549／blob `b07a9a780548674aa958703a83ec93190d82a76c`（台北 11:11）；五個 PR open draft、候選與原 owner/claim 相符。每個 PR 只含指定規格四檔，本地 20 個固定候選檔與 GitHub blob 相同；派工簡報和來源表也核對固定 Git blob。查重以最新登記、source index、catalog、固定相近規格及已開 PR 名稱搜尋的可見範圍為限。詳細讀回、命令與驗算結果見 [summary.json](summary.json)；完整性見 [SHA256-MANIFEST.json](SHA256-MANIFEST.json)。腳本最終重跑結果與保存檔逐 byte 一致，Windows 持久環境檢查前後一致。

本人為 `local-codex:01a1c87c-ef54-7bd0-a50d-0fc69b43bed3`，與作者不同、未參與候選製作。產品九面向、原生與瀏覽器測試、部署及正式 registry 審查均為 NOT_RUN。由實際 reviewer 等主統籌安排串行時段後，以固定審查證據登記退修。五份目前都不可列入 ready。

## 離線重現

從本目錄使用 Node.js 24 執行各工具的審查腳本。每個 `fixed-fixtures.json` 都是對應原候選 commit 的 fixture 位元組副本。腳本預設讀取同目錄的副本，並核對固定 Git blob。若使用自行取得的原始檔，可把 `fixtures.json` 路徑附在腳本名稱後方。

```sh
node steps-converter/verify.mjs
node bac-calculator/verify.mjs
node vo2max-calculator/verify.mjs
node child-height-predictor/verify.mjs
node ideal-weight-calculator/verify.mjs
```

VO₂max 會以 exit 1 重現已記錄的狀態案例差異，其餘四份預期 exit 0。可將標準輸出與各目錄的 `fixtures-output.json` 比對。五份都使用同一個 `review-lib.mjs`，不需要安裝套件。
