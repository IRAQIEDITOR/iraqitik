const purchase=document.getElementById('purchaseDialog');
const image=document.getElementById('imageDialog');
document.getElementById('buy').addEventListener('click',()=>purchase.showModal());
document.getElementById('expand').addEventListener('click',()=>image.showModal());
for(const dialog of [purchase,image]){
 dialog.querySelector('.close').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
}

for (const video of document.querySelectorAll('.video-card video')) {
 const showError = () => {video.parentElement.querySelector('.video-error').hidden = false;};
 video.addEventListener('error', showError);
 video.querySelector('source').addEventListener('error', showError);
 video.addEventListener('play', () => {for (const other of document.querySelectorAll('.video-card video')) if (other !== video) other.pause();});
}
