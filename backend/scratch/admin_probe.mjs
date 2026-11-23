// Admin API probe. Credentials come from env (ADMIN_EMAIL / ADMIN_PW) - never stored in files.
const API = 'http://localhost:7000/api';
const j = async (r) => { const t = await r.text(); try { const o = JSON.parse(t); o.__s = r.status; return o; } catch { return { raw: t.slice(0, 120), __s: r.status }; } };
const login = await fetch(`${API}/admin/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PW }) }).then(j);
const token = login.result?.token || login.result?.accessToken;
console.log('admin login:', login.__s, login.message, token ? '(token ok)' : '(NO TOKEN)');
if (!token) process.exit(1);
const H = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };
for (const p of ['/admin/profile', '/admin/stats', '/admin/users?limit=2', '/admin/sellers', '/admin/sellers/active', '/admin/sellers/pending', '/admin/active-fleet', '/admin/wallet-data', '/admin/finance/summary', '/admin/payments?limit=2', '/admin/seller-withdrawals', '/admin/delivery-cash', '/admin/settings/delivery', '/orders/admin/all', '/settings', '/admin/delivery-partners']) {
  const r = await fetch(`${API}${p}`, { headers: H }).then(j);
  console.log(`  ${r.__s} GET ${p} ${r.__s >= 400 ? '-> ' + (r.message || r.raw) : ''}`);
}
// delivery settings: blockedCities round trip (read, set to [pune, nagpur], read, restore)
const cur = await fetch(`${API}/admin/settings/delivery`, { headers: H }).then(j);
const dc = cur.result?.deliveryConfig || cur.result?.settings?.deliveryConfig || cur.result?.delivery?.deliveryConfig;
console.log('current express.blockedCities:', JSON.stringify(dc?.express?.blockedCities), '| keys:', Object.keys(cur.result || {}).join(','));
// no-op save with the same list: proves the field passes validation + persists
const put = await fetch(`${API}/admin/settings/delivery`, { method: 'PUT', headers: H, body: JSON.stringify({ deliveryConfig: { express: { blockedCities: dc?.express?.blockedCities || ['pune'] } } }) }).then(j);
console.log('PUT blockedCities (unchanged):', put.__s, put.message);
const again = await fetch(`${API}/admin/settings/delivery`, { headers: H }).then(j);
console.log('after save:', JSON.stringify(again.result?.deliveryConfig?.express));
const st = await fetch(`${API}/settings`).then(j);
console.log('public settings address:', JSON.stringify(st.result?.address), '| contactAddress:', JSON.stringify(st.result?.contactAddress));
// slots: Kolhapur outlet offers express, Pune hides it
for (const [n, loc] of Object.entries({ Kolhapur: { lat: 16.6986, lng: 74.2421 }, Pune: { lat: 18.559, lng: 73.7868 } })) {
  const r = await fetch(`${API}/orders/delivery/slots?lat=${loc.lat}&lng=${loc.lng}`).then(j);
  const opts = r.result?.options || r.result?.deliveryOptions || r.result;
  const ex = (Array.isArray(opts) ? opts : Object.values(opts || {})).find?.((o) => o?.method === 'EXPRESS');
  console.log(n, 'slots', r.__s, 'express:', ex ? `available=${ex.available} hidden=${ex.hidden}` : JSON.stringify(r).slice(0, 160));
}
