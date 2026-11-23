// ONLINE (Razorpay TEST mode) flow: create order -> create razorpay order -> bad signature rejected -> valid signature captured.
import 'dotenv/config';
import crypto from 'crypto';
const API = 'http://localhost:7000/api';
const j = async (r) => { const t = await r.text(); try { return JSON.parse(t); } catch { return { raw: t }; } };
const ver = await j(await fetch(`${API}/customer/verify-otp`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ phone: '8770620342', otp: '1234' }) }));
const token = ver.result?.token || ver.result?.accessToken;
const H = { 'content-type': 'application/json', authorization: `Bearer ${token}` };
const loc = { lat: 16.7005, lng: 74.2445 }; // Rajarampuri area
const list = await j(await fetch(`${API}/products?lat=${loc.lat}&lng=${loc.lng}&limit=50`));
const items = list.result?.items || [];
const prod = items[0];
const body = {
  items: [{ productId: String(prod._id), variantSku: prod.variants?.[0]?.sku, quantity: 1 }],
  address: { type: 'Home', name: 'API Test', address: 'Online pay test, Rajarampuri, Kolhapur', city: 'Kolhapur', phone: '8770620342', location: loc },
  paymentMode: 'ONLINE', deliveryMethod: 'NORMAL', timeSlot: 'now',
};
const ids = [];
async function newOnlineOrder() {
  const r = await j(await fetch(`${API}/orders`, { method: 'POST', headers: H, body: JSON.stringify(body) }));
  const o = r.result?.order;
  console.log('place ONLINE order:', r.message, o?.orderId, 'status', o?.orderStatus || o?.status, 'payStatus', o?.paymentStatus);
  ids.push(o?.orderId);
  const rp = await j(await fetch(`${API}/payments/razorpay/create-order`, { method: 'POST', headers: H, body: JSON.stringify({ orderRef: o.orderId }) }));
  console.log('razorpay create-order:', rp.message, 'rzpOrder', rp.result?.orderId, 'amount', rp.result?.amount, 'key', String(rp.result?.key || '').slice(0, 9));
  return { o, rzpOrderId: rp.result?.orderId };
}
const sign = (oid, pid) => crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(`${oid}|${pid}`).digest('hex');

// A) tampered signature must be rejected
const a = await newOnlineOrder();
const bad = await j(await fetch(`${API}/payments/razorpay/verify`, { method: 'POST', headers: H, body: JSON.stringify({ razorpay_order_id: a.rzpOrderId, razorpay_payment_id: 'pay_TESTFAKE0001', razorpay_signature: 'deadbeef' }) }));
console.log('A) bad signature ->', bad.message);
// B) valid signature must be accepted (simulated successful payment callback)
const b = await newOnlineOrder();
const pid = 'pay_TESTSIM' + Date.now();
const good = await j(await fetch(`${API}/payments/razorpay/verify`, { method: 'POST', headers: H, body: JSON.stringify({ razorpay_order_id: b.rzpOrderId, razorpay_payment_id: pid, razorpay_signature: sign(b.rzpOrderId, pid) }) }));
console.log('B) valid signature ->', good.message, good.result?.status || '');
console.log('orders:', ids.join(' '));
