# 空氣品質解讀 — 作者檢查

作者 run 6 規格作者（家長統籌的子代理，2026-11-21）。作者文件核對，待非作者 readiness。登記／claim／提交由家長執行，本任務未跑任何 registry／coordination 指令。

- 八節涵蓋 goal、scope、userFlow、inputsOutputs、implementation、acceptance、tests、handoff。配對 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json)。
- 本地 `docs/specs/` 逐目比對：無 aqi、air、weather、uv、feels-like、dew-point 相關規格；最相近者為本輪概念中的 feels-like-temperature／dew-point／uv-index-guide（皆為不同指數），差異見 SPEC scope 節。
- 19 筆字面核心案例、3 筆 controller 案例，共 22 筆。
- 產品交驗、Chrome/Edge、正式 HTTPS/SEO、Network/Storage、原生對話及部署皆 NOT_RUN，分數 null。未固定候選或未獨評前不計 ready。

## 來源核實與更正（概念筆記 vs 一手來源，查核日 2026-11-21）

概念筆記第 27 條的六段等級範圍與名稱（0–50 良好、51–100 普通、101–150 對敏感族群不健康、151–200 對所有族群不健康、201–300 非常不健康、301+ 危害）經核實與台灣環境部現行表完全一致，予以採用。以下為查核後對概念筆記未給出的細節所做的釘版與更正（依 brief 規則：概念與可驗證的一手來源衝突時，以來源為準）：

1. 台灣斷點表以環境部空氣品質監測網現行頁面為準：中文 https://airtw.moenv.gov.tw/cht/Information/Standard/AirQualityIndicatorNew.aspx 與英文 https://airtw.moenv.gov.tw/ENG/Information/Standard/AirQualityIndicator.aspx，兩頁斷點表一致。舊中文頁（AirQualityIndicator.aspx）的舊表（PM2.5 良好上限 15.4、PM10 良好上限 50、O3 1h 敏感段 0.125–0.164）已被現行表取代：PM2.5 良好上限 12.4、PM10 良好上限 30、O3 1h 敏感段 0.101–0.134、SO2 良好上限 8 ppb、NO2 良好上限 21 ppb。SPEC 釘版現行表，並在 §5 註明舊表已取代。
2. 美國制以 EPA Technical Assistance Document EPA-454/B-24-002（2024 年 5 月）表 6 為準，含 2024 年 PM2.5 修訂：良好上限 9.0（舊制 12.0）、普通 9.1–35.4、敏感 35.5–55.4；危害為 301–500 單段（PM2.5 225.5–325.4，AQI 500 封頂於 325.4）。eCFR 2024-03-25 的渲染版仍為舊表，故不以其為 PM2.5 來源；法源仍引 40 CFR Part 58 Appendix G。
3. 紫色 hex 釘版 #99004C（EPA TAD／AirNow 定義），不用部分舊資料常見的 #8F3F97。台灣官方頁面只給顏色名稱，六色 hex 以 EPA／AirNow 定義釘版，兩制共用。
4. 健康影響與活動建議全文取自環境部空氣品質監測網「空氣品質指標 (AQI) 與健康影響及活動建議」表（中文原文逐字）；英文為作者對中文原文的翻譯，非官方英文，SPEC 已明示。美國 EPA 自有的活動建議措辭未納入 v1，兩制共用同一組建議文，SPEC 已明示此限制。
5. 台灣制濃度修約採四捨五入（環境部即時 AQI 備註：PM2.5 取 1 位小數、O3 8h 與 PM10 取整數位）；美國制採截斷（40 CFR Part 58 Appendix G §12）。指標修約兩制皆為四捨五入取整數（0.5 進位為本工具釘版；EPA 原文只寫 round to the nearest integer，未明文半數規則）。

## 作者自定（非來源）規則，已在 SPEC 釘版

- 濃度絕對輸入上限（PM2.5 999.9、PM10 999、O3 1.000 ppm、CO 99.9、SO2／NO2 9999）為作者自定防呆界，非官方數字；超過表頂但在上限內者按 EPA 慣例以 500 計並記 ABOVE_TABLE_TOP。
- 副指標同分時指標污染物按固定順序 PM2.5、PM10、O3-8h、O3-1h、CO、SO2、NO2 取先者。
- 濃度模式列數上限 7 列（七種污染物選項各一列）；重複污染物為 DUPLICATE。
- 預設草稿 `{"mode":"aqi","system":"TW","aqi":"","rows":[]}`；載入範例填入第一個核心案例（AQI 35，台灣制）。

## 手算推導（方法一，逐筆）

公式：`Ip = ((Ihi − Ilo) / (BPhi − BPLo)) × (Cp − BPLo) + Ilo`，指標四捨五入（half-up）取整數。直接 AQI 案例為純等級查表，無插值。

- `pm25-tw-20`：台灣制，PM2.5 20.0 落 51–100 段（BPLo 12.5、BPHi 30.4、Ilo 51、Ihi 100）。Ip = 49/17.9 × 7.5 + 51 = 367.5/17.9 + 51 = 20.5307… + 51 = 71.5307… → 72。等級普通。
- `pm25-us-20`：美國制，同濃度落 51–100 段（BPLo 9.1、BPHi 35.4）。Ip = 49/26.3 × 10.9 + 51 = 534.1/26.3 + 51 = 20.3080… + 51 = 71.3080… → 71。等級普通。與台灣制同濃度差 1（72 vs 71），為兩制差異對照案例。
- `pm25-tw-edge-12-4`：Cp = BPHi 12.4，Ip = Ihi = 50。等級良好。
- `pm10-tw-100`：台灣制，PM10 100 落 101–150 段（BPLo 76、BPHi 190）。Ip = 49/114 × 24 + 101 = 1176/114 + 101 = 10.3158… + 101 = 111.3158… → 111。等級對敏感族群不健康。
- `o3-8h-0-078`：O3 8h 0.078 落 101–150 段（BPLo 0.071、BPHi 0.085）。Ip = 49/0.014 × 0.007 + 101 = 0.343/0.014 + 101 = 24.5 + 101 = 125.5 → 126（半數進位）。與 EPA TAD 的同數值 worked example（0.078 → 126）一致。
- `multi-max`：PM2.5 20.0 → 72（同上）；PM10 100 → 111（同上）；取最大 111，指標污染物 PM10。
- `multi-tie-break`：PM10 50 落 51–100 段（BPLo 31、BPHi 75）。Ip = 49/44 × 19 + 51 = 931/44 + 51 = 21.1591… + 51 = 72.1591… → 72，與 PM2.5 的 72 同分，按固定順序取 PM2.5 為指標污染物（輸入列順序為 PM10 在先，故本案例同時驗證「不按輸入順序」）。
- `pm25-above-top`：PM2.5 600 > 台灣制表頂 500.4 → 副指標 500，notices 記 ABOVE_TABLE_TOP。等級危害。
- `o3-8h-undefined`：O3 8h 0.250 > 0.200，8 小時欄無 301 以上區間（環境部註 2：301 以上改用 1 小時值）→ UNDEFINED_BAND，field rows，row 1。
- `o3-1h-below-band`：O3 1h 0.050 < 最低有定義下限 0.101 → UNDEFINED_BAND，field rows，row 1。
- `aqi-direct-good`／`aqi-boundary-50`／`aqi-boundary-51`／`aqi-direct-sensitive`／`aqi-boundary-500`：AQI 35→良好、50→良好（上緣含在內）、51→普通（下緣）、120→對敏感族群不健康、500→危害；皆為等級查表。
- `aqi-out-of-range-501`：501 超出 0–500 → RANGE，field aqi。`aqi-decimal`：「42.5」含小數點 → INTEGER_FORMAT，field aqi。`pm25-negative`：「-5」含負號 → DECIMAL_FORMAT，field rows，row 1。`pm25-over-cap`：1500 超出 PM2.5 絕對上限 999.9 → RANGE，field rows，row 1。

## 獨立重算（方法二，script）

以 Python `Decimal` 精確十進位運算另寫一份實作（`/tmp/aqi-verify.py`，未進版本庫）：台灣制 round-half-up、美國制 truncate 至釘版精度；同一插值公式；同樣的超表頂／空白格規則；等級查表。對 `fixtures.json` 逐筆比對核心案例的 aqi、level、dominantPollutant、subIndices（污染物／正規化濃度／副指標／等級）、notices，以及錯誤案例的錯誤碼與空白格判定。

結果：19 筆核心案例全數一致（`pm25-tw-20` 72、`pm25-us-20` 71、`pm25-tw-edge-12-4` 50、`pm10-tw-100` 111、`o3-8h-0-078` 126、`multi-max` 111／PM10、`multi-tie-break` 72／PM2.5、`pm25-above-top` 500＋ABOVE_TABLE_TOP；6 筆錯誤案例的錯誤碼與判定皆確認）。3 筆 controller 案例為狀態機描述，無法以純數值 script 重算，留待製作時的 controller 測試驗證。

## 未覆蓋、留待 reviewer 注意

- 美國制除 PM2.5 20.0 外的插值案例未列 fixture；公式與台灣制共用，斷點表已全文釘版，reviewer 可以 `pm25-us-20` 的方法自行驗算其他污染物。
- CO／SO2／NO2 無數值 fixture；同上，公式共用，斷點表已全文釘版。
- 台灣制 PM2.5 12.5 → 51（下緣）未列 fixture；與 `pm25-tw-edge-12-4`（上緣 50）對稱，reviewer 可自行驗算。
