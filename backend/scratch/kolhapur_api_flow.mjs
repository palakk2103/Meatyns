// Live API flow against local server (port 7000). PLACE=1 actually places COD orders as the test customer.
const API = 'http://localhost:7000/api';
const PLACE = process.env.PLACE === '1';
const PHONE = '8770620342', OTP = '1234';
const j = async (r) => { const t = await r.text(); try { return JSON.parse(t); } catch { return { raw: t }; } };

const outlets = [
  { name: 'Hockey Stadium', email: 'kolhapur1@meatyns.com', lat: 16.6778078, lng: 74.228211 },
  { name: 'Line Bazar',     email: 'kolhapur2@meatyns.com', lat: 16.7270439, lng: 74.2444904 },
  { name: 'New Vashi Naka', email: 'kolhapur3@meatyns.com', lat: 16.7,       lng: 74.265 },
  { name: 'Phulewadi',      email: 'kolhapur4@meatyns.com', lat: 16.69,      lng: 74.24 },
  { name: 'Rajarampuri',    email: 'kolhapur5@meatyns.com', lat: 16.6986,    lng: 74.2421189 },
];
const off = (o, dN, dE) => ({ lat: o.lat + dN / 111320, lng: o.lng + dE / (111320 * Math.cos(o.lat * Math.PI / 180)) });

const send = await j(await fetch(`${API}/customer/send-login-otp`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ phone: PHONE }) }));
console.log('send-otp:', send.message);
const ver = await j(await fetch(`${API}/customer/verify-otp`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ phone: PHONE, otp: OTP }) }));
const token = ver.result?.token || ver.result?.accessToken || ver.token;
console.log('login:', ver.message, token ? 'token ok' : JSON.stringify(ver).slice(0, 300));
if (!token) process.exit(1);
const H = { 'content-type': 'application/json', authorization: `Bearer ${token}` };

// resolve each outlet's seller id by probing at the outlet itself
const sellerIdOf = {};
for (const o of outlets) {
  const r = await j(await fetch(`${API}/products?lat=${o.lat}&lng=${o.lng}&limit=50`));
  const items = r.result?.items || r.results || [];
  const ids = [...new Set(items.map((p) => String(p.sellerId?._id || p.sellerId)))];
  sellerIdOf[o.email] = ids[0];
  console.log(`probe ${o.name}: ${items.length} products, sellers=${ids.length}`);
}
const nameBySeller = Object.fromEntries(outlets.map((o) => [sellerIdOf[o.email], o.name]));

let pass = 0, fail = 0;
const placed = [];
for (const o of outlets) {
  // a customer ~300m from this outlet (N-E), i.e. it should be this outlet's own area
  const c = off(o, 200, 200);
  const list = await j(await fetch(`${API}/products?lat=${c.lat}&lng=${c.lng}&limit=50`));
  const items = list.result?.items || list.results || [];
  const sellers = [...new Set(items.map((p) => String(p.sellerId?._id || p.sellerId)))];
  const prod = items[0];
  const variant = prod?.variants?.[0];
  const body = {
    items: [{ productId: String(prod._id), variantSku: variant?.sku, quantity: 1 }],
    address: { type: 'Home', name: 'API Test', address: `Test near ${o.name}, Kolhapur`, city: 'Kolhapur', phone: PHONE, location: c },
    paymentMode: 'COD', deliveryMethod: 'NORMAL', timeSlot: 'now',
  };
  const pv = await j(await fetch(`${API}/orders/checkout/preview`, { method: 'POST', headers: H, body: JSON.stringify(body) }));
  const pvSeller = pv.result?.sellerBreakdowns?.[0]?.sellerId;
  let orderInfo = '';
  let orderSeller = null;
  if (PLACE) {
    const ord = await j(await fetch(`${API}/orders`, { method: 'POST', headers: H, body: JSON.stringify(body) }));
    const od = ord.result?.order;
    orderSeller = String(od?.seller?._id || od?.seller || '');
    orderInfo = ` | ORDER ${od?.orderId || ord.message} seller=${nameBySeller[orderSeller] || orderSeller} total=${od?.pricing?.total ?? od?.totalAmount ?? ''}`;
    if (od) placed.push(od.orderId);
  }
  const expected = sellerIdOf[o.email];
  const ok = sellers.length === 1 && sellers[0] === expected && String(pvSeller) === expected && (!PLACE || orderSeller === expected);
  ok ? pass++ : fail++;
  console.log(`${ok ? 'OK  ' : 'FAIL'} customer near ${o.name} -> catalog seller=${nameBySeller[sellers[0]] || sellers.join(',')} (${sellers.length}) | preview seller=${nameBySeller[String(pvSeller)] || pv.message}${orderInfo}`);
}
console.log({ pass, fail, placed });
