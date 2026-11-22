# 文件交件資料夾的失效連結清單

預案 spec-markdown-package-links-20261111；工作 labs-markdown-package-links-spec-20261111。階段為研究簡報，未ready。

## 使用者與可帶走的成果

技術寫作者或行政同事把Markdown、圖片和附件搬到交件資料夾後，想一次找出引用到不存在檔案的地方。選取資料夾，立即得到來源檔、原行列、原連結、解析後相對路徑、精確相符/缺件/大小寫提示/根外/未檢的完整表，下載 markdown-package-links.json 交回修改。UI以錯誤清單與定位為中心，不是Markdown渲染器。不改檔、不抓外部網址、不執行HTML。

## 區隔與來源

既有markdown-anchor-audit（固定 a5e7356dae36d2aac3db068352a916d76c7594c3/docs/specs/markdown-anchor-audit/SPEC.md）只檢同一文字標題/片段，markdown-preview（7766505e7b641f02a8f56077942a592347b433e2/docs/specs/markdown-preview/SPEC.md）單篇轉HTML。本案處理整包實際檔名圖與跨檔缺件。承接前重新查中央registry、catalog、source-index與開啟PR，不能僅按slug排重。

主統籌2026-11-11已開讀 [CommonMark 0.31.2](https://spec.commonmark.org/0.31.2/#links)，以它作語法參照，不宣稱實作完整CommonMark。[Directory Entries](https://wicg.github.io/entries-api/#dom-htmlinputelement-webkitdirectory) 為資料夾來源能力參照，作者要核實支援面。

## 必要範圍與設計決策

首版桌面Chrome/Edge的明確資料夾選取；無相對路徑能力的環境清楚不支援，手機不假裝能完整驗目錄。最多2,000個檔名、200份Markdown、文字合計4MiB；先metadata容量，再讀必要Markdown內容；其他附件只讀路徑。全部純本地、雙語、零runtime依賴。

固定受限inline link/image語法，正確跳過受支援code fence/code span。作者必須列出可識別子集、巢狀/escape/標題/參照式/HTML的處理與未檢統計，不能遇到不識別內容就宣稱全包無問題。以UTF-8 fatal解碼，明確BOM/CRLF/行列含義。只檢本地相對檔案存在性，片段另列未驗，不重做anchor工具；含query或語法歧義列未檢。外部scheme/協定相對與data連結不fetch。相對路徑逐segment解析、一次百分比解碼、根外拒絕；encoded separator、NUL、重名、大小寫多義及Unicode正規化規則要逐一釘死，不自行合併檔案。

固定例：資料夾有 docs/setup.md、assets/logo.png、notes.txt；setup正文為 `[Logo](../assets/Logo.png)\n[Notes](../notes.txt)\n[Missing](lost.txt)\n[Outside](../../secret.txt)`。四列分別CASE_MISMATCH（候選assets/logo.png）、EXACT、MISSING（docs/lost.txt）、OUTSIDE_ROOT；大小寫提示不能算exact或自動改寫。同時assets/LOGO.png存在時提示多義。另驗code fence內相同字串不算連結、尾端換行、UTF-8檔名、%2e%2e根外、%252e一次解碼、引用資料夾與file衝突。

## 完整規格交付要求

四檔BRIEF/SPEC/fixtures/AUTHOR-CHECK，八節完整。釘schema/首錯/來源定位/支援子集/固定排序及JSONbytes，含未知覆蓋的明確狀態；演算法有界，不能無限backtracking。選新資料夾或改選項即撤銷舊報告，取消/晚到/離頁世代可測；Worker與Blob生命週期明確。以合成File與路徑表離線驗，不讀使用者其他檔案。fixture含字面報告、錯誤與controller snapshots，至少一組獨立手算檔案圖。

產品九面向、繁中英文SEO/同語首頁、preview noindex、固定Node24測試命令、雙次buildhash、真Chrome/Edge與原生選檔/下載及Network/Storage待驗全寫清楚。SPEC可開工不等於產品已通過；本輪只做文件，不操作本地UI，不部署。
