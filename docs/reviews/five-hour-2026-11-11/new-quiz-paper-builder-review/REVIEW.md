# 題庫抽卷與答案表獨立規格審查

**退修。** 固定公開草稿 [PR #337](https://github.com/KYStr/glossquote-labs-home/pull/337) 的 head 為 `e9e973c14f74f6fb7ca10042355cd7c90ffb481e`。7 個成功案例、40 個錯誤、8 組邊界、9 份完整 HTML 及 68 步既有控制器快照均與獨立推導一致。額外的文字組字反例需要補齊狀態契約與案例，之後再重審。

## 固定來源與獨立性

- 任務 `labs-quiz-paper-builder-spec-20261111`，預案 `spec-quiz-paper-builder-20261111`。原作者 `local-codex:01a1c8b8-1d30-7593-9793-f99d5f42f564`，claim `fh-quiz-claim-936e2143-6cba-431f-978a-def04adf3bf1`。本 reviewer `local-codex:01a1c8a3-8e7a-7481-b6d6-cd5b64fd24dc` 於 r1673 核對自己的當前 ACK 與作者／contributors。該快照原任務 working，submit 與預案登記仍待作者操作。[r1673 registry](https://github.com/KYStr/glossquote-labs-home/blob/6db84aebdef788f41c02350013600b95fdcad24f/coordination/work-registry.json)
- 以匿名 Git 與 GitHub connector 讀回 #337 的 open、draft、固定 head、單提交及四個 changed paths。從該提交讀四檔 bytes，與各自 Git blob、作者公開回執的 SHA-256 及公開 unified diff 的四組新增內容逐檔比對。實讀 diff 205,151 bytes，SHA-256 `5d0ed40011bf285812a050626044bee169c291198c40d8aada7061644ac02211`。[完整 PR diff](https://github.com/KYStr/glossquote-labs-home/pull/337/files) · [四檔雜湊](evidence/candidate-provenance.json)
- 固定 brief `14d3dff09fe8f283726a7e8cb9eaadd905500516`。獨立對照本地問答卡的同檔題答、雲端 r3 問答練習的 TXT／進度、模板工具的逐列 TXT／JSON。本案需要主題配額、兩個角色檔與連續題號，所核對的 registry、來源索引及 PR 搜尋未出現同用途工作。[固定研究簡報](https://github.com/KYStr/glossquote-labs-home/blob/14d3dff09fe8f283726a7e8cb9eaadd905500516/docs/specs/quiz-paper-builder/BRIEF.md)

## 八個文件面向

| 面向 | 分數 | 文件判定 | 依據 |
| --- | ---: | --- | --- |
| goal | 98 | PASS | 實際助教／講師、現有試算表、重編題號及兩個分離檔案的可觀察完成條件明確。 |
| scope | 98 | PASS | 上限、裝置、首載後離線、角色分離及相鄰工具區隔具體。工具自動洗牌依固定 brief 為範圍外。 |
| userFlow | 85 | FAIL | 空白、錯誤、恢復、取消、雙語及舊產物失效多數有字面證據。組字開始但文字值尚未改動時的撤銷要求與控制器規格衝突。 |
| inputsOutputs | 96 | PASS | CSV 分層與錯誤順序、主題計數、兩模型、正解映射與九份完整文件 bytes 可獨立重算。 |
| implementation | 85 | FAIL | 分組選題、Worker、輸出及資料清理有清楚介面與界線。精確 dispatcher 缺少組字開始與結束可使用的事件或等效介面。 |
| acceptance | 95 | PASS | §6 明列九產品面向、同一候選門檻、真實裝置與兩語測試。兩組審查責任明確。登記草案尚待作者操作。 |
| tests | 85 | FAIL | 既有 fixtures 全數通過獨立模型，缺少能固定組字未改值時舊產物及晚到回覆行為的案例。 |
| handoff | 97 | PASS | 公開候選、原作者、claim、固定 source、命令、產品責任及未驗項可追溯。11 條候選內相對連結皆存在。 |

### QPB-01　組字開始缺少同步撤銷舊產物的控制器契約

- **重現輸入。** 從 `zh-ready-edit-cancel-lifecycle` 第 13 步的快照開始。當前 preview 為 `answer`，兩個下載皆啟用，學生檔已建立 `lease-1`。在題本標題欄開始組字，暫未輸入不同文字。使用同值 title 事件或嘗試把組字開始傳給精確 dispatcher。
- **預期。** §3.2 明訂組字開始立即讓結果失效。預覽應清空、兩個下載應停用、`lease-1` 應撤銷。組字中不能啟動讀取或生成。完成或取消組字後，以當前值回到可操作狀態，須重新預覽才能產生兩份檔案。
- **觀察。** §5.1 控制器只暴露 `dispatch`、`snapshot`、`getPreview`。§5.2 只允許已列事件，未識別事件及同值編輯均無效。以獨立模型重放後，組字開始仍保留 `preview:"answer"`、兩個下載為 `true`、`downloadCount:1`，撤銷效果為 `null`。目前無合法事件能同時保留有效題庫／設定並依 §3.2 撤銷舊產物。此為文件契約的矛盾，以合成事件重現。[組字要求](https://github.com/KYStr/glossquote-labs-home/blob/e9e973c14f74f6fb7ca10042355cd7c90ffb481e/docs/specs/quiz-paper-builder/SPEC.md#L76-L79) · [控制器事件](https://github.com/KYStr/glossquote-labs-home/blob/e9e973c14f74f6fb7ca10042355cd7c90ffb481e/docs/specs/quiz-paper-builder/SPEC.md#L211-L226) · [快照與反例](evidence/controller-replay.json)
- **修正與重驗。** 明定頁面和控制器之間的開始／結束介面、題庫來源欄與設定欄各自失效範圍、同步撤銷與禁止啟動條件。補字面 trace 覆蓋 ready 且有下載 lease、未改值結束、忙碌時舊回覆。可保留現有兩語、下載與取消驗證。只需修改候選規格、fixtures 及相關作者檢查。

### 成功案例的摘要引用

`reversed-bytes-equal` 與 `correct-only-changes-answer` 共用 `bankRef:"sample"`。其摘要確實相同。反轉後實際 `Bank.rows[0].id` 為 M02，改正解後 G01 的 `correct` 為 B，兩者與引用的精確 `banks.sample` 不同。作者檢查實際把這兩個引用用於 `bankSummaries`，紙本模型與完整 HTML 皆核對一致。可將摘要引用語義明定，並對需要驗證的完整 Bank 保留對應字面值。本項未單獨阻擋文件。[兩個變體](https://github.com/KYStr/glossquote-labs-home/blob/e9e973c14f74f6fb7ca10042355cd7c90ffb481e/docs/specs/quiz-paper-builder/fixtures.json#L491-L566) · [獨立輸出](evidence/candidate-fixtures.json)

## 已執行的驗證

以下命令用 Python 3.12.5 標準庫離線執行，以固定候選四檔目錄作為參數。候選中的作者腳本只讀取作為審查資料。

| 命令 | Exit | 結果 |
| --- | ---: | --- |
| `python -B brief-oracle.py` | 0 | 簡報的兩組 SHA-256、固定題號、倒序、正解修改、手動交換選項及額外 UTF-16 和資料大小邊界。 |
| `python -B verify_candidate.py <固定四檔目錄>` | 0 | 7 個成功案例、40 個完整錯誤、8 組邊界及 9 份完整 HTML。逐一重建字面 bytes，核對角色、檔名、MIME、UTF-8、CSP 與固定 CSS hash。 |
| `python -B verify_controller.py <固定四檔目錄>` | 0 | 3 條 trace、68 步的全部 Snapshot、效果、adapter 計數均符。另保存 QPB-01 文件矛盾的額外事件輸入和結果。 |
| `git ls-remote`、GitHub PR metadata、公開 diff 與 raw bytes | 0／HTTP 成功 | 精確 PR head、四檔範圍、所有候選 bytes、作者回執及來源雜湊一致。 |

`lesson-1` 選 1:G01／A／蘭嶼及 2:M01／D／一拍，`lesson-3` 選 1:G02／B／淡水河及 2:M01／D／一拍。只改 G01 正解後，學生 HTML 仍為 1,674 bytes，SHA-256 `22153b192067e9968d8baaf74efb8218e0e4b7ef0b50b46807dea79a419b26f4`。答案表改為 B／中央山脈。額外 CSV 合成案手動交換 A、B 欄並改正解為 B 時，選項照新欄序，教師仍對應 1:G01／B／蘭嶼。學生投影只含標題、題號、題幹和原選項，兩個角色文件獨立。逐例比對 512 KiB−1／恰好／+1、500／501 題、30／31 主題、60／61 抽題、重複 ID、配額不足、同 digest ID 排序與 UTF-16 主題順序。[簡報字面推導](evidence/brief-oracle.json) · [候選實算](evidence/candidate-fixtures.json) · [控制器重放](evidence/controller-replay.json)

## 交驗狀態

本輪文件分數只適用固定 PR #337 head。原作者需提供修正後的固定候選，再重驗受影響的文件面向。§6 的九個產品 ID 已查，預案 draft 登記須在作者 submit 後另驗。產品 `functionality`、`boundaries`、`privacy`、`security`、`usability`、`accessibility`、`localization-seo`、`toolchain-provenance`、`compatibility` 均為 NOT_RUN。真瀏覽器、裝置、讀屏、列印、部署與正式 registry review／ready 仍待各自授權和證據。
