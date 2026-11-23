const API='http://localhost:7000/api';
const j=async r=>{const t=await r.text();try{return JSON.parse(t)}catch{return{raw:t.slice(0,200)}}};
const v=await j(await fetch(`${API}/customer/verify-otp`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({phone:'8770620342',otp:'1234'})}));
const H={'content-type':'application/json',authorization:`Bearer ${v.result.token||v.result.accessToken}`};
const c=(await j(await fetch(`${API}/products?lat=16.6986&lng=74.2421&limit=3`))).result.items[0];
const body={items:[{productId:String(c._id),variantSku:c.variants?.[0]?.sku,quantity:1}],address:{type:'Home',name:'API Test',address:'idempotency test, Kolhapur',city:'Kolhapur',phone:'8770620342',location:{lat:16.6986,lng:74.2421}},paymentMode:'COD',deliveryMethod:'NORMAL',timeSlot:'now'};
const key=crypto.randomUUID();
const r1=await j(await fetch(`${API}/orders`,{method:'POST',headers:{...H,'idempotency-key':key},body:JSON.stringify(body)}));
console.log('1st order with Idempotency-Key (Redis off):',r1.message,r1.result?.order?.orderId);
const r2=await j(await fetch(`${API}/orders`,{method:'POST',headers:{...H,'idempotency-key':key},body:JSON.stringify(body)}));
console.log('2nd same key (must NOT create a second order):',r2.message,r2.result?.order?.orderId);
console.log('same order id:',r1.result?.order?.orderId===r2.result?.order?.orderId);
const id=r1.result?.order?.orderId;
for (const o of [id,'ORD-01M83F52P34RKWHA2PZ0A7HJ7E']) { const r=await j(await fetch(`${API}/orders/cancel/${o}`,{method:'PUT',headers:H,body:JSON.stringify({reason:'API test cleanup'})})); console.log('cancel',o,'->',r.message); }
