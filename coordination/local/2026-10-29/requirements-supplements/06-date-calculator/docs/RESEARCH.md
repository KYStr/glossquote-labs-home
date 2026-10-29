# 日期規則研究（T01）

2026-09-29，主代理實測。Node v24.14.0、npm11.9.0、Windows；IAB引擎版本未公開，未猜測版本。

## 日期與邊界

已讀[WHATWG日期微語法](https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#dates)與[date控制](https://html.spec.whatwg.org/multipage/input.html#date-state-(type=date))：無時區的延伸公曆，閏年依4／100／400規則；日期必須實際存在。WHATWG年份允許四位以上正年份，本產品刻意限四位0001..9999，不宣稱完整支援全部HTML日期年份。

自行核對：9999年前的完整年天數為365×9998+floor(9998/4)−floor(9998/100)+floor(9998/400)=3651694；加9999年最後一日的零起算偏移364，最大ordinal=3652058；共3652059個日期。400年週期為146097日。

Python標準庫datetime/calendar獨立執行：0001-01-01 ordinal-1=0；9999-12-31 ordinal-1=3652058；年1/1900/2100/9999非閏年、2000閏年。此結果是獨立測試依據，不把Python或Date API加入產品。

## 原生date與文字欄位探測

`.runs/date-calculator/probe.html` 為合成測資，使用僅綁loopback的臨時probe.mjs伺服器；完成後已停止。透過IAB真實HTTP頁面取得：

| 案例 | DOM觀察 |
|---|---|
| type=date，初始2000-02-29 | type仍為date，value=2000-02-29 |
| type=date，初始1900-02-29 | 原生清為空字串，badInput=false |
| type=text，初始1900-02-29 | 原文字保留，需產品核心判斷日期有效性 |
| 原生填0001-01-01 | value精確保留，validity.valid=true |
| 原生填9999-12-31 | value精確保留，validity.valid=true |

原生控制會sanitize無效字串，不能把原生空字串當作證明所有錯誤均已驗證；UI另處理validity.badInput，core嚴格驗證文字fallback及直接API。T03/T04還需產品實际操作與fallback回歸；此探測不是產品驗收，也不是所有瀏覽器相容性認證。手機／Firefox／Safari／輔助技術尚未實測。

無未決演算法選擇，採TECHNICAL的純整數ordinal與二分反算；不新增Date.parse、時區、套件或遠端API。
