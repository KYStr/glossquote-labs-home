# 瀏覽器實測紀錄

M1 已由主代理接受；完整 B01–B20 矩陣、原始失敗與 NOT_RUN 見 HANDOFF.md 及根 .runs/duty-roster/W17-29-M1-20261017-01a147c2/browser-observations.json。

- 兩語完整／部分結果、22種編輯失效、欄位錯誤、確認取消／清除、成員重排、30人及80字姓名：實際瀏覽器觀察。
- 繁中與英文 320 CSS px：頁面 width/scrollWidth 均320，表格在253px region內局部捲動。
- 原生 Tab/Shift+Tab/Return/Space 完成兩語主要流程與報告選取；原生複製等待成功後與自己的假資料逐字一致。
- 原生下載英文269bytes、繁中286bytes，固定檔名、UTF8無BOM、LF、無尾LF，與報告逐位元一致。
- 真機、完整Network/Storage、原生拒絕剪貼簿權限、真BFCache persisted、真正200% zoom、JS-off/故障注入、實體讀屏：NOT_RUN，原因與影響見 HANDOFF。
- M2 本機5209模型另記 .runs/duty-roster/W17-29-M2-20261017-01a147c2/；不得稱為Cloudflare live。
