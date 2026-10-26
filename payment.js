const checkoutDialog=document.createElement('dialog');
checkoutDialog.id='checkoutDialog';
checkoutDialog.innerHTML=`<button class="checkout-close" aria-label="إغلاق">×</button><p class="eyebrow">IRAQI TIK</p><h2>اختر نسختك</h2><p>اشتراك دائم · دفعة واحدة</p><div class="checkout-products"></div><p class="checkout-message" role="status" aria-live="polite"></p><p class="checkout-small">الدفع عبر صفحة Wayl الآمنة. بعد الدفع تواصل معنا بمرجع الطلب لتفعيل حسابك؛ التفعيل ليس تلقائيًا.</p><a class="textlink" href="https://t.me/Design_AfterEffects" target="_blank" rel="noopener">تواصل عبر تليجرام ↗</a>`;
document.body.append(checkoutDialog);
const message=checkoutDialog.querySelector('.checkout-message');
let busy=false;
checkoutDialog.querySelector('.checkout-close').onclick=()=>checkoutDialog.close();
async function openCheckout(selected){
 checkoutDialog.showModal();message.textContent='جارٍ تحميل الأسعار…';
 const list=checkoutDialog.querySelector('.checkout-products');list.replaceChildren();
 try{
  const response=await fetch('/api/catalog',{cache:'no-store'});if(!response.ok)throw Error();
  const data=await response.json();
  message.textContent=data.test?'وضع تجريبي: الدفع الحقيقي غير مفعّل.':'';
  for(const p of data.products){
   if(selected && p.id!==selected)continue;
   const button=document.createElement('button');button.className='primary full';
   button.textContent=p.label+' — '+(p.available?new Intl.NumberFormat('ar-IQ').format(p.price)+' د.ع':'الدفع غير متاح بعد');
   button.disabled=!p.available;
   button.onclick=async()=>{
    if(busy)return;busy=true;list.querySelectorAll('button').forEach(b=>b.disabled=true);message.textContent='جارٍ فتح الدفع…';
    try{
     const res=await fetch('/api/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({product:p.id,expectedPrice:p.price})});
     const result=await res.json();if(!res.ok)throw Error(result.error || 'تعذّر فتح الدفع.');
     try{sessionStorage.setItem('iraqi-tik-order',result.referenceId);}catch{}
     window.location.assign(result.url);
    }catch(err){message.textContent=err.message || 'تعذّر الاتصال. تواصل عبر تليجرام.';busy=false;list.querySelectorAll('button').forEach(b=>b.disabled=false);}
   };
   list.append(button);
  }
 }catch{message.textContent='الدفع الإلكتروني غير جاهز حاليًا. يمكنك إتمام الشراء عبر تليجرام.';}
}
for(const link of document.querySelectorAll('a[href="https://t.me/Design_AfterEffects"]')){
 if(!/اشترِ|شراء/.test(link.textContent))continue;
 link.addEventListener('click',e=>{e.preventDefault();if(!busy)openCheckout(link.closest('.android-card')?'android':link.id==='buy'?'pc':null);});
}
if(new URLSearchParams(location.search).get('checkout')==='return'){
 checkoutDialog.showModal();
 let ref='';try{ref=sessionStorage.getItem('iraqi-tik-order')||'';}catch{}
 message.textContent='رجعت من صفحة الدفع. الرجوع وحده لا يؤكد نجاح العملية. تواصل معنا للتحقق والتفعيل.'+(ref?' مرجع طلبك: '+ref:'');
}
