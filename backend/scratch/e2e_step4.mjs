const API='http://localhost:7000/api';const OID=process.argv[2];
const j=async r=>{const t=await r.text();try{return JSON.parse(t)}catch{return{raw:t.slice(0,200)}}};
const post=(p,b,H={})=>fetch(API+p,{method:'POST',headers:{'content-type':'application/json',...H},body:JSON.stringify(b)}).then(j);
const get=(p,H={})=>fetch(API+p,{headers:H}).then(j);
const tok=r=>r.result?.token||r.result?.accessToken||r.token;
await post('/seller/login-otp',{email:'palakk2103@gmail.com'});
const SH={authorization:`Bearer ${tok(await post('/seller/verify-login-otp',{email:'palakk2103@gmail.com',otp:'1234'}))}`};
const so=await get('/orders/seller-orders?limit=5',SH);
const arr=so.result?.items||so.result?.orders||[];
const m=arr.find(o=>o.orderId===OID);
console.log('seller-orders seller:',JSON.stringify(m?.seller));
// restore rider location to Kolhapur (original)
await post('/delivery/send-login-otp',{email:'palakpatel0342@gmail.com'});
const DH={authorization:`Bearer ${tok(await post('/delivery/verify-otp',{email:'palakpatel0342@gmail.com',otp:'1234'}))}`};
console.log('rider loc restore:',(await post('/delivery/location',{lat:16.6866552,lng:74.2232764},DH)).message);
