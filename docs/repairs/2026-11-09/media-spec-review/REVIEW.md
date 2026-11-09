# 兩項媒體保留規格的獨立文件覆核

兩份文件連同可核實的固定交接引用，具備恢復原任務所需的八個面向。建議將兩份已由原任務保留的規格轉為 consumed。原 task、owner、claim、九項產品面向及必須通過的測試保持原登記。此處僅完成規格文件覆核，未執行任何媒體、瀏覽器或原生測試。

讀取 GitHub registry r1155，blob `3167007db754e13f737705cf1ec463a8bd64a61c`。兩端盤點已完成，兩份規格均 reserved，原 task 均 blocked。每個 spec 的 consumedBy 對應原 taskId 與 claimId。實際 reviewer 已確認同一協議版本與首頁基線。

## 固定文件範圍

- [影片取出 MP3 SPEC](https://github.com/KYStr/glossquote-labs-home/blob/be197ea30d909b1353e7f77bdf16b1811ac41f71/coordination/local/2026-10-29/specs/11-video-to-audio/SPEC.md)
- [短音檔本機逐字稿 SPEC](https://github.com/KYStr/glossquote-labs-home/blob/be197ea30d909b1353e7f77bdf16b1811ac41f71/coordination/local/2026-10-29/specs/12-audio-transcription/SPEC.md)
- [六款原作者續接與現行安全界線](https://github.com/KYStr/glossquote-labs-home/blob/35ecd659408aa78093a263b69f0abd8a15156c14/docs/repairs/2026-11-09/BLOCKED-SIX.md)

| 面向 | 影片轉 MP3 | 短音檔逐字稿 |
| --- | --- | --- |
| goal | 12–31 行指定有界 MP4 擷取為固定 MP3，初次說明實際下載量。 | 12–32 行指定本機限定 WAV 轉中英純文字，結果須人工核對。 |
| scope | 18–33、44–48 行限定 H.264/AAC、單 Worker 工作、無雲備援。 | 18–34、45–61 行限定 PCM16、多語固定模型、單執行緒及無遠端備援。 |
| userFlow | 21–28、94、115–145 行覆蓋選檔、明確載入、probe、轉換、取消、重試、試聽與下載。 | 20–29、111、130–162 行覆蓋選檔與語言、下載和初始化、推論、取消、空結果、下載與清除。 |
| inputsOutputs | 18–29、83–92、178–194 行有 50 MiB、180 秒、格式、音軌、輸出 128 kbps／44.1 kHz／2 聲道／4 MiB 與穩定錯誤。 | 18–30、103–109、218–235 行有 10 MiB、30 秒、RIFF/chunk/聲道/採樣率、20,000 code points 與 UTF-8 無 BOM 的 TXT。 |
| implementation | 44–96、221–235、270–284 行定義版本、資產 closure、固定 ffmpeg args、probe、Worker 生命周期與 timeout。 | 45–111、266–280、359–366 行定義模型和檔案版本、雜湊、同源驗證 Map、WAV parser、重採樣、Worker 及取消。 |
| acceptance | 50–57、200、234–235、284–286 行明定 Chrome＋Edge 六項 T02、每秒 OS 記憶體、合成音質、完整 Network、真離線與阻塞條件。 | 63–75、241–243、280–290 行明定 Chrome＋Edge 七項 T02、CER/WER、三輪時序、1.5 GiB、取消、離線、完整性、Network 與 Storage。 |
| tests | 172–200 行的合成 fixture、SNR oracle、VA-01 至 VA-21 及明確 PASS/FAIL/NOT_RUN 證據欄。 | 190–243 行的合成 WAV／固定假句、評分 oracle、AT-01 至 AT-22 及 spike 和產品測試的分界。 |
| handoff | 211、253–268、282–286 行及固定原 task brief、封存 HANDOFF、現行修正 brief 指向原 owner 與最新安全保存點。 | 254、323–357、368–378 行及固定原 task brief、封存 HANDOFF、現行修正 brief 指向 NC25 保存點、原 owner 及未結案的必要證據。 |

## 接續引用及風險

- 兩份 SPEC 的相對 HANDOFF 連結分別在第 211 與 254 行。be197ea 的兩個同資料夾目標均回 404。使用已讀回的封存版本、各 task 固定 items 檔與現行修正 brief 組成交接證據。原文的獨立 repo 發布步驟由現行共用 repo 契約取代，先在原 claim 做可比對的 `tools/<slug>/` 遷移。 [影片 HANDOFF](https://github.com/KYStr/glossquote-labs-home/blob/28003ee85406a8e846b54ec4e9ab71af0807e520/coordination/local/2026-10-29/handoffs/11-video-to-audio/HANDOFF.md) · [逐字稿 HANDOFF](https://github.com/KYStr/glossquote-labs-home/blob/28003ee85406a8e846b54ec4e9ab71af0807e520/coordination/local/2026-10-29/handoffs/12-audio-transcription/HANDOFF.md)
- 影片固定 @ffmpeg/ffmpeg 0.12.15 與 @ffmpeg/core 0.12.10。runtime manifest 的九筆與封存省略清單的 path、bytes、SHA-256 相符，總 32,360,894 bytes。另有兩份授權檔同樣省略。NEW22 修訂 2 與 Edge G1/G6 未驗限制照原紀錄保留。 [影片固定 item](https://github.com/KYStr/glossquote-labs-home/blob/be197ea30d909b1353e7f77bdf16b1811ac41f71/coordination/local/2026-10-29/items/11-video-to-audio.json)
- 逐字稿固定 Transformers 3.8.1 與 Xenova/whisper-base 的 64da57285918e20ea79ea5c88eed7197933abaa8。19 筆模型與 runtime 記錄共 102,581,371 bytes，path、bytes、SHA-256 與省略清單相符。最大一檔 53,707,539 bytes。NC25 保留歷史 69 FAIL、3 缺 terminal，兩項 fullNetworkAccepted 和 fullT02Accepted 均維持 false。 [逐字稿固定 item](https://github.com/KYStr/glossquote-labs-home/blob/be197ea30d909b1353e7f77bdf16b1811ac41f71/coordination/local/2026-10-29/items/12-audio-transcription.json)
- 此處比對的是已固定檔案清單及雜湊欄位。兩份公開來源仍缺實際執行資產，授權、可再現分發、隔離能力及完整原生 gate 留給原工作驗證。 [固定省略清單](https://github.com/KYStr/glossquote-labs-home/blob/be197ea30d909b1353e7f77bdf16b1811ac41f71/coordination/local/2026-10-29/source-omissions.json)

[固定來源讀回附錄](SOURCE-READBACK.json) 記錄檔案 Git blob 與封存省略清單核對。這份覆核只確認文件完整度。
