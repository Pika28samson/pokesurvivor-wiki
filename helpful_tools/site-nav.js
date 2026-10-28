'use strict';
(()=>{
 const groups=[...document.querySelectorAll('.nav-group')];
 groups.forEach(group=>group.addEventListener('toggle',()=>{if(group.open)groups.filter(x=>x!==group).forEach(x=>x.open=false);}));
 document.addEventListener('click',e=>{if(!e.target.closest('.nav-group'))groups.forEach(x=>x.open=false);});
 document.addEventListener('keydown',e=>{if(e.key==='Escape')groups.forEach(x=>x.open=false);});
 const page=location.pathname.split('/').pop()||'index.html';for(const a of document.querySelectorAll('.nav a'))if(a.getAttribute('href')===page){a.classList.add('active');a.setAttribute('aria-current','page');a.closest('.nav-group')?.classList.add('has-active');}
})();
