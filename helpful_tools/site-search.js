'use strict';
(function(root){
 const normal=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
 function find(rows,query,kind='',limit=50){const q=normal(query),tokens=q.split(' ').filter(Boolean);if(!q)return [];return rows.filter(r=>(!kind||r.kind===kind)&&tokens.every(t=>normal(`${r.title} ${r.text} ${r.keywords||''}`).includes(t))).map(r=>({r,score:normal(r.title)===q?0:normal(r.title).startsWith(q)?1:normal(r.title).includes(q)?2:3})).sort((a,b)=>a.score-b.score||a.r.title.localeCompare(b.r.title)).slice(0,limit).map(x=>x.r);}
 root.WikiSearch={normal,find};
})(typeof window==='undefined'?globalThis:window);
if(typeof document!=='undefined')(()=>{
 const $=id=>document.getElementById(id),field=$('global-query');if(!field)return;let pending,serial=0;
 const base=document.currentScript?.src||new URL('site-search.js',document.baseURI).href;
 const load=()=>{
  if(Array.isArray(window.WIKI_SEARCH_INDEX?.entries))return Promise.resolve(window.WIKI_SEARCH_INDEX.entries);
  if(pending)return pending;
  pending=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=new URL('search-index.js',base).href;script.onload=()=>{script.remove();const rows=window.WIKI_SEARCH_INDEX?.entries;if(Array.isArray(rows))resolve(rows);else reject(Error('Invalid search index'));};script.onerror=()=>{script.remove();reject(Error('Search index could not load'));};document.head.append(script);}).catch(error=>{pending=null;throw error;});
  return pending;
 };
 const label={pokemon:'Pokémon',move:'Move',ability:'Ability',mechanic:'Mechanic',item:'Item',tool:'Tool',event:'Event',costume:'Costume'};
 const card=row=>{const a=document.createElement('a');a.href=row.url;a.className='search-result';const title=document.createElement('strong');title.textContent=row.title;const small=document.createElement('small');small.textContent=label[row.kind]||row.kind;a.append(title,small);return a;};
 async function quick(){const version=++serial,box=$('global-results'),q=field.value.trim();box.replaceChildren();box.hidden=!q;if(!q)return;try{const rows=WikiSearch.find(await load(),q,'',8);if(version!==serial)return;box.replaceChildren(...rows.map(card));const all=document.createElement('a');all.href='search.html?q='+encodeURIComponent(q);all.textContent=rows.length?'See all results →':'No matches. Open search';box.append(all);}catch(e){if(version===serial)box.textContent='Search could not load. Connect and try again.';}}
 field.addEventListener('input',quick);field.addEventListener('focus',()=>{load().catch(()=>{});if(field.value)quick();});
 document.addEventListener('keydown',e=>{if(e.key==='/'&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName)&&!document.activeElement?.isContentEditable){e.preventDefault();field.focus();}if(e.key==='Escape'){$('global-results').hidden=true;field.blur();}if(e.key==='ArrowDown'&&document.activeElement===field){const link=$('global-results').querySelector('a');if(link){e.preventDefault();link.focus();}}});
 document.addEventListener('click',e=>{if(!e.target.closest('.global-search'))$('global-results').hidden=true;});
 if($('search-page-form')){const params=new URLSearchParams(location.search);$('search-page-query').value=params.get('q')||'';
  async function full(e){e?.preventDefault();const q=$('search-page-query').value,kind=$('search-page-kind').value;$('search-page-count').textContent='Searching…';try{const rows=WikiSearch.find(await load(),q,kind,2000);$('search-page-results').replaceChildren(...rows.map(card));$('search-page-count').textContent=q.trim()?`${rows.length} results`:'Enter a name, ability effect or mechanic.';const url=new URL(location.href);url.searchParams.set('q',q);try{history.replaceState(null,'',url);}catch{};}catch(error){$('search-page-count').textContent='Search data could not load. Reload this page and try again.';}}
  $('search-page-form').addEventListener('submit',full);$('search-page-kind').addEventListener('change',full);full();
 }
})();
