# labs-five-hour-spec-maintenance-core-20261111

## 問題與目標

使用者已授權獨立新代理修正、不再等待原作者；遠端 AGENTS 2026-11-09 已記錄。但現 core 只有原 author 的 revise-spec，另外 run5 四十份 spec.acceptanceCriteria 誤用了八文件章節，production 會繼承錯誤 rubric。目標是實作一個最窄、可審、保留歷史且不能自評的維護套用路徑，沒有授權直接改正式registry或放寬驗收。

主統籌已閱讀並採用隨附 DESIGN.md；以下是具約束性的補充裁定。先核對最新遠端 scripts/coordination-core.mjs 與現行測試/adapter/命令說明，理解後才改。

## 欄位與邊界

1. 新增 `apply-spec-maintenance`；本輪 authority 只允許真實 primary `local-codex:01a0c75e-24c2-76e1-8c70-536ae1ad1fbf`，用經審查程式常數，不能從自述role、一般ACK/reconcile猜。指定spec限本brief所附 run5-spec-ids.json 的40個既有ID。這不是建立一般管理員權限。
2. 新 register-task 可選結構化 `specRevisionTargets`，只限 maintenance。每個 target 預先固定 specId、expectedAuthorId、expectedDocument、expectedSource、expectedCriteriaHash、新document/source、完整九產品acceptanceCriteria、固定mappingRef、sourceMaintenanceTaskIds。所有舊狀態精確匹配；每個原來源maintenance已accepted且submission/acceptance exact candidate，原maker/contributors必須從registry解析繼承，禁止任意自述。修補本身與本任務不同：此類任務是對已存在固定維護候選做映射和八節覆核；不重做工具。
3. 既有兩個修正task沒有此欄位，不能回填假稱當時已宣告；它們照原流程accepted後，由新映射task先宣告精確目標再審。原作者、所有已知maker/contributors必須繼承到映射task，current owner claim時正常加入，所有人均不能審自身結果。
4. 套用只允許draft/ready/invalid、consumedBy=null、無任何task.specId引用；同ID/author/title/document repo/path，不得更換工具。document路徑限docs/specs/<slug>/SPEC.md，source path保持原用途。accepted映射task和新 refs 必須同固定候選，且candidate與acceptance完全一致，所有必要維護評分完整>=90。重放冪等、跨批次/無差異/錯expected必拒。
5. append-only完整舊snapshot+新的refs/criteria+operation/task/claim/reviewer/evidence來源；原author不改，所有maker寫入spec.contributors；清readiness回draft。後續真正非作者八節複核才可ready。補validateRegistry/validateSpecReadiness，拒原author和歷任維護maker自評。原spec製作task的八文件rubric不改，product的九面向由固定SPEC對應文字逐項映射，不用三maintenance criteria替代。
6. operationReferences加所有舊新refs、mapping、source task source/brief/submission/acceptance evidence。GitHub adapter 必須實讀固定JSON mapping並核對內容等於預宣告結構，不可只查檔名存在；適配器核實候選PR head與所審commit。純core不冒稱已連網。若既有adapter只exists，不繞過；補窄的驗證。不得讀環境token或在本機使用會讀token的CLI執行正式操作；可離線測adapter fake transport。
7. 避免自指SHA循環：固定mapping JSON內的『新候選內檔案』以repository/path（及bytes/SHA-256）表示，candidate commit從mappingRef／submission外層綁定；不要要求文件內先寫自己的commit。產生完整含修訂文件與mapping的候選commit後，register-task才把其固定SHA展開為new refs。adapter須比較mapping內容和展開後target完全一致，並驗修訂文件bytes來自sourceMaintenanceTaskIds的accepted固定來源；mapping製作者若實際再編修文件，必須如實列contributors和重新獨審，不能假稱byte-identical。

## 允許修改與不變事項

只寫本TASK資料夾 work/ 的中央repo隔離複本：scripts/coordination-core.mjs、必要的scripts/coordination.mjs/既有GitHub adapter，相關 test/ 與docs/COORDINATION-COMMANDS.md、docs/CLOUD-LOCAL-WORKFLOW.md、AGENTS.md中的本操作窄說明，及自己的evidence/HANDOFF。實際檔名先查現況再固定到ALLOWLIST.json；別改根工作區或任何原產品。不得改ready門檻40、production5held/1working、baseline/reconciliation、一般owner/handoff、舊歷史或權限。沒有產品/部署範圍。

## 開工與候選

第一階段只讀；等主統籌registry slot後本人ACK/register maintenance/claim/readback/start。task必要面向：core-transition-correctness、scope-owner-provenance、test-and-adapter-evidence。使用實際local-codex:<chatID>，source/brief固定已公開的GitHub檔案；不假簽、不手改registry。來源發布另等slot，固定獨立codex分支PR，Astra/primary讀diff與自行測後才接受；你不能merge或正式操作新命令。

## 驗證

執行現有coordination核心/adapter全部測試，加DESIGN.md的正反矩陣：授權、schema/未知欄位、原狀態、任何已派工、固定來源、九criteria、貢獻者獨立性、相同/不同重放、atomic batch rollback、既有registry相容、缺文件/映射不等/PR head改動拒絕寫入。測試必須有不依賴新implementation產生的fixture/oracle，未知或省略不能當PASS。正式registry只read/validate，不能測試寫入。所有測試offline fake data、Node24 builtins、無新依賴。

## 安全、報告、期限

禁止桌面、本機互動browser、焦點/鍵鼠/IME/clipboard/native dialogs。子行程windowsHide true。禁止憑證/環境token/global Git/gh auth/persistent env/安裝/付費。長測前後Windows guard，來源寫前後Git guard。不再委派。core設計矛盾/無法保留舊registry/需要更大權限就保存具體失敗回報，兩輪同失敗不盲試。交HANDOFF含檔案/diff、命令/exit、實際NOT_RUN與風險。UTC2026-11-11T07:22:08Z收尾，07:37:08Z硬截止，不延長。
