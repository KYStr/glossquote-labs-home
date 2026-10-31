// 預覽 HTTP 安全契約；正式部署前仍須另驗真實主機。
export const CSP = "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'";
export const HEADERS = Object.freeze({ 'Content-Security-Policy': CSP, 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'X-Robots-Tag': 'noindex, nofollow', 'Cache-Control': 'no-store', 'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), clipboard-write=(self)' });
