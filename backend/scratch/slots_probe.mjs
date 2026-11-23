const API='http://localhost:7000/api';
const j=async r=>{const t=await r.text();try{return JSON.parse(t)}catch{return{raw:t.slice(0,200)}}};
for (const [n,loc] of Object.entries({Kolhapur:{lat:16.6986,lng:74.2421},Pune:{lat:18.559,lng:73.7868}})) {
  const cat=(await j(await fetch(`${API}/products?lat=${loc.lat}&lng=${loc.lng}&limit=3`))).result?.items||[];
  const r=await j(await fetch(`${API}/orders/delivery/slots`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({address:{location:loc,city:n},items:[{productId:String(cat[0]._id),quantity:1}]})}));
  const o=r.result; const list=o?.options||o?.deliveryOptions||o?.methods||o;
  const arr=Array.isArray(list)?list:Object.values(list||{});
  console.log(n, r.message, arr.filter(x=>x&&x.method).map(x=>`${x.method}:avail=${x.available},hidden=${x.hidden}`).join(' | ')||JSON.stringify(r).slice(0,300));
}
