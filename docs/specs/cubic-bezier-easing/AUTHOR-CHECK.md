# Cubic Bézier Easing Explorer — 作者文件查核

2026-10-31。此查核只針對完整製作預案，不是非作者審查，不是產品測試或品質分數。原BRIEF固定2537bd5349c2773253aa4c47f2ab7332ac676538，未修改原7625 UTF-8 bytes。

## 固定文件

SPEC.md：32749 UTF-8 bytes，SHA256 `f9310462f9ba12b6ef96e0d231f0bb8c857314823b58713f13a58184a7b2c6f5`。候選commit與draft PR由交件記錄指向包含本檔的實際head，不能把分支名當固定候選。

## 八節自查（不是ready核准）

| 節 | 實質內容/可反駁檢查 |
|---|---|
| goal | 非作者可只靠頁內文字讀時間/進度、辨別回彈、修錯與取CSS；不宣稱市場證據 |
| scope | 固定brief/README/W3C語義，與61工具及四新方向區別；F01–08與無下載/匯入/持久化排除 |
| userFlow | 初始到產生、IME/失效、單次播放停續、radio靜態、減動OR、背景/BFCache/複製晚到與OS不可撤銷界線 |
| inputsOutputs | 精確raw/schema/descriptor/欄序與完整匹配、千分整數、BigInt有理比較40輪、端點、反序x、負/超額y、固定圖/表/CSS及literal |
| implementation | 純核心/控制器/DOM分層、資源界、安全SVG/CSP、雙語及焦點映射、桌面reflow/縮放、Node24零依賴與來源限制 |
| acceptance | 九完整產品面向各有必要範圍、方法、預期與證據；逐項至少90，缺證null，文件完整度與產品驗收分離 |
| tests | T01–10離線規劃、B01–08正常桌面規劃，解析expected與獨立oracle、原生CSS隔離參考，不以同函式自證 |
| handoff | 固定三檔/候選/open draft PR、另一實際reviewer八布林、同ID修訂、後續production另claim，不授部署 |

## 本人實際完成的文件查核

1. 親讀固定brief及當輪61+4方向/最新registry與PR，沒有重複方向；既有owner不變。本件沒有接走現成產品責任。
2. 用Python Fraction做文件算術：t=1/2下，控制點(0,1,0,1)的x=1/8、y=7/8；(1,0,1,0)的x=7/8、y=1/8；(0,-1,1,-1)在x=1/2得y=-5/8；(0,2,1,2)得y=13/8。這四解析例與表一致。相同x/y控制點的兩條線性例是同一多項式，故y=x，包括反序x=1,0的孤立平坦處；這是代數理由，不假稱跑產品solver。
3. 本規格數學誤差：相鄰y控制差≤3，Bernstein導數加權和絕對值≤9；40輪後中點t誤差≤2^-41，因此上界9/2199023255552<5e-12。BigInt精確x比較避免平坦處浮點殘差過早終止。這是文件推導，不是效能或native精度實測。
4. 初值CSS literal含末LF為61 ASCII/UTF-8 bytes，SHA256 `ddf39e9d4f93e3bb71bc52cb8db8915e3d33aed06d1ec1d79404c1e3bdd6410b`。清楚區分一行CSS宣告與完整animation。
5. 章節/矩陣結構查核：八個二級章、九面向、T01–10與B01–08全有方法及expected。數量只是結構檢查，不換品質分數。
6. 作者自查中修正兩個文件歧義：JS $末尾換行需完整match等於raw；表格rounding必用指定有理結果，不能容許同輸入隨意兩種末位。這些是在本次候選固定前的規格精化，不是產品bug修復或已測通過。
7. 讀W3C固定2023-02-13版的x/y語義；讀MDN Animation.currentTime與Element.animate，僅確認隔離原生參考方案可有暫停採樣入口。沒有把文件存在當瀏覽器已測或API全面支援。

## 未執行與必要下一步

產品程式尚未製作。npm test/check/build、真頁面、clipboard、CSP/Network/Storage、BFCache、鍵盤/讀屏/對比、播放、效能、原生CSS對照、跨引擎與手機全部 NOT_RUN。作者文檔算術不是產品核心實作/測試，也不是獨立評分。

交另一位未參與本預案製作的reviewer檢查固定SPEC八節，特別核對有理反解/表格rounding、取消與焦點時序、原生可執行驗收與九面向。發現矛盾原作者同ID修正，未通過不得mark-ready；作者不代簽。公開保存不等merge/部署；本次無產品實作、workflow、catalog、費用、憑證或私人輸入。

## 同稿R1 affected修正（版本1.1）

原T04「近中心必與Q相等」誤將理論y=x與有界逆解結果混同，且Q須先除1000000。僅將T04期望改為既定有理誤差abs(y-Q/1000000)≤9*2^-41、渲染Number後≤1e-9，明定Q499999嚴格低於0.5、Q500001嚴格高於0.5；端點/精確比較成功才要求精確值，Q500000=0.5。§4.2算法與其餘技術內容未改。

作者僅對這三個Q用Fraction重新核文件的40輪二分，兩鄰點誤差約∓1.3175742641189345e-16，皆在界內且在正確一側，中心精確0.5。分母含5的兩鄰點理論值不能等於此dyadic多項式的有限dyadic近似。這是修訂後文件可執行性查核，非產品程式測試；四個未受影響解析例、CSS literal與其他已完成文件檢查沒有重跑，保留上列歷史證據。未外寫/自標ready，交原非作者affected複核。
