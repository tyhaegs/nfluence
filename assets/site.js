(function(){
  function track(event,detail){const allowed=['page_view','service_opened','inquiry_started','inquiry_sent','client_error'];if(!allowed.includes(event))return;const body={event,route:location.pathname,service:typeof detail?.service==='string'?detail.service.slice(0,60):null};fetch('https://xynujmscxjxbfivylfne.supabase.co/functions/v1/site-events',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),keepalive:true}).catch(()=>{});}
  window.nfluenceTrack=track;track('page_view');
  document.addEventListener('click',e=>{const link=e.target.closest('a[href*="contact.html"]');if(link)track('inquiry_started',{service:new URL(link.href).searchParams.get('service')});});
  document.querySelectorAll('.nav-hamburger').forEach(button=>{button.setAttribute('aria-controls','nav-dropdown');button.setAttribute('aria-expanded','false');button.addEventListener('click',()=>{requestAnimationFrame(()=>button.setAttribute('aria-expanded',String(document.getElementById('nav-dropdown')?.classList.contains('open'))));});});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){const menu=document.getElementById('nav-dropdown');if(menu?.classList.contains('open')){menu.classList.remove('open');const button=document.querySelector('.nav-hamburger');button?.setAttribute('aria-expanded','false');button?.focus();}}});
  window.addEventListener('error',()=>track('client_error'));window.addEventListener('unhandledrejection',()=>track('client_error'));
})();
