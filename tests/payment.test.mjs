import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker.mjs';
const env={WAYL_ENV:'test',WAYL_API_KEY:'test-secret-not-real',WAYL_PRICE_PC_IQD:'15000',WAYL_PRICE_ANDROID_IQD:'12000'};
function request(body,origin='https://example.com'){return new Request('https://example.com/api/checkout',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)});}
test('catalog never exposes key and starts in test mode',async()=>{
 const r=await worker.fetch(new Request('https://example.com/api/catalog'),env);const t=await r.text();assert(!t.includes(env.WAYL_API_KEY));assert.equal(JSON.parse(t).test,true);
});
test('missing configuration blocks checkout',async()=>assert.equal((await worker.fetch(request({product:'pc',expectedPrice:15000}),{})).status,503));
test('foreign origin cannot create link',async()=>assert.equal((await worker.fetch(request({product:'pc',expectedPrice:15000},'https://evil.test'),env)).status,403));
test('tampered price rejected',async()=>assert.equal((await worker.fetch(request({product:'pc',expectedPrice:1}),env)).status,409));
test('checkout uses server amount and does not expose credentials',async()=>{
 const old=globalThis.fetch;let sent;
 globalThis.fetch=async(url,options)=>{assert.equal(url,'https://api.thewayl.com/api/v1/links');sent=JSON.parse(options.body);return Response.json({data:{url:'https://checkout.thewayl.com/pay/test'}});};
 try{const r=await worker.fetch(request({product:'pc',expectedPrice:15000,total:1}),env);assert.equal(r.status,200);assert.equal(sent.total,15000);assert.equal(sent.env,'test');assert.equal(sent.currency,'IQD');assert(!(await r.text()).includes(env.WAYL_API_KEY));}finally{globalThis.fetch=old;}
});
test('upstream failure returns generic error',async()=>{
 const old=globalThis.fetch;globalThis.fetch=async()=>new Response('private upstream details',{status:401});
 try{const r=await worker.fetch(request({product:'pc',expectedPrice:15000}),env);assert.equal(r.status,502);assert(!(await r.text()).includes('private upstream'));}finally{globalThis.fetch=old;}
});
