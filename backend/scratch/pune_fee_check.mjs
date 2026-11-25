const API='http://localhost:7000/api';
const j=async r=>{const t=await r.text();try{return JSON.parse(t)}catch{return{raw:t.slice(0,200)}}};
const v=await j(await fetch(`${API}/customer/verify-otp`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({phone:'8770620342',otp:'1234'})}));
const H={'content-type':'application/json',authorization:`Bearer ${v.result.token||v.result.accessToken}`};
const O={lat:18.5523134,lng:73.7931966};
const off=(m)=>({lat:O.lat+m/111320,lng:O.lng});
const prod=(await j(await fetch(`${API}/products?lat=${O.lat}&lng=${O.lng}&limit=3`))).result.items[0];
console.log('product',prod?.name);
for(const m of [500,1900,2000,2100,2900,3100,3900,4100,4900,5200,5900,6100,6900,7100,7900,8100,9000]){
  const r=await j(await fetch(`${API}/orders/checkout/preview`,{method:'POST',headers:H,body:JSON.stringify({items:[{productId:String(prod._id),variantSku:prod.variants?.[0]?.sku,quantity:1}],address:{name:'t',address:'t',city:'Pune',phone:'8770620342',location:off(m)},paymentMode:'COD',deliveryMethod:'NORMAL'})}));
  const b=r.result?.breakdown; const d=b?.snapshots?.deliveryFeeBreakdown;
  console.log(`${(m/1000).toFixed(1)}km -> fee=${b?b.deliveryFeeCharged:r.message} slab=${d?.citySlab?JSON.stringify(d.citySlab):'none'} dist=${d?.distanceKmActual}`);
}
