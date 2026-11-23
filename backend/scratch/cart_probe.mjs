const API='http://localhost:7000/api';
const j=async r=>{const t=await r.text();try{return JSON.parse(t)}catch{return{raw:t.slice(0,200),status:r.status}}};
const ver=await j(await fetch(`${API}/customer/verify-otp`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({phone:'8770620342',otp:'1234'})}));
const token=ver.result?.token||ver.result?.accessToken; console.log('login',ver.message);
const H={'content-type':'application/json',authorization:`Bearer ${token}`};
const cat=async(l)=>(await j(await fetch(`${API}/products?lat=${l.lat}&lng=${l.lng}&limit=50`))).result?.items||[];
const K={lat:16.6975,lng:74.2380}, P={lat:18.559,lng:73.7868};
const k=await cat(K), p=await cat(P);
console.log('kolhapur products',k.length,'pune products',p.length);
console.log('seller K',k[0]?.sellerId?._id||k[0]?.sellerId,'seller P',p[0]?.sellerId?._id||p[0]?.sellerId);
await fetch(`${API}/cart/clear`,{method:'DELETE',headers:H});
for (const prod of [k[0],p[0]]) { if(!prod) continue; const r=await j(await fetch(`${API}/cart/add`,{method:'POST',headers:H,body:JSON.stringify({productId:prod._id,variantSku:'',quantity:1})})); console.log('add',prod.name,'->',r.message); }
const s=await j(await fetch(`${API}/cart/serviceability?lat=${K.lat}&lng=${K.lng}`,{headers:H}));
console.log('serviceability',JSON.stringify(s.result).slice(0,500));
await fetch(`${API}/cart/clear`,{method:'DELETE',headers:H});
