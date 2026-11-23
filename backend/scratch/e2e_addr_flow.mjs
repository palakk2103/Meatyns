const API = 'http://localhost:7000/api';
const j = async (r) => { const t = await r.text(); try { return JSON.parse(t); } catch { return { raw: t.slice(0,200) }; } };
const post = (p, b, H={}) => fetch(API+p,{method:'POST',headers:{'content-type':'application/json',...H},body:JSON.stringify(b)}).then(j);
const put = (p, b, H={}) => fetch(API+p,{method:'PUT',headers:{'content-type':'application/json',...H},body:JSON.stringify(b||{})}).then(j);
const get = (p, H={}) => fetch(API+p,{headers:H}).then(j);
const tok = (r)=> r.result?.token || r.result?.accessToken || r.token;

// customer
await post('/customer/send-login-otp',{phone:'8770620342'});
const cv = await post('/customer/verify-otp',{phone:'8770620342',otp:'1234'});
const CH = { authorization:`Bearer ${tok(cv)}` };
console.log('customer login', !!tok(cv));

// location ~200m NE of the Indore test seller
const sLat=22.717593, sLng=75.871889;
const loc = { lat: sLat+200/111320, lng: sLng+200/(111320*Math.cos(sLat*Math.PI/180)) };
const list = await get(`/products?lat=${loc.lat}&lng=${loc.lng}&limit=20`);
const items = list.result?.items || list.results || [];
console.log('products near seller:', items.length, [...new Set(items.map(p=>String(p.sellerId?._id||p.sellerId)))]);
const prod = items[0]; if(!prod){console.log('no product'); process.exit(1);}
const body = {
  items:[{productId:String(prod._id), variantSku: prod.variants?.[0]?.sku, quantity:1}],
  address:{ type:'Home', name:'E2E Test', address:'Flat 204, Sai Residency, RNT Marg, South Tukoganj, Indore, Madhya Pradesh 452001, India', landmark:'Near Central Mall', city:'Indore, Madhya Pradesh, 452001', phone:'8770620342', location: loc },
  paymentMode:'COD', deliveryMethod:'NORMAL', timeSlot:'now',
};
const ord = await post('/orders', body, CH);
const od = ord.result?.order;
console.log('ORDER', od?.orderId, ord.message, 'seller', od?.seller?._id||od?.seller);
process.stdout.write(JSON.stringify({orderId:od?.orderId})+'\n');
