// 能力檢查保持在不含 BigInt literal 的 bootstrap；不支援時不匯入核心。
const en=document.documentElement.lang==='en',status=document.getElementById('boot-status');
function unavailable(){status.textContent=en?'This calculator is unavailable. BigInt and SVG support are required; no result has been generated.':'目前無法使用此計算工具。需要 BigInt 與 SVG 支援；未產生任何結果。';for(const control of document.querySelectorAll('[data-init]'))control.disabled=true;}
if(typeof BigInt!=='function'||typeof document.createElementNS!=='function')unavailable();else import('./app.mjs').catch(unavailable);
