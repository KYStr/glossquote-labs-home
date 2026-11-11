# 隨機分組產生器規格獨立審查

**文件審查 FAIL · 整體 暫不可放行**

審查人 `local-codex:01a1c87c-f8d5-7e92-8aed-25f805df2a6a`，核對到候選作者、owner 和 contributors 均與本人不同。原 task `labs-group-generator-spec-20261109`，spec `spec-group-generator-20261109`，候選 `93c1a8a8b12930270b611850a6b85007da4f5c4d`。登記冊 r1530，讀取時間 2026-11-11 03:03:13 UTC。PR 與 4 份候選檔案逐一核對，詳見[遠端讀回](../remote-readback.json)。 [固定 PR #256](https://github.com/KYStr/glossquote-labs-home/pull/256)

## 八節

| 必要面向 | 分數 | 結果 | 證據 |
| --- | ---: | --- | --- |
| goal | 95 | PASS | 老師桌面貼班級名單、主辦人手機貼報名名單都有可觀察結果，組數、人數與種子可驗。重現條件與同名可辨識仍須修正。 |
| scope | 78 | FAIL | 規格自述 legacy 差異，但種子重現、每組上限與匯出是既有名單分組工作的擴充，未有既有 owner 的範圍處理證據。見 GRP-01。 |
| userFlow | 82 | FAIL | 貼名單、停用欄、種子生成、重設、取消及丟棄舊回傳都有路徑。固定說明忽略組別設定的重現條件，且每組人數標籤會被理解為固定人數。見 GRP-03。 |
| inputsOutputs | 84 | FAIL | 首錯、列號、uint32、洗牌與輪流分配確定。結果只保留名字，使同名落不同組時無法回查原人。見 GRP-02。 |
| implementation | 97 | PASS | 無依賴，原生靜態頁，`getRandomValues` 只給 app 填空種子，BigInt 驗算吻合固定 lottery 位元規則；可驗 Worker 資源與取消。 |
| acceptance | 96 | PASS | 功能、界線、隱私、資安、易用、可及、雙語 SEO、工具鏈、相容性九面向都有同 head 的必要證據。 |
| tests | 96 | PASS | 17 core／3 controller 全數相符。另重算種子 42 的八個分子、雙語 TXT 與 JSON 匯出預期字節。 |
| handoff | 97 | PASS | 四文件固定、兩階段里程碑、既有權限與原 task 讀回路徑可追溯。 |

## 字面案例

Node v24.14.0，exit 0，20/20 個相符。程式只從固定 fixture 讀輸入，算出結果後才比對作者 expected。 [驗算腳本](verify.mjs) · [逐筆輸入、獨立預期與實際比對](fixture-results.json)

使用 BigInt 低 32 位遮罩獨立算 mulberry32，種子 42 第一抽分子 2581720956。全數字面案例吻合。附合成三人名單的 JSON、繁中與英文 TXT 完整字節預期與 SHA-256。

## 阻擋放行

### GRP-01 和已有原 owner 的名單隨機分組工作重疊

定位 SPEC.md §scope、AUTHOR-CHECK.md 查重；登記 `labs-17-random-groups`／`spec-17-random-groups`。

重現輸入

```json
{
  "names": "A\nB\nC\nD\nE",
  "mode": "count",
  "groupCount": "2",
  "groupSize": "",
  "seed": "42"
}
```

觀察結果。 兩工具都讓老師／主辦人貼一人一列、指定組數、產出人數差最多一人的名單。新規格增加種子重現、每組上限及匯出，可作同一工作的增補。既有 task 由 local-codex:01a13361-86f1-7e13-a1ef-573ec200bc4f 承接，固定實作 a8711a7cb8dc477dfee18c5667935c5be44602e1。

修正驗收。 由主統籌確認增補既有工具或足以分立的使用目的，保留現有 owner、歷史來源與不可重現的分組路徑。確認前不開同名工作、不把文件算作新 production ready。

### GRP-02 同名雖分在不同組，畫面與匯出無法識別是哪個人

定位 SPEC.md §goal 的每人可核對、§userFlow 群組清單、§inputsOutputs 的 members 與 TXT、fixtures.json `duplicates-kept`。

重現輸入

```json
{
  "names": " 小明 \n\n小華\n小明\n　\n小美",
  "mode": "count",
  "groupCount": "2",
  "groupSize": "",
  "seed": "42"
}
```

觀察結果。 種子 42 使來源第 4 列小明進第 1 組、第 1 列小明進第 2 組。兩組輸出均只有「小明」，JSON 與 TXT 無法分辨。已存在的舊工具有成員序號。

修正驗收。 固定同名可辨識路徑，例如用來源列／穩定輸入序號在畫面與帶走的產物對照。補同名跨組 fixture，驗每一原成員恰好一次且可識別。

### GRP-03 重現文案缺分組設定，每組人數實際為上限

定位 SPEC.md §goal、§userFlow 的種子／結果文案及 §tests FAQ；BRIEF.md。

重現輸入

```json
{
  "names": "A\nB\nC\nD\nE",
  "mode": "count",
  "groupCount": "2",
  "groupSize": "",
  "seed": "42"
}
```

觀察結果。 種子 42 洗出 D、C、E、B、A。K=2 是 D/E/A、C/B，K=3 是 D/B、C/A、E，名單與種子相同卻有不同分組。另以 11 人、groupSize=5，按規則得到 4/4/3，畫面「每組人數 5」不足以解釋。

修正驗收。 兩語把重現條件釘為同順序名單、同分組模式和數值、同種子，並使用「每組最多人數」及平均分配說明。用兩個輸入檢查畫面與 FAQ。

## 非必要改善

- 若保留「40 字」錯誤文案，可明示 UTF-16 上限對某些字和 emoji 會以兩個單位計。

## Production 繼承契約

**REG-01 · FAIL，阻擋 ready。** 登記冊 r1530 的 `spec.acceptanceCriteria` 是原規格製作 task 的八節。前表的文件評分維持獨立。

- 原規格製作 task 的面向。 `goal`、`scope`、`userFlow`、`inputsOutputs`、`implementation`、`acceptance`、`tests`、`handoff`。
- 已登記 spec 的面向。 `goal`、`scope`、`userFlow`、`inputsOutputs`、`implementation`、`acceptance`、`tests`、`handoff`。
- 應繼承的產品面向。 `functionality`、`boundaries`、`privacy`、`security`、`usability`、`accessibility`、`localization-seo`、`toolchain-provenance`、`compatibility`。

由主統籌依維護流程更正登記，保留原規格 task、候選和 owner；讀回相符九面向後才重評 ready/可開工。

## 九項產品檢查

以下是規格已列的未來驗證路徑。產品檢查均為 NOT_RUN，分數均為 null。

| 面向 ID | 文件中的驗證路徑 | 結果 |
| --- | --- | --- |
| functionality | 按組數或上限分組、同設定重現、空種子注入、UI 與 JSON/TXT 一致。 | NOT_RUN |
| boundaries | 500/501 筆、N/K/S、名稱 40/41 單位、種子 0/4294967295、來源列與首錯。 | NOT_RUN |
| privacy | 合成名單，核對使用／重設期間 Network、Storage、URL、console。 | NOT_RUN |
| security | 敵意名字 inert、固定下載名、CSP、Worker/Blob dispose、純核心無外部熵。 | NOT_RUN |
| usability | 教師貼名單到結果、兩語桌面行動、選擇模式、取消與下載。 | NOT_RUN |
| accessibility | 鍵盤、焦點、標籤與錯誤、狀態、320px、zoom、觸控及對比。 | NOT_RUN |
| localization-seo | 固定語言路徑、種子和分組說明對譯、同語首頁、noindex 與正式 SEO。 | NOT_RUN |
| toolchain-provenance | Node 24、固定 commit/PR、離線重建、PRNG 錨點、artifact hash。 | NOT_RUN |
| compatibility | 隔離 Chrome/Edge 兩語操作、Worker 與 Blob，分組與 bytes 可重現。 | NOT_RUN |

## 來源

- 舊作已完成貼名單到平衡分組的同一工作，並保留同名來源序號。 [固定既有名單分組規格 FR-02 至 FR-07](https://github.com/KYStr/glossquote-labs-home/blob/be197ea30d909b1353e7f77bdf16b1811ac41f71/coordination/local/2026-10-29/specs/17-random-groups/SPEC.md)
- 登記冊原有來源版本。 [既有名單分組固定實作](https://github.com/KYStr/glossquote-labs-random-groups/tree/a8711a7cb8dc477dfee18c5667935c5be44602e1)
- 驗 mulberry32 位元常數、種子文法與前向抽取。 [同 commit 的 lottery 核心](https://github.com/KYStr/glossquote-labs-home/blob/93c1a8a8b12930270b611850a6b85007da4f5c4d/tools/lottery-number-picker/public/js/core/lottery.mjs)
- §4 的種子 42 錨點與 BigInt 結果相符。 [同 commit 的 placeholder PRNG](https://github.com/KYStr/glossquote-labs-home/blob/93c1a8a8b12930270b611850a6b85007da4f5c4d/docs/specs/placeholder-text-generator/SPEC.md)
- 瀏覽器原生 getRandomValues 可填整數 typed array。 [W3C Web Cryptography §10.1.1](https://www.w3.org/TR/webcrypto/#Crypto-method-getRandomValues)

GitHub 正式審查登記維持 NOT_RUN。 [重現命令與固定來源](../REPRODUCE.md)
