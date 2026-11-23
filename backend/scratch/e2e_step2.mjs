const API = 'http://localhost:7000/api';
const OID = process.argv[2];
const j = async (r) => { const t = await r.text(); try { return JSON.parse(t); } catch { return { raw: t.slice(0,200) }; } };
const post = (p, b, H={}) => fetch(API+p,{method:'POST',headers:{'content-type':'application/json',...H},body:JSON.stringify(b)}).then(j);
const put = (p, b, H={}) => fetch(API+p,{method:'PUT',headers:{'content-type':'application/json',...H},body:JSON.stringify(b||{})}).then(j);
const get = (p, H={}) => fetch(API+p,{headers:H}).then(j);
const tok = (r)=> r.result?.token || r.result?.accessToken || r.token;
const show = (label,o)=>console.log(label, JSON.stringify(o));
const view = (o)=>({ seller:{shopName:o.seller?.shopName,address:o.seller?.address,locality:o.seller?.locality,city:o.seller?.city,coords:o.seller?.location?.coordinates}, customerAddr:o.address });

await post('/customer/send-login-otp',{phone:'8770620342'});
const CH = { authorization:`Bearer ${tok(await post('/customer/verify-otp',{phone:'8770620342',otp:'1234'}))}` };
const cd = await get(`/orders/details/${OID}`, CH);
show('CUSTOMER details:', view(cd.result||{}));

// seller
await post('/seller/login-otp',{email:'palakk2103@gmail.com'});
const sv = await post('/seller/verify-login-otp',{email:'palakk2103@gmail.com',otp:'1234'});
const SH = { authorization:`Bearer ${tok(sv)}` };
console.log('seller login', !!tok(sv), sv.message);
const so = await get('/orders/seller-orders?limit=5', SH);
const arr = so.result?.items || so.result?.orders || so.result || [];
const mine = (Array.isArray(arr)?arr:[]).find(o=>o.orderId===OID);
show('SELLER list row:', mine ? { customer:mine.customer?.name, address:mine.address, seller:mine.seller } : so.message||'not found');
const sd = await get(`/orders/details/${OID}`, SH);
show('SELLER details:', view(sd.result||{}));
const acc = await put(`/orders/status/${OID}`, {status:'confirmed'}, SH);
console.log('seller accept:', acc.message);
