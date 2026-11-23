const API='http://localhost:7000/api';
const j=async r=>{const t=await r.text();try{return JSON.parse(t)}catch{return{raw:t.slice(0,200)}}};
const a=await j(await fetch(`${API}/admin/login`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:process.env.ADMIN_EMAIL,password:process.env.ADMIN_PW})}));
const S=(await j(await fetch(`${API}/admin/settings/delivery`,{headers:{authorization:`Bearer ${a.result.token||a.result.accessToken}`}}))).result;
console.log('mode',S.deliveryPricingMode,'| express',JSON.stringify(S.deliveryConfig.express));
console.log('slabs',JSON.stringify(S.cityDeliverySlabs));
const v=await j(await fetch(`${API}/customer/verify-otp`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({phone:'8770620342',otp:'1234'})}));
const H={'content-type':'application/json',authorization:`Bearer ${v.result.token||v.result.accessToken}`};
const O={name:'Rajarampuri',lat:16.6986,lng:74.2421189};
const off=(m)=>({lat:O.lat+m/111320,lng:O.lng});
const prod=(await j(await fetch(`${API}/products?lat=${O.lat}&lng=${O.lng}&limit=3`))).result.items[0];
for(const m of [300,900,1500,2500,3500,4500,6000,7500]){
  const loc=off(m); const row=[];
  for(const method of ['NORMAL','EXPRESS']){
    const r=await j(await fetch(`${API}/orders/checkout/preview`,{method:'POST',headers:H,body:JSON.stringify({items:[{productId:String(prod._id),variantSku:prod.variants?.[0]?.sku,quantity:1}],address:{name:'t',address:'t',city:'Kolhapur',phone:'8770620342',location:loc},paymentMode:'COD',deliveryMethod:method})}));
    const b=r.result?.breakdown; row.push(`${method}=${b?b.deliveryFeeCharged:r.message}`);
  }
  console.log(`${(m/1000).toFixed(1)}km (${m}m N of ${O.name}): ${row.join('  ')}`);
}
