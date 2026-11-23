const API='http://localhost:7000/api';
const j=async r=>{const t=await r.text();try{return JSON.parse(t)}catch{return{raw:t}}};
const l=await j(await fetch(`${API}/admin/login`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:process.env.ADMIN_EMAIL,password:process.env.ADMIN_PW})}));
const H={authorization:`Bearer ${l.result.token||l.result.accessToken}`,'content-type':'application/json'};
const set=async(arr)=>{const r=await j(await fetch(`${API}/admin/settings/delivery`,{method:'PUT',headers:H,body:JSON.stringify({deliveryConfig:{express:{blockedCities:arr}}})}));return r.message};
const pune=async()=>{const loc={lat:18.559,lng:73.7868};const c=(await j(await fetch(`${API}/products?lat=${loc.lat}&lng=${loc.lng}&limit=2`))).result.items;const r=await j(await fetch(`${API}/orders/delivery/slots`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({address:{location:loc,city:'Pune'},items:[{productId:String(c[0]._id),quantity:1}]})}));const o=r.result;const list=o?.options||o?.deliveryOptions||o?.methods||o;const e=(Array.isArray(list)?list:Object.values(list||{})).find(x=>x&&x.method==='EXPRESS');return e?`avail=${e.available} hidden=${e.hidden}`:'?'};
try{
  console.log('set []   ->',await set([]),'| Pune express:',await pune());
}finally{
  console.log('restore  ->',await set(['pune']),'| Pune express:',await pune());
}
