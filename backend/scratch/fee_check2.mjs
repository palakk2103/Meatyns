const API='http://localhost:7000/api';
const j=async r=>{const t=await r.text();try{return JSON.parse(t)}catch{return{raw:t.slice(0,200)}}};
const v=await j(await fetch(`${API}/customer/verify-otp`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({phone:'8770620342',otp:'1234'})}));
const H={'content-type':'application/json',authorization:`Bearer ${v.result.token||v.result.accessToken}`};
const slab=(km)=>km<=1?30:km<=3?45:km<=5?70:km<=7?105:km<=8?150:null;
// points south/west of Hockey Stadium (outermost outlet) so no other outlet is nearer
const O={lat:16.6778078,lng:74.228211};
let bad=0;
for(const m of [300,900,1100,2000,2900,3200,4500,5500,6500,7500,7900]){
  const loc={lat:O.lat-m/111320,lng:O.lng};
  const items=(await j(await fetch(`${API}/products?lat=${loc.lat}&lng=${loc.lng}&limit=3`))).result.items;
  if(!items.length){console.log(m,'m: not serviceable (no products)');continue}
  const p=items[0]; const row=[]; let km;
  for(const method of ['NORMAL','EXPRESS']){
    const r=await j(await fetch(`${API}/orders/checkout/preview`,{method:'POST',headers:H,body:JSON.stringify({items:[{productId:String(p._id),variantSku:p.variants?.[0]?.sku,quantity:1}],address:{name:'t',address:'t',city:'Kolhapur',phone:'8770620342',location:loc},paymentMode:'COD',deliveryMethod:method})}));
    const b=r.result?.breakdown; km=r.result?.sellerBreakdowns?.[0]?.distanceKm;
    const exp=slab(km); const want=method==='EXPRESS'?exp*2:exp;
    const ok=b&&b.deliveryFeeCharged===want; if(!ok)bad++;
    row.push(`${method}=${b?b.deliveryFeeCharged:r.message} (expected ${want}) ${ok?'OK':'MISMATCH'}`);
  }
  console.log(`${km}km: ${row.join(' | ')}`);
}
console.log('mismatches:',bad);
