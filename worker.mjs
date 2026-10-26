const json = (data, status = 200) => Response.json(data, {status, headers: {'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const paymentMode = env => String(env.WAYL_ENV ?? 'live').trim();
function catalog(env) {
  return [['pc','Windows — Upload + Converter',env.WAYL_PRICE_PC_IQD ?? '24000'],['android','Android — Upload',env.WAYL_PRICE_ANDROID_IQD ?? '24000']].map(([id,label,value])=>{
    const price = /^\d+$/.test(value || '') ? Number(value) : 0;
    return {id,label,price,available:Boolean(env.WAYL_API_KEY) && Number.isSafeInteger(price) && price > 0};
  });
}
export default {
 async fetch(request, env) {
  const url = new URL(request.url);
  if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
  if (url.pathname === '/api/catalog' && request.method === 'GET') return json({products:catalog(env),currency:'IQD',test:paymentMode(env) !== 'live',keyConfigured:Boolean(env.WAYL_API_KEY),revision:'checkout-connect-3'});
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
        redirectionUrl:url.origin+'/?checkout=return#purchase'})
    });
    if (!response.ok) return json({error:'تعذّر إنشاء رابط الدفع. رمز استجابة البوابة: '+response.status,code:'WAYL_HTTP_'+response.status},502);
    stage = 'wayl_response';
    const data = await response.json();
    stage = 'checkout_url';
    if (!data.data?.url) return json({error:'استجابة بوابة الدفع لم تتضمن رابط الدفع.',code:'WAYL_MISSING_URL'},502);
    const checkout = new URL(data.data.url);
    if (checkout.protocol !== 'https:' || checkout.hostname !== 'checkout.thewayl.com' || checkout.username || checkout.password) return json({error:'رابط دفع غير متوقع. تواصل مع الدعم.'},502);
    return json({url:checkout.href,referenceId});
  } catch (err) {
    const kind = ['TimeoutError','AbortError','TypeError','SyntaxError'].includes(err?.name) ? err.name : 'Error';
    return json({error:'تعذّر تجهيز الدفع. رمز الفحص: '+stage+'/'+kind,code:stage+'/'+kind},502);
  }
 }
};
