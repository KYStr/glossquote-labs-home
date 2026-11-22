# 多檔交付清單校驗完整預案

任務 ID：labs-batch-sha256-manifest-spec-20261111。預案 ID：spec-batch-sha256-manifest-20261111。階段：新完整規格製作，尚未ready、未產品製作。

## 目標與來源
把 [固定研究簡報](RESEARCH-BRIEF.md) 完成為可供另一位實作者獨立執行的八節規格。使用者情境、區隔、範圍與主要字面案例已由主統籌讀取；正式承接時仍須讀最新registry及PR檢查重複。主統籌裁定：清單對basename精確匹配；格式、重名、路徑、總檔案上限先驗。以固定SHA-256已知答案獨立核對，不把意外檔案或讀取失敗算通過。

## 唯一工作範圍
正式產品路徑預定 tools/batch-sha256-manifest/；本里程碑不製作產品。僅可寫自己的 dispatch/new-spec-batch-sha256-manifest/work/docs/specs/batch-sha256-manifest/{BRIEF.md,SPEC.md,fixtures.json,AUTHOR-CHECK.md}、自己的evidence與HANDOFF及任務腳本，不能改其他資料夾、首頁、看板、登記工具或部署。先有固定GitHub brief，再以自己的實際chat actor ACK、register spec工作、claim、精確operationId/requestHash/owner/claim讀回和start，才編修正式四檔。共享registry只在主統籌授予時段寫入。不得代簽、遞迴委派或重建已有候選。

## 必須交付的八節
1. goal：具體使用者、輸入前情況、一次操作後可帶走的成果及成功條件。
2. scope：明確支援/非目標、容量、設備及離線邊界、既有工具差異。
3. userFlow：兩語正常/空白/錯誤/忙碌/取消/dirty/重設/離頁流程，可回復且舊輸出立即失效。
4. inputsOutputs：精確schema、型別、文法、錯誤先後與位置；正規化、整數/精度/排序；完整成功/錯誤/下載字面bytes。
5. implementation：模組/核心/控制器/Worker介面、演算法、時間與記憶體上界、run世代/晚到拒絕、資料生命週期、零runtime依賴。
6. acceptance：逐項具體九產品面向 functionality、boundaries、privacy、security、usability、accessibility、localization-seo、toolchain-provenance、compatibility；登記spec.acceptanceCriteria要這九項，不能誤填八個文件章節。
7. tests：Node24 ESM built-ins、離線fake資料、各固定命令、邊界正反例、完整literal controller snapshots/下載bytes、不同原理oracle、雙次建置hash。必要瀏覽器/裝置/原生未測標NOT_RUN，不能模型代替。
8. handoff：實際source/candidate/PR/actor/claim、相容支持、來源及授權、固定指令、恢復點、未完成、發布及外驗界線。

## 驗收方式
文件四檔齊全並可攜，固定來源可取回；核心/錯誤/控制器案例完整literal預期且由算式或獨立模型驗算，不能先寫正式產品再擷取expected。提供自己執行命令/exit/輸出、diff、hash、相對連結檢查、來源重複核對。八個文件面向各需非作者≥90且必要查核完成才可accepted；spec-ready由非作者另登記，九項產品驗收另案。候選先用自己的codex分支公開PR，再交同一固定commit審查。原作者自查不能當獨評。

## 安全與停止
禁止本機互動瀏覽器/native/焦點/IME/鍵盤/滑鼠/clipboard/原生選檔列印/音訊；只背景CLI/檔案/HTTP，windowsHide。禁止憑證讀取、全域Git/auth修改、持久環境修改、新安裝、付費及部署。長任務前後環境guard、發布前後Git guard；漂移立停，不猜修復。來源/claim衝突、無權限、需求無法給一致定義時保存具體證據回主統籌。第一步寫READY-TO-CLAIM.md做唯讀設計，未授時段不開始寫正式規格。07:22:08Z開始收尾，2026-11-11 07:37:08Z硬停。
