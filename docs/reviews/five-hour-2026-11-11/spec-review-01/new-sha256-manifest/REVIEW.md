# 多檔 SHA-256 清單校驗獨立文件審查

審查建議為 **修正後複審**。本次核對新規格工作 `labs-batch-sha256-manifest-spec-20261111` 的固定候選 `2a2cc4fddf0ffd28d07c579f783d4445e61b0e20`。八節中 `acceptance` 為 **88**，有一項會阻擋文件通過。 [候選 PR #312](https://github.com/KYStr/glossquote-labs-home/pull/312) · [固定派工](https://github.com/KYStr/glossquote-labs-home/blob/14d3dff09fe8f283726a7e8cb9eaadd905500516/docs/reviews/five-hour-2026-11-11/dispatch/new-spec-batch-sha256-manifest/TASK.md)

## 阻擋 SHA312-01

`boundaries` 把所有錯誤的待核對檔內容讀取數寫成零。首錯表先做清單及選檔預檢，`DIGEST_FAILED` 屬於執行階段，必須在配對檔讀取成功後才可能發生。 [產品條款](https://github.com/KYStr/glossquote-labs-home/blob/2a2cc4fddf0ffd28d07c579f783d4445e61b0e20/docs/specs/batch-sha256-manifest/SPEC.md#L225) · [預檢順序](https://github.com/KYStr/glossquote-labs-home/blob/2a2cc4fddf0ffd28d07c579f783d4445e61b0e20/docs/specs/batch-sha256-manifest/SPEC.md#L92-L109) · [執行規則](https://github.com/KYStr/glossquote-labs-home/blob/2a2cc4fddf0ffd28d07c579f783d4445e61b0e20/docs/specs/batch-sha256-manifest/SPEC.md#L174)

最小合成輸入是一列有效清單、一個同名的 3-byte File，並讓該檔的 digest 拒絕。下列是清單全文。

```text
ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad  x
```

File 名為 `x`，位元組為 hex `616263`，`digestRejectAtFileIndex=1`。獨立重現得到以下完整失敗回傳，`readManifestCalls=0`、`readSelected=[1]`、`digestSelected=[1]`，`reportUtf8=null`。目前 `boundaries` 的零讀檔條件與 `readSelected=[1]` 不相容。原候選 `digest-rejects-batch` 也固定讀取位置 2 後回 `DIGEST_FAILED`。 [固定案例](https://github.com/KYStr/glossquote-labs-home/blob/2a2cc4fddf0ffd28d07c579f783d4445e61b0e20/docs/specs/batch-sha256-manifest/fixtures.json#L2081) · [最小案例與輸出](verification.json)

```json
{"ok":false,"error":{"code":"DIGEST_FAILED","field":"files","line":null,"fileIndex":1,"firstLine":null,"firstFileIndex":null}}
```

把零讀取條件限於**預檢失敗時的待核對檔內容**。清單 File 可在預檢讀取。個別配對檔讀取失敗仍應記 `read_error` 並繼續，執行中的 digest 或 Worker 故障則按已發生的讀取及全批失敗行為判定。固定案例的既有預期與此一致。 [個別讀取失敗案例](https://github.com/KYStr/glossquote-labs-home/blob/2a2cc4fddf0ffd28d07c579f783d4445e61b0e20/docs/specs/batch-sha256-manifest/fixtures.json#L401)

## 八節評分

| 文件面向 | 分數 | 獨立查核 |
| --- | ---: | --- |
| `goal` | 100 | 具體收件角色、裝置、外部清單、集合差異與可交付 JSON。對照既有單檔契約。 |
| `scope` | 100 | 支援格式、名稱與容量界線清楚，區分桌面多選、行動小批次和離線條件。 |
| `userFlow` | 100 | 雙語操作、來源優先、取消／失效／離頁與下載都有具體規則，60 步已重算。 |
| `inputsOutputs` | 100 | 預檢及錯誤位置可決定，55 個批次結果及 12 份 JSON 報告均相符。 |
| `implementation` | 100 | 逐件讀取、Worker 請求與終態、世代、進度與 URL 生命週期可實作。 |
| `acceptance` | 88 | 九項產品 criteria 均有可觀察方法。零讀檔條款與執行期 digest 故障矛盾，須修正。 |
| `tests` | 100 | 獨立 oracle 核對所有固定案例，另驗 128 MiB 配對與 UTF-16／CRLF 游標。 |
| `handoff` | 100 | 固定 TASK、brief、候選四檔、承接與相對連結可重取，產品與發布界線明確。 |

## 九項產品面向

| ID | 具體觀察方法 | 產品狀態 |
| --- | --- | --- |
| `functionality` | 兩語實際檢查 mixed／全相符／零選檔，對照列狀態及 JSON 位元組。 | `NOT_RUN` |
| `boundaries` | 對照格式、大小、重名、Unicode、個別讀取與整批執行故障、世代及晚到訊息的 IO 紀錄。零讀檔條款須限於預檢失敗。 | `NOT_RUN` |
| `privacy` | 隔離瀏覽器記錄 Network／Storage、離頁、重跑與 Worker／Blob URL 清理。 | `NOT_RUN` |
| `security` | 核 CSP、固定資產與路徑、secure context、訊息形狀、惰性檔名與例外輸出。 | `NOT_RUN` |
| `usability` | 兩種清單來源、批次替換、移除、取消、重試、篩選與下載，並走 320 CSS px。 | `NOT_RUN` |
| `accessibility` | 核鍵盤、焦點、錯誤關聯、讀屏、真實 200% zoom、觸控與對比。 | `NOT_RUN` |
| `localization-seo` | 比對雙語靜態頁、lang、title、description、canonical、hreflang、x-default、noindex 與同語首頁。 | `NOT_RUN` |
| `toolchain-provenance` | 固定來源、Node 24、零 runtime 相依、同一 head 離線重建兩次並逐檔比對 SHA-256。 | `NOT_RUN` |
| `compatibility` | 記 Windows Chrome／Edge 與代表性行動端版本，實跑 File、Worker、下載、離線及低記憶體情境。 | `NOT_RUN` |

## 離線證據

以 Python 3.12.5 執行 `python -B -X utf8 verify.py`，exit 0。驗算從合成 bytes、線性名稱配對和獨立事件時間序列重建預期。三組 SHA-256、55 個批次案例、5 組共 60 個控制器步驟與 8 個邊界配方均相符。12 份批次下載逐字節相符。主案例為 846 bytes、末尾 LF、SHA-256 `ce2119748c04ce50cb99c49bafdcc470b707edf34f6e5f415bc8d09b9c137fa8`，只讀取所選位置 3、2。 [獨立驗算](verify.py) · [固定 fixture](fixtures.json) · [驗算輸出](verification.json)

- GNU Coreutils 8.32 以 ASCII `abc` 重算，核對 untagged 空格與 `*` 模式、tagged 及 NUL 終止格式。獨立 oracle 核對 BOM、CRLF、裸 CR、UTF-8、ASCII 及 Unicode 名稱、重名、漏件、額外檔、mismatch、`read_error` 與多重錯誤的先後。 [GNU 格式](https://www.gnu.org/software/coreutils/manual/html_node/cksum-output-modes.html) · [RFC 6234 測試向量](https://datatracker.ietf.org/doc/html/rfc6234#section-8.5)
- 最長合法清單 64,603 bytes，65,536 bytes 通過 byte gate 後仍須驗文法。65,537 bytes 在文法前超限。32 MiB 零塊逐塊重算，四個配對檔合計 128 MiB 通過；再加 1 byte 即 `FILES_TOTAL_LIMIT`，待核對檔讀取為零。 [邊界輸出](verification.json)
- 檢查貼上原始換行與畫面 LF 的優先順序、檔案來源切換、取消後晚到、下載 URL 清理和 BFCache。另驗 UTF-16 選取位置與新合成 CRLF 的游標。候選內附的 Node v24.14.0 可攜驗證也重跑通過。 [控制器證據](verification.json) · [作者可攜命令](https://github.com/KYStr/glossquote-labs-home/blob/2a2cc4fddf0ffd28d07c579f783d4445e61b0e20/docs/specs/batch-sha256-manifest/AUTHOR-CHECK.md#L30-L73)

## 固定來源與範圍

遠端 revision 1605 讀回原 owner、claim 與 ACK／register-task／claim／start 四筆原操作。工作為 `working`，正式規格登記與交驗待各自時段。候選是固定 parent `c83e9cfafaf1c67744e0571c1c3fd3dfa4c05f64` 之上的單一提交，僅新增四份規格檔，九個相對連結已核對。 [固定 brief](https://github.com/KYStr/glossquote-labs-home/blob/14d3dff09fe8f283726a7e8cb9eaadd905500516/docs/specs/batch-sha256-manifest/BRIEF.md) · [來源與雜湊紀錄](review.json)

既有單檔工具處理一個 File 和可選的 64 位預期碼，下載 65 bytes 的單行 digest。新規格以外部清單及多個 File 的名稱配對，能列出漏件、額外檔、錯值及讀取失敗。重複檔案工具按內容分組，封存路徑預檢則檢查文字路徑政策。 [單檔產品契約](https://github.com/KYStr/glossquote-labs-file-checksum/blob/eab1da8e69e896be00ff1be54095641352a280a7/PRODUCT.md) · [重複檔分組](https://github.com/KYStr/glossquote-labs-duplicate-files/blob/32bae23bcfc9753cb60756ff9ef2381219565f67/PRODUCT.md) · [封存路徑規格](https://github.com/KYStr/glossquote-labs-home/blob/a5e7356dae36d2aac3db068352a916d76c7594c3/docs/specs/archive-path-preflight/SPEC.md)
