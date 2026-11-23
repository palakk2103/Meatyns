const API = 'http://localhost:7000/api';
const j = async (r) => { const t = await r.text(); try { const o = JSON.parse(t); o.__s = r.status; return o; } catch { return { raw: t.slice(0, 120), __s: r.status }; } };
const post = (p, b, h = {}) => fetch(`${API}${p}`, { method: 'POST', headers: { 'content-type': 'application/json', ...h }, body: JSON.stringify(b) }).then(j);
const get = (p, h) => fetch(`${API}${p}`, { headers: h }).then(j);
const tok = (v) => v.result?.token || v.result?.accessToken;

async function role(name, sendPath, verPath, id, getPaths) {
  const s = await post(sendPath, id);
  const v = await post(verPath, { ...id, otp: '1234' });
  const t = tok(v);
  console.log(`\n[${name}] send:`, s.message, '| verify:', v.message, t ? '(token ok)' : '(NO TOKEN)');
  if (!t) return;
  const H = { authorization: `Bearer ${t}` };
  for (const p of getPaths) { const r = await get(p, H); console.log(`  ${r.__s} GET ${p} ${r.__s >= 400 ? '-> ' + r.message : ''}`); }
}

await role('SELLER', '/seller/login-otp', '/seller/verify-login-otp', { email: 'palakk2103@gmail.com' },
  ['/seller/stats', '/seller/earnings', '/seller/wallet/summary', '/orders/seller-orders', '/products/seller', '/seller/profile']);
await role('DELIVERY', '/delivery/send-login-otp', '/delivery/verify-otp', { email: 'palakpatel0342@gmail.com' },
  ['/delivery/profile', '/delivery/stats', '/delivery/earnings', '/delivery/cod/summary', '/delivery/wallet/summary', '/delivery/orders']);
await role('ADMIN', '/admin/login-otp', '/admin/verify-login-otp', { email: 'palakpatel0342@gmail.com' },
  ['/admin/profile', '/admin/stats', '/admin/delivery-partners', '/admin/sellers/active', '/admin/sellers/pending']);
