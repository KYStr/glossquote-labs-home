# 旅程時間估算 — 作者檢查

作者 `cloud-dot:3d64a845-35f8-4dbf-8f30-96e603f6cdc7:/home/hatch/workspace/glossquote-factory`（run 4 規格作者），規格任務 `labs-trip-time-estimator-spec-20261109` 由主代理登記。**這是作者本人的文件檢查，不是獨立審查**；ready 與否由非作者 reviewer 對同一固定候選判定。

- 八節涵蓋 goal、scope、userFlow、inputsOutputs、implementation、acceptance、tests、handoff。配對 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json)。

## 查重

已比對本 repo `docs/specs/` 既有規格、`sources/legacy/` 與 registry 規格清單：沒有以固定偏移做「出發＋旅程時間→抵達」或「抵達→反推旅程時間」的既有規格或工具。最相近者與差異已寫入 SPEC scope：

- `time-zone-converter`：經裝置時區資料庫把鐘面讀數換算到多個 IANA 時區，處理 DST 缺口／重疊，且明文排除飛行時間。本案不用時區資料庫，偏移由使用者以固定值給定，核心是旅程加減與跨日位移。
- `sunrise-sunset-calculator`：同樣接受日期與 UTC 偏移，但輸出為太陽事件時刻的天文近似，與人為行程無關。
- `trip-time-estimator` 在 legacy／candidates 中無同名或同功能項目。

## 概念版本出入（提請統籌注意）

本 checkout 內共用簡報（SPEC-AUTHOR-BRIEF.md）第 36 條同 slug 的概念是「行車時間估算」（距離、平均速度、休息規則、到達時刻），與本次指派給本作者的 concept #36（跨時區旅程：出發日期時間、兩地固定偏移、旅程時間／抵達時間雙模式）內容完全不同。本案依指派版本撰寫，查重對象亦依指派版本（time-zone-converter、sunrise-sunset）。若統籌實際需要的是行車版，本案不覆蓋該需求，需另開規格。

## Fixture 重算

11 筆核心案例的 expected 先以手算完成（絕對分鐘逐案推導，例如 `dateline-day-before`：depDay 為 2026-01-10、日數 20463，depLocalAbs 29,467,320，減偏移 720 得 29,466,600，加 540 得抵達絕對分鐘 29,467,140，再以抵達偏移 −600 換算為 2026-01-09 21:00、dayShift −1），再以一份依 SPEC 公式獨立撰寫的 scratch 實作（Hinnant daysFromCivil／civilFromDays＋絕對分鐘模型，非產品程式）重算一次，8 筆含結果或 DURATION_NOT_POSITIVE 的案例逐欄位深度比對全數一致；scratch 另驗證 civil 換算在 1999-01-01 至 2101-01-01 全域互逆。其餘 3 筆驗證錯誤案例（OFFSET_FORMAT、DATE_INVALID、RANGE）依 SPEC 固定驗證順序逐項核對欄位與第一錯誤位置。fixtures.json 已驗證可解析；3 筆 controller 案例沿用範本形狀，lateResult 與 `example-tokyo-hop` 的 result 逐欄位相同。

## 概念筆記未固定、由我決定並註明於 SPEC 的事項

1. 模式 B 的日期基準：抵達地日期以「出發地日期」為同一曆日，`arrivalNextDay` 切換為次日；不收抵達日期欄位。切換是唯一 +24 小時解讀，核心不自動加日。導出旅程時間 ≤ 0 固定回 DURATION_NOT_POSITIVE（field=`arrivalTime`）；> 2880 分鐘回 RANGE（field=`arrivalTime`）。
2. 旅程時間上限兩模式同為 2880 分鐘（48:00），涵蓋超長程加轉機等待的單段行程核對。
3. 出發日期範圍 2000-01-01 至 2099-12-31，與同批日期型工具一致；抵達日期由模型導出，不另設欄位界線。
4. 偏移文法：零偏移只許 `+00:00`，`-00:00` 為 OFFSET_FORMAT；分鐘非 15 分鐘步進為 OFFSET_FORMAT；值域外為 RANGE。
5. dayShift 由欄位界線可證恆在 −2 至 +4（極值：出發時刻 00:00／23:59、偏移差 ±1560 分鐘、旅程 1／2880 分鐘組合），標籤規則對任意整數固定。
6. 非目前模式的專屬欄位必須為空字串，非空即 SCHEMA；controller 切換模式時清空另一模式欄位。
7. 城市預設固定六組臺北航線與標準時間偏移（洛杉磯 −08:00、紐約 −05:00、倫敦 +00:00、巴黎 +01:00、雪梨 +10:00、東京 +09:00），只帶入偏移並固定標示「標準時間」。
8. 核心不讀裝置時鐘或時區；無「現在」預設，日期時間一律使用者輸入，fixtures 因此完全可重現。
9. 下載報告固定 `trip-time-report.json`，序列化規則沿用本批範本（key 排序、LF 結尾、2,097,152 bytes 上限）。

- 產品交驗、Chrome/Edge、正式 HTTPS/SEO、Network/Storage、原生對話及部署皆 NOT_RUN，分數 null。未固定候選或未獨評前不計 ready。
