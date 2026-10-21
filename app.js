const purchase=document.getElementById('purchaseDialog');
const image=document.getElementById('imageDialog');
document.getElementById('buy').addEventListener('click',()=>purchase.showModal());
document.getElementById('expand').addEventListener('click',()=>image.showModal());
for(const dialog of [purchase,image]){
 dialog.querySelector('.close').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
}
