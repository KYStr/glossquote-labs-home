# 服飾尺寸換算 — 作者檢查

作者 `cloud-dot:3d64a845-35f8-4dbf-8f30-96e603f6cdc7:/home/hatch/workspace/glossquote-factory`，運行 5 補庫（概念 #8）。作者文件核對，待非作者 readiness；本文不是獨立審查。

- 八節涵蓋 goal、scope、userFlow、inputsOutputs、implementation、acceptance、tests、handoff。配對 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json)。

- 已比對 checkout 內 101 份既有預案與 registry 規格識別碼。最相近者為 `spec-shoe-size-converter-v1`（鞋碼：腳長與鞋碼制）與 `spec-ring-size-converter-20261109`（戒圍）：本案處理服飾上衣的胸圍對照，資料表、欄位、錯誤碼完全獨立，且 scope 明示鞋碼為非目標。無服飾尺寸既有預案，非改名重複。

## 對照表來源（釘死單一來源組，2026-11-09 查閱）

公開尺寸表彼此本就存在差異（這正是 SPEC 釘死免責聲明的原因）；本文只採下列一組，逐格釘死，不混用其他圖表：

- 女裝數字欄：size-charts.com 國際換算表（US 2→UK 6／EU 32／JP 5、US 4→UK 8／EU 34／JP 7、US 6→UK 10／EU 36／JP 9、US 8→UK 12／EU 38／JP 11、US 10→UK 14／EU 40／JP 13、US 12→UK 16／EU 42／JP 15、US 14→UK 18／EU 44／JP 17；即 UK=US+4、EU=US+30、JP=US+3 的整表關係），US 0 列取 miniwebtool 女裝表 XXS 行（UK 4／EU 30／JP 3）。來源：https://size-charts.com/topics/clothing-size-chart/ 與 https://miniwebtool.com/clothing-size-converter/
- 女裝 JP 字母欄：JP 7／9／11／13 對 S／M／L／LL 為日系女裝常見標示，其餘列（JP 3／5／15／17）在來源圖表中無對應字母標示，釘為 null，不補值。
- 男裝整表：orbitika.app 男裝表逐格採用（XS：US/UK 34／EU 44／JP S／胸圍 86–91 cm；S：36／46／M／91–96；M：38／48／L／96–101；L：40／50／XL／101–106；XL：42／52／2L／106–111；XXL：44／54／3L／111–116）。來源：https://orbitika.app/blog/us-uk-eu-clothing-and-shoe-size-converter/ 。第 7 列（XXXL／46／56／4L／116–121）該表未列，依同表自身步進（數字 +2、EU +10、胸圍 +5 cm）延伸一列，已在此揭露。
- 女裝胸圍區間：公開圖表的公分帶彼此不一（miniwebtool：XS 80–85、S 86–90、M 91–97；size-charts 公分表：US 4 約 82–85、US 12 約 96–102），無單一圖表可逐格照抄。本文釘為半開區間 [74,79)…[110,116)（前六列寬 5 cm、末兩列寬 6 cm），錨點落在上述公開帶的覆蓋範圍內，屬彙編釘定而非單表複製，已在此揭露；roberin.com 的跨 24 來源對照（https://roberin.com/en/global-size-converter/ ）亦證實同一量測在不同圖表可差一列，故查表結果以本文釘死表為唯一契約。

## 作者修正（與來源圖表的差異，依簡報規則記錄）

來源圖表普遍把一個字母橫跨兩個數字（例如 S 同時對 US 4 與 US 6、M 同時對 US 8 與 US 10）。此種排法使「以字母查列」不具唯一解，與本工具尺寸模式的查表契約（命中列唯一）直接衝突。故釘死女裝表改採一列一字母（US 0–14 對 XXS／XS／S／M／L／XL／XXL／XXXL），位移仍落在公開圖表的字母分佈範圍內；此為作者彙編決定，品牌差異由釘死免責聲明涵蓋。獨立重算的不變量檢查（每欄代碼不重複、區間連續）正是先抓到此問題才促成本修正。

## 案例雙重推導

- 手算：18 筆核心案例的 expected 全部先依 SPEC 釘死表格與規則逐筆手算（半開區間歸屬、邊界 onBoundary、表外 status、正規化與 matchedBy、錯誤優先序），再寫入 fixtures.json。
- 獨立重算：另以 Python 腳本從來源規則重建兩張表（女裝以 UK=US+4、EU=US+30、JP=US+3 與字母序列重建；男裝以 orbitika 表的步進重建），並依 SPEC 驗證順序實作查表，對 fixtures.json 的 18 筆核心案例逐筆深比對：**18/18 完全一致**；同時驗證不變量（兩表每欄代碼不重複、區間首尾連續無縫）。3 筆 controller 案例沿用本組固定狀態模式，其 lateResult 與第 1 筆核心案例的 result 逐字相同。

- 產品交驗、Chrome/Edge、正式 HTTPS/SEO、Network/Storage、原生對話及部署皆 NOT_RUN，分數 null。未固定候選或未獨評前不計 ready。
