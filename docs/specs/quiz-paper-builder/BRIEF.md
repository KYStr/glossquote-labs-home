# 題庫抽卷與答案表 / Quiz Paper Builder

補習班助教或社區課程講師手上已有試算表單選題庫，今天要為沒有線上測驗帳號的學員印紙本練習。先將 CSV 讀入，指定每個主題的題數和抽卷代碼，再查看同批題號的學員題本和講師答案。兩個下載動作各帶走一份可離線開啟的 HTML。相同題庫、配額和代碼重建同一批題目，講師可以重印及核對。

主要操作在桌面進行，平板可操作配額並比對預覽，手機依題庫、配額、預覽、下載順序操作。初次載入靜態資源後，在頁面內完成讀取、取樣、預覽和匯出。學員檔的資料模型僅含標題、題號、題幹與 A–D 選項，講師檔按題號附 ID、主題、正解字母與文字。原始題幹和選項按文字保留，需由講師審閱可見內容後分發。

| 工作 | 固定內容 |
| --- | --- |
| 題庫 | UTF-8 CSV，精確欄位 `id,topic,prompt,a,b,c,d,correct`，最多 512 KiB、500 題、30 主題 |
| 設定 | 各主題配額起始 0，合計抽 1–60 題。預設標題「練習題」／「Practice quiz」，代碼 `lesson-1` |
| 取樣 | 每題 SHA-256 排名，按主題配額取前 N 題，依固定主題順序編號。代碼用來重現抽樣 |
| 產物 | `quiz-student.html` 和 `quiz-answer-key.html`，各至多 2 MiB，兩者可由講師自行開啟列印 |

本地問答卡以翻面、自評和同一份列印題答對照支援個人練習。雲端問答卡候選保存自評進度及題答文字。批次文字套版以單模板逐筆產出 TXT／JSON。抽卷需求是從主題選題並交付一對獨立的角色文件，包含可重建題號的配額和代碼。線上測驗、評分、帳號、協作與平台整合屬範圍外。[本地問答卡輸出](https://github.com/KYStr/glossquote-labs-home/blob/be197ea30d909b1353e7f77bdf16b1811ac41f71/coordination/local/2026-10-29/candidates/56-flashcards/public/js/core/export.mjs) · [雲端問答卡契約](https://github.com/KYStr/glossquote-labs-home/blob/3b1f36083d08eb3a780c3d6cccc31e1ff1d63fcf/archives/cloud-candidates/2026-10-29/flashcards/source/docs/SPEC.md) · [批次套版輸出](https://github.com/KYStr/glossquote-labs-template-merge/blob/837048c6d60ba79b5e2216937f7f993e36d36681/public/js/core/export.mjs)

任務 `labs-quiz-paper-builder-spec-20261111`，預案 `spec-quiz-paper-builder-20261111`。本候選交付文件，下一步為固定 PR 版本的獨立文件審查。[完整規格](SPEC.md) · [固定案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md) · [研究原稿](https://github.com/KYStr/glossquote-labs-home/blob/14d3dff09fe8f283726a7e8cb9eaadd905500516/docs/specs/quiz-paper-builder/BRIEF.md)
