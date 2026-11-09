# QR 碼產生器 · QR Code Maker

完全在本機瀏覽器運算的 QR 碼產生工具：把文字、網址或 Wi-Fi 連線資訊編碼成 QR 碼，
可自選容錯等級（L/M/Q/H)、邊界留白與前景/背景色，下載 PNG 或 SVG，或複製原始內容文字。
編碼器以純 JavaScript 依 ISO/IEC 18004 在 repo 內自行實作（byte mode、版本 1–40 自動選擇、
Reed–Solomon 錯誤更正、依 N1–N4 罰分規則選 mask)，零 runtime 依賴、不連網、不儲存。

An offline QR code maker that runs entirely in the browser. Encode text, a URL, or Wi-Fi
details into a QR code with your choice of error-correction level (L/M/Q/H), quiet-zone
margin, and foreground/background colours; download PNG or SVG, or copy the exact payload.
The encoder is implemented in-repo in pure JavaScript following ISO/IEC 18004 (byte mode,
automatic version 1–40 selection, Reed–Solomon error correction, mask selection by the
N1–N4 penalty rules). Zero runtime dependencies, no network, no storage.

## 功能 · Features

- 文字模式與 Wi-Fi 模式（WPA/WPA2、WEP、無密碼、隱藏網路），Wi-Fi 內容依慣例文法轉義
  Text and Wi-Fi modes (WPA/WPA2, WEP, nopass, hidden networks) with conventional escaping
- 即時容量讀數：位元組數、選定版本、剩餘位元組；超限時以錯誤訊息取代符號，不留舊圖
  Live capacity readout (bytes, version, bytes remaining); over-capacity input replaces
  the symbol with an error message — never a stale code
- 對比不足（或前景比背景亮）時在顏色區與下載區各顯示一次掃描警告
  A scannability contrast warning near the colour pickers and repeated by the downloads
- PNG 以整數倍模組置中繪製、無抗鋸齒、無時間戳記中繼資料；SVG 為單一路徑、位元組決定性
  PNG renders whole modules centred with no anti-aliasing and no timestamp metadata;
  SVG is a single path and byte-deterministic

## 本機開發 · Local development

```sh
npm run dev    # serve the preview at http://127.0.0.1:4173
npm test       # node:test suites (core fixtures, PNG round trip, controller via DOM shim)
npm run check  # project check (structure, CSP, forbidden APIs, capacity table)
npm run build  # copy public/ to dist/ byte-identically (preview only; production is refused)
```

## 隱私 · Privacy

所有運算都在你的裝置上完成：不傳送、不儲存、不追蹤。頁面本身也會提醒：
QR 碼等於一份公開的印刷副本，任何看得到的人都能讀出內容。

Everything is computed on your device: nothing is sent, stored, or tracked. The page
itself carries the reminder that a QR code is a printed copy in public view — anyone
who can see it can read it.

## 狀態 · Status

本 repo 為作品集候選版本（依 2026-11-02 build-first 指示先行建置，registry 登錄與審查
於後續批次階段處理），未部署、未上架。見 `PRODUCTION-STATUS.md` 與 `VERIFICATION.md`。

This repository is a portfolio candidate built under the owner's 2026-11-02 build-first
directive; registry registration and review are held for the later bulk phase. It is not
deployed or published. See `PRODUCTION-STATUS.md` and `VERIFICATION.md`.
