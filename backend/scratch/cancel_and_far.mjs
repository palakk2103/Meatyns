const API = 'http://localhost:7000/api';
const j = async (r) => { const t = await r.text(); try { return JSON.parse(t); } catch { return { raw: t }; } };
const ver = await j(await fetch(`${API}/customer/verify-otp`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ phone: '8770620342', otp: '1234' }) }));
const token = ver.result?.token || ver.result?.accessToken;
const H = { 'content-type': 'application/json', authorization: `Bearer ${token}` };
for (const id of process.argv.slice(2)) {
  const r = await j(await fetch(`${API}/orders/cancel/${id}`, { method: 'PUT', headers: H, body: JSON.stringify({ reason: 'API test order - cancelled' }) }));
  console.log('cancel', id, '->', r.message);
}
// outside-radius checks (read-only)
const far = { 'Pune-side far point (Mumbai)': { lat: 19.076, lng: 72.8777 }, 'Kolhapur far (Ichalkaranji 20km)': { lat: 16.69, lng: 74.46 }, 'Kolhapur 10km north': { lat: 16.79, lng: 74.24 } };
for (const [n, p] of Object.entries(far)) {
  const r = await j(await fetch(`${API}/products?lat=${p.lat}&lng=${p.lng}&limit=5`));
  const items = r.result?.items || r.results || [];
  console.log('far', n, '-> products:', items.length, r.message || '');
}
