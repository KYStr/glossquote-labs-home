const english = document.documentElement.lang === 'en'; // 能力錯誤仍遵目前頁面語言。
const status = document.getElementById('status'); // 使用預先存在的狀態區，不插入 HTML。
function unavailable() { // 必要能力不存在時不可假算結果。
  status.textContent = english ? 'This browser needs BigInt, SVG and animation frames to use this tool. Generation is unavailable; use a supported desktop browser.' : '此工具需要 BigInt、SVG 與動畫影格能力。目前無法產生結果，請使用支援的桌面瀏覽器。'; // 雙語說明不回顯內部例外或輸入。
  for (const button of document.querySelectorAll('button')) button.disabled = true; // 不留下看似可執行的表單與播放動作。
  document.getElementById('reduced').disabled = true; // 缺控制器時不冒減動功能可用。
} // 結束明確能力備援。
const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); // 只建立能力探測節點，不加入文件。
if (typeof BigInt !== 'function' || typeof requestAnimationFrame !== 'function' || typeof cancelAnimationFrame !== 'function' || typeof svg.createSVGRect !== 'function') unavailable(); // 在含 BigInt literal 的核心載入前檢查。
else import('./app.mjs').catch(unavailable); // 模組載入失敗同樣提供可讀說明而非空白。
