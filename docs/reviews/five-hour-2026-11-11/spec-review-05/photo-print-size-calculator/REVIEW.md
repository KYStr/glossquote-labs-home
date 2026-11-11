# 照片沖印尺寸計算規格獨立審查

**文件審查 FAIL · 整體 暫不可放行**

審查人 `local-codex:01a1c87c-f8d5-7e92-8aed-25f805df2a6a`，核對到候選作者、owner 和 contributors 均與本人不同。原 task `labs-photo-print-size-calculator-spec-20261109`，spec `spec-photo-print-size-calculator-20261109`，候選 `58edaa0d845256b1eb4cb772d8f7d7d80811e4d8`。登記冊 r1530，讀取時間 2026-11-11 03:00:07 UTC。PR 與 4 份候選檔案逐一核對，詳見[遠端讀回](../remote-readback.json)。 [固定 PR #255](https://github.com/KYStr/glossquote-labs-home/pull/255)

## 八節

| 必要面向 | 分數 | 結果 | 證據 |
| --- | ---: | --- | --- |
| goal | 97 | PASS | 桌面挑旅遊照、手機在沖印店拿像素值核對尺寸。成功產物是可核對的逐尺寸表或需求像素。 |
| scope | 78 | FAIL | 三模式與相機檔案、裁切、插值排除清楚，但只查 `docs/specs/` 便宣稱無同功能。既有 `labs-31-print-size` 同樣完成指定尺寸的解析度與像素門檻判定。見 PHOTO-01。 |
| userFlow | 82 | FAIL | 三模式可見輸入、範例、編輯失效、取消與 reset 都有交代。兩語 FAQ 卻把兩邊獨立密度當成完整照片按比例鋪滿，並將 PPI 標成印表 DPI。見 PHOTO-02。 |
| inputsOutputs | 85 | FAIL | 合法域、停用欄容量、固定尺寸、精確 ceil／half-up、fit 不使用顯示值都能重算。輸出有效密度在比例不同時的實體含義待澄清。 |
| implementation | 95 | PASS | 定標有理數、固定 9 列、純核心／Worker 世代、原生雙語靜態與零依賴可行。 |
| acceptance | 96 | PASS | 三模式真輸入、逐列資料、端點、CSP、隱私、真瀏覽器與 SEO 都有可驗方法和門檻。 |
| tests | 87 | FAIL | 25 筆 core 與 3 筆 controller 全數相符，但 AUTHOR-CHECK 誤稱 200 品質帶找不到捨入前後分類不同的案例。見 PHOTO-03。 |
| handoff | 97 | PASS | 四份固定規格檔、GitHub task/PR、Node 命令、里程碑與接續條件都有紀錄。 |

## 字面案例

Node v24.14.0，exit 0，28/28 個相符。程式只從固定 fixture 讀輸入，算出結果後才比對作者 expected。 [驗算腳本](verify.mjs) · [逐筆輸入、獨立預期與實際比對](fixture-results.json)

以 0.1 mm 的整數表示紙邊，交叉相乘取較小的密度，獨立核對九列、精確需求進位、尺寸選擇、全部錯誤及控制器。A4 300 目標需求為 3508×2481，`check-band-rounded-300` 為 299.9946… → 300.0。

## 阻擋放行

### PHOTO-01 核心任務和已有原 owner 的圖片列印尺寸試算重疊

定位 SPEC.md §scope、AUTHOR-CHECK.md 去重；r1530 `labs-31-print-size` 與 `spec-31-print-size`。

重現輸入

```json
{
  "image": "1800×1200 px",
  "legacyPrintWidthMm": "152.40",
  "newStandardSize": "4x6",
  "targetDensity": "300"
}
```

觀察結果。 既有工具用 152.40 mm 的寬度算出 101.60 mm 等比例高度、300 PPI、需要 1800×1200 px、達標。新案的 4×6 三模式覆蓋同一沖印決策。它新增九尺寸比較和預設尺寸逆推，也限制尺寸輸入，作者比對未納入既有工具。r1530 既有 task 由 local-codex:01a14c6b-81df-7592-9372-9dfaa5daafe9 承接，固定來源 647b254ce566a519d31fa6c4261d8024009f66de。

修正驗收。 把兩份固定流程的共同工作、已存在功能及新增能力寫入範圍。主統籌先和既有責任人決定增補既有工具或足以獨立的範圍，保留原 owner 和固定來源，再重新核對 ready。

### PHOTO-02 長寬比不同時，計算的是逐邊像素密度而非全幅不裁切的實際印刷 DPI

定位 SPEC.md §userFlow 的密度／符合標示、§inputsOutputs 逐邊公式與 §tests 兩語 FAQ/SEO。

重現輸入

```json
{
  "mode": "check",
  "pixelsW": "6000",
  "pixelsH": "4000",
  "dpi": "",
  "sizeId": "A4"
}
```

觀察結果。 輸入照片是 3:2，A4 為 297×210 mm。依規格算 513.1、483.8 和取小 483.8。全幅等比例按長邊 297 mm 印時，照片短邊是 198 mm，有 12 mm 餘量。兩邊都鋪滿且不裁切會改變比例。現行 FAQ 說假設全幅不裁切，結果則標為「實際 DPI」。

修正驗收。 保留同一算式也可修正：兩語說明逐邊像素密度的定義和 `fits` 只表示像素門檻。比例不同要由店家處理裁切或留白。使用 PPI 或清楚註明店家口語 DPI 指圖片 PPI，區別印表機的墨點 DPI。以此案例核對 UI、FAQ 和 JSON 語義。

### PHOTO-03 200 品質帶有可區分前後捨入的整數像素案例

定位 AUTHOR-CHECK.md 的 200 帶界；SPEC.md §tests 與 fixtures.json。

重現輸入

```json
{
  "mode": "check",
  "pixelsW": "2338",
  "pixelsH": "1800",
  "dpi": "",
  "sizeId": "A4"
}
```

觀察結果。 A4 長邊 2338×25.4÷297 = 199.950168…，短邊約 217.7。按規格取小後捨入 200.0，quality=good；若按未捨入值為 acceptable。A3 長邊 3307 px 同樣是反例。

修正驗收。 更正「不存在」的作者查核並加入能區分兩種實作的 200 品質帶 fixture。字面 expected 為 effectiveDpi 200、quality good。重跑獨立逐值比對。

## 非必要改善

- §implementation 的 File.arrayBuffer 晚到處理在目前不讀照片檔的範圍無使用路徑。
- 可把 201 px ÷ 200 = 1.005 in → 1.01 in 的恰半反例加進 tests；現有 28 筆資料未驗這一點。

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
| functionality | 三模式及固定九列逐值比對，畫面和下載同快照。 | NOT_RUN |
| boundaries | 像素 1/200000、密度 1/1200、半入與無條件進位、尺寸門檻、未啟用欄和首錯。 | NOT_RUN |
| privacy | 無照片檔上傳，Network/Storage/URL/console 及清除。 | NOT_RUN |
| security | 敵意文字 inert、CSP、固定檔名、上限、Worker/Blob 撤銷。 | NOT_RUN |
| usability | 兩語三模式、預設鈕、忙／取消、錯誤恢復、下載和桌面行動可達。 | NOT_RUN |
| accessibility | 鍵盤、可見焦點、320px、實際 zoom、對比、觸控、狀態語意。 | NOT_RUN |
| localization-seo | 兩 HTML、九尺寸與品質標籤、noindex、同語回鏈、正式 canonical/hreflang。 | NOT_RUN |
| toolchain-provenance | 同候選 PR、Node 24、兩次重建 bytes、離線命令與 exit。 | NOT_RUN |
| compatibility | Chrome/Edge 的兩語輸入、錯誤、Worker、Blob 和 reflow。 | NOT_RUN |

## 來源

- 既有工作已涵蓋等比尺寸、有效 PPI、目標判斷及需求像素。 [固定既有圖片列印規格 FR-02–04](https://github.com/KYStr/glossquote-labs-home/blob/be197ea30d909b1353e7f77bdf16b1811ac41f71/coordination/local/2026-10-29/specs/31-print-size/SPEC.md)
- 登記冊的既有實作版本。 [既有圖片列印固定來源](https://github.com/KYStr/glossquote-labs-print-size/tree/647b254ce566a519d31fa6c4261d8024009f66de)
- 官方摘要確認適用 A/B 系列裁切尺寸。公開摘要未刊三項尺寸表。 [ISO 216:2007](https://www.iso.org/standard/36631.html)
- 官方手冊核對 A3 297×420、A4 210×297、A5 148×210 mm。 [Canon Océ VarioPrint 手冊 §4.10.1](https://files.lfpp.csa.canon.com/media/Assets/PDFs/TSS/external/VP1105/Documentation/VP1105_CONTR_GB.pdf)
- 1 in 精確等於 25.4 mm。 [NIST SI 長度](https://www.nist.gov/pml/owm/si-units-length)
- 原圖像素除以實體尺寸的單位是 PPI；保留比例與獨立拉伸兩邊有不同結果。 [Adobe Photoshop 影像尺寸與解析度](https://helpx.adobe.com/photoshop/desktop/crop-resize-transform/resize-adjust-resolution/image-size-resolution-and-resampling.html)

GitHub 正式審查登記維持 NOT_RUN。 [重現命令與固定來源](../REPRODUCE.md)
