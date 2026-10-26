const json = (data, status = 200) => Response.json(data, {status, headers: {'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const paymentMode = env => String(env.WAYL_ENV ?? 'live').trim();
async function webhookSecret(env) {
  if (env.WAYL_WEBHOOK_SECRET) return env.WAYL_WEBHOOK_SECRET;
  const bytes = await crypto.subtle.digest('SHA-256',new TextEncoder().encode('iraqi-tik/webhook/v1:'+env.WAYL_API_KEY));
  return Array.from(new Uint8Array(bytes), b=>b.toString(16).padStart(2,'0')).join('');
}
async function receiveWebhook(request, env) {
  if (request.method !== 'POST') return json({error:'Method not allowed'},405);
  if (!env.WAYL_API_KEY) return json({error:'Unavailable'},503);
  const raw = await request.text();
  if (raw.length > 65536) return json({error:'Too large'},413);
  const signature=(request.headers.get('x-wayl-signature-256') || '').replace(/^sha256=/,'');
  if (!/^[a-fA-F0-9]{64}$/.test(signature)) return json({error:'Invalid signature'},401);
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(await webhookSecret(env)),{name:'HMAC',hash:'SHA-256'},false,['verify']);
  const bytes=Uint8Array.from(signature.match(/.{2}/g),x=>parseInt(x,16));
  const valid=await crypto.subtle.verify('HMAC',key,bytes,new TextEncoder().encode(raw));
  if (!valid) return json({error:'Invalid signature'},401);
  // Acknowledge authenticated notifications only. Account activation remains manual.
  return new Response(null,{status:204,headers:{'Cache-Control':'no-store'}});
}
function catalog(env) {
  return [['pc','بيسي','22725'],['android','هاتف','22725']].map(([id,label,value])=>{
    const price = /^\d+$/.test(value || '') ? Number(value) : 0;
    return {id,label,price,available:Boolean(env.WAYL_API_KEY) && Number.isSafeInteger(price) && price > 0};
  });
}
export default {
 async fetch(request, env) {
  const url = new URL(request.url);
  if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
  if (url.pathname === '/api/catalog' && request.method === 'GET') return json({products:catalog(env),currency:'IQD',test:paymentMode(env) !== 'live',keyConfigured:Boolean(env.WAYL_API_KEY),revision:'checkout-price-22725-usd'});
  if (url.pathname === '/api/wayl/webhook') return receiveWebhook(request,env);
  if (url.pathname !== '/api/checkout') return json({error:'Not found'},404);
  if (request.method !== 'POST') return json({error:'Method not allowed'},405);
  if (request.headers.get('Origin') !== url.origin) return json({error:'Forbidden'},403);
  if (!request.headers.get('Content-Type')?.startsWith('application/json')) return json({error:'Expected JSON'},415);
  let stage = 'request';
  try {
    const text = await request.text();
    if (text.length > 1024) return json({error:'Request too large'},413);
    const body = JSON.parse(text);
    const product = catalog(env).find(p=>p.id === body.product);
    if (!product) return json({error:'اختر نسخة صحيحة.'},400);
    if (!product.available) return json({error:'الدفع لهذه النسخة لم يُفعّل بعد. تواصل معنا عبر تليجرام.'},503);
    if (body.expectedPrice !== product.price) return json({error:'تغيّر السعر. أغلق النافذة وافتحها مجددًا لتأكيد السعر.'},409);
    const referenceId = 'iraqi-tik-' + product.id + '-' + crypto.randomUUID();
    stage = 'wayl_connect';
    const response = await fetch('https://api.thewayl.com/api/v1/links', {
      method:'POST',redirect:'manual',signal:AbortSignal.timeout(20000),
      headers:{'Content-Type':'application/json','X-WAYL-AUTHENTICATION':env.WAYL_API_KEY},
      body:JSON.stringify({env:paymentMode(env) === 'live' ? 'live':'test',referenceId,total:product.price,currency:'IQD',
        lineItem:[{label:'IRAQI TIK '+product.label+' — Lifetime',amount:product.price,type:'increase'}],
        webhookUrl:url.origin+'/api/wayl/webhook',webhookSecret:await webhookSecret(env),
        redirectionUrl:url.origin+'/?checkout=return#purchase'})
    });
    if (!response.ok) {
      const errorText = await response.text();
      const fields = ['env','referenceId','total','currency','lineItem','customParameter','webhookUrl','webhookSecret','redirectionUrl'].filter(field=>errorText.includes(field));
      return json({error:'تعذّر إنشاء رابط الدفع. رمز استجابة البوابة: '+response.status+(fields.length?' — '+fields.join(', '):''),code:'WAYL_HTTP_'+response.status,fields},502);
    }
    stage = 'wayl_response';
    const data = await response.json();
    stage = 'checkout_url';
    if (!data.data?.url) return json({error:'استجابة بوابة الدفع لم تتضمن رابط الدفع.',code:'WAYL_MISSING_URL'},502);
    const checkout = new URL(data.data.url);
    if (checkout.protocol !== 'https:' || checkout.hostname !== 'checkout.thewayl.com' || checkout.username || checkout.password) return json({error:'رابط دفع غير متوقع. تواصل مع الدعم.'},502);
    checkout.searchParams.set('currency','usd');
    return json({url:checkout.href,referenceId});
  } catch (err) {
    const kind = ['TimeoutError','AbortError','TypeError','SyntaxError'].includes(err?.name) ? err.name : 'Error';
    return json({error:'تعذّر تجهيز الدفع. رمز الفحص: '+stage+'/'+kind,code:stage+'/'+kind},502);
  }
 }
};
