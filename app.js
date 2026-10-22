const image=document.getElementById('imageDialog');
document.getElementById('expand').addEventListener('click',()=>image.showModal());
for(const dialog of [image]){
 dialog.querySelector('.close').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
}

for (const card of document.querySelectorAll('.video-card')) {
 const video=card.querySelector('video'), button=card.querySelector('.video-play');
 const error=card.querySelector('.video-error');
 const title=video.getAttribute('aria-label');
 const reflect=()=>{
  const playing=!video.paused;
  button.classList.toggle('is-playing',playing);
  button.setAttribute('aria-pressed',String(playing));
  button.setAttribute('aria-label',(playing?'إيقاف ':'تشغيل ')+title);
  button.querySelector('svg').innerHTML=playing?'<path d="M7 5h4v14H7zm6 0h4v14h-4z" fill="currentColor"/>':'<path d="m9 5 11 7-11 7z" fill="currentColor"/>';
 };
 button.addEventListener('click',async()=>{
  if(!video.paused){video.pause();return;}
  error.hidden=true;
  try{await video.play();}catch(e){if(e.name!=='AbortError')error.hidden=false;}
 });
 video.addEventListener('play',reflect);video.addEventListener('pause',reflect);
 video.addEventListener('error',()=>{error.hidden=false;});
 video.querySelector('source').addEventListener('error',()=>{error.hidden=false;});
}
document.addEventListener('visibilitychange',()=>{if(document.hidden)document.querySelectorAll('video').forEach(v=>v.pause());});
