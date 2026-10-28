'use strict';
// Reversible mobile presentation. Desktop keeps the original DOM and styles.
(()=>{
 const query=matchMedia('(max-width: 650px)');let dispose;
 function start(){
  const controller=new AbortController(),signal=controller.signal,undo=[],created=[],originalOrders=new Map(),seenMoves=new WeakSet(),attrs=new WeakMap(),frames=new Map(),tableCache=new WeakMap();let observer,queued=false,stopped=false;
  const main=document.querySelector('main'),header=document.querySelector('.site-header');if(!main||!header)return ()=>{};
  const page=location.pathname.split('/').pop()||'index.html';
  const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text)n.textContent=text;return n;};
  const own=n=>(created.push(n),n);
  const attr=(n,key,value)=>{let keys=attrs.get(n);if(!keys)attrs.set(n,keys=new Set());if(!keys.has(key)){keys.add(key);const old=n.getAttribute(key);undo.push(()=>old===null?n.removeAttribute(key):n.setAttribute(key,old));}if(value===null)n.removeAttribute(key);else n.setAttribute(key,value);};
  const mark=(n,cls)=>{attr(n,'class',n.className+' '+cls);};
  const move=(n,parent,before=null)=>{if(!seenMoves.has(n)){seenMoves.add(n);const original=n.parentNode,next=n.nextSibling;if(original&&!originalOrders.has(original))originalOrders.set(original,[...original.childNodes]);undo.push(()=>{if(original)original.insertBefore(n,next?.parentNode===original?next:null);});}parent.insertBefore(n,before);};
  const on=(n,type,fn)=>n.addEventListener(type,fn,{signal});
  const fold=(nodes,title,parent,before=null)=>{const d=own(el('details','mobile-disclosure')),summary=el('summary','',title),body=el('div','mobile-disclosure-body');d.append(summary,body);parent.insertBefore(d,before);for(const n of nodes)move(n,body);return d;};
  attr(document.body,'data-mobile-page',page);
  document.addEventListener('invalid',e=>{for(let n=e.target.parentElement;n&&n!==main;n=n.parentElement)if(n.tagName==='DETAILS')n.open=true;},{capture:true,signal});
  // Compact navigation and search are available on every page.
  const nav=header.querySelector('.nav'),menu=own(el('div','mobile-menu-panel'));menu.hidden=true;menu.id='mobile-navigation';header.append(menu);
  for(const group of [...nav.querySelectorAll('.nav-group')]){attr(group,'open',group.getAttribute('open'));move(group,menu);}
  const iconButton=(name,path)=>{const b=own(el('button','mobile-header-button'));b.type='button';b.setAttribute('aria-label',name);b.setAttribute('aria-expanded','false');b.innerHTML='<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">'+path+'</svg>';nav.append(b);return b;};
  const searchButton=iconButton('Search the wiki','<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>');
  const menuButton=iconButton('Open navigation','<path d="M4 6h16M4 12h16M4 18h16"/>');menuButton.setAttribute('aria-controls',menu.id);searchButton.setAttribute('aria-controls','global-query');
  const closeHeader=()=>{header.classList.remove('mobile-search-open');menu.hidden=true;menuButton.setAttribute('aria-expanded','false');searchButton.setAttribute('aria-expanded','false');};
  on(menuButton,'click',()=>{const open=menu.hidden;closeHeader();menu.hidden=!open;menuButton.setAttribute('aria-expanded',String(open));});
  on(searchButton,'click',()=>{const open=!header.classList.contains('mobile-search-open');closeHeader();header.classList.toggle('mobile-search-open',open);searchButton.setAttribute('aria-expanded',String(open));if(open)header.querySelector('#global-query').focus();});
  on(document,'keydown',e=>{if(e.key==='Escape')closeHeader();if(e.key==='/'&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName)){closeHeader();header.classList.add('mobile-search-open');searchButton.setAttribute('aria-expanded','true');header.querySelector('#global-query').focus();}});
  on(document,'click',e=>{if(!header.contains(e.target))closeHeader();});
  on(menu,'click',e=>{if(e.target.closest('a'))closeHeader();});
  // Keep the primary search field visible, with secondary filters on demand.
  const compact=(container,keep)=>{if(!container)return;const children=[...container.children],secondary=children.filter(n=>!keep(n));if(!secondary.length)return;const d=fold(secondary,'Filters & sorting',container);mark(d,'mobile-filter-group');};
  if(['pokemon.html','moves.html','items.html','abilities.html'].includes(page)){const f=main.querySelector('.filters');compact(f,n=>n===f.firstElementChild);}
  if(page==='gacha.html'){const f=document.getElementById('gacha-form');const secondary=[...f.children].filter(n=>n.querySelector?.('#gacha-pity,#gacha-tickets,#gacha-ten-tickets,#gacha-shiny,#gacha-charm'));const d=fold(secondary,'Tickets, pity & shiny options',f,f.querySelector('button[type="submit"]'));mark(d,'mobile-filter-group');}
  if(page==='tm-finder.html'){const stock=document.getElementById('stock')?.closest('section');if(stock){const h=stock.querySelector('h2');if(h)mark(h,'mobile-replaced-heading');fold([...stock.childNodes],'Daily shop stock',stock);mark(stock,'mobile-stock');}}
  let selectTab;
  if(page==='pokemon-detail.html'){
   const root=document.getElementById('detail'),original=[...root.children],hero=root.querySelector('.hero'),ranking=root.querySelector('.pokemon-ranking'),combo=root.querySelector('.combo-section');
   const base=original.findIndex(n=>n.tagName==='H2'&&n.textContent.startsWith('Base stats')),abilities=original.findIndex(n=>n.tagName==='H2'&&n.textContent==='Abilities'),moves=original.findIndex(n=>n.tagName==='H2'&&n.textContent==='Default starting move');
   if(hero&&ranking&&base>=0&&abilities>base&&moves>abilities){
    const rarity=hero.querySelector('p');if(rarity){const old=rarity.textContent;const cleaned=old.replace(/^Legendary\s*·\s*Legendary \/ mythical$/,'Legendary / mythical');if(cleaned!==old){rarity.textContent=cleaned;undo.push(()=>rarity.textContent=old);}}
    const tabs=own(el('div','mobile-tabs'));tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Pokémon sections');hero.after(tabs);
    const sections={},buttons={};for(const [key,label] of [['overview','Overview'],['builds','Builds'],['moves','Moves'],['abilities','Abilities']]){const section=own(el('section','mobile-tab-panel'));section.id='mobile-'+key;section.setAttribute('role','tabpanel');section.setAttribute('aria-labelledby','mobile-tab-'+key);root.append(section);sections[key]=section;const b=el('button','',label);b.type='button';b.id='mobile-tab-'+key;b.setAttribute('role','tab');b.setAttribute('aria-controls',section.id);tabs.append(b);buttons[key]=b;}
    selectTab=(key,scroll=false)=>{for(const k of Object.keys(sections)){sections[k].hidden=k!==key;buttons[k].setAttribute('aria-selected',String(k===key));buttons[k].tabIndex=k===key?0:-1;}if(scroll)tabs.scrollIntoView({block:'start'});};
    for(const key of Object.keys(buttons)){on(buttons[key],'click',()=>selectTab(key,true));on(buttons[key],'keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const keys=Object.keys(buttons),i=keys.indexOf(key),next=e.key==='Home'?0:e.key==='End'?keys.length-1:(i+(e.key==='ArrowRight'?1:-1)+keys.length)%keys.length;selectTab(keys[next]);buttons[keys[next]].focus();});}
    const grid=root.querySelector('.stat-grid'),core=el('div','mobile-core-stats');core.setAttribute('aria-label','Key stats');for(const [i,label] of [[0,'HP'],[1,'Speed'],[2,'Physical attack'],[3,'Special attack']]){const item=el('div','mobile-stat');item.append(el('span','',label),el('strong','',grid.children[i]?.querySelector('b')?.textContent||'—'));core.append(item);}sections.overview.append(core);
    const best=ranking.querySelector('.best-build-layout'),copy=best?.querySelector('.best-build-copy');if(copy){const card=el('section','mobile-recommendation'),row=el('div','mobile-recommendation-heading'),b=el('button','mobile-text-action','View build');b.type='button';on(b,'click',()=>selectTab('builds',true));row.append(el('h2','','Recommended build'),b);card.append(row);const ability=copy.querySelector('p b');if(ability)card.append(el('p','mobile-ability-line','Ability: '+ability.textContent));const links=copy.querySelector('.move-links');if(links)card.append(links.cloneNode(true));sections.overview.append(card);}
    fold(original.slice(base,abilities),'All stats',sections.overview);
    const bestPreview=best?.querySelector('.best-build-simulation');if(bestPreview)move(bestPreview,sections.overview);if(best)move(best,sections.builds);move(ranking,sections.overview);for(const n of original.slice(abilities,moves))move(n,sections.abilities);for(const n of original.slice(moves)){if(n!==combo)move(n,sections.moves);}if(combo){move(combo,sections.builds);const controls=combo.querySelector('.combo-controls');if(controls){const secondary=[...controls.children].filter(n=>!n.querySelector('#combo-ability'));fold(secondary,'Build options',controls);}}
    selectTab('overview');
    const activateHash=()=>{const target=document.getElementById(decodeURIComponent(location.hash.slice(1)));const section=target?.closest('.mobile-tab-panel');if(section){selectTab(section.id.replace('mobile-',''));for(let n=target.parentElement;n&&n!==section;n=n.parentElement)if(n.tagName==='DETAILS')n.open=true;requestAnimationFrame(()=>target.scrollIntoView({block:'start'}));}};on(window,'hashchange',activateHash);activateHash();
   }
  }
  if(page==='move.html'){
   const root=document.getElementById('detail'),table=root?.querySelector('table');if(table){const stats=own(el('div','mobile-move-stats'));for(const name of ['Damage / hit','Cooldown (s)','Damage score (max)']){const row=[...table.rows].find(r=>r.cells[0]?.textContent===name);if(row){const card=el('div','mobile-stat');card.append(el('span','',name==='Damage score (max)'?'Damage score':name),el('strong','',row.cells[row.cells.length-1].textContent));stats.append(card);}}const firstPanel=root.querySelector('.panel');root.insertBefore(stats,firstPanel);const wrap=table.closest('.table-wrap'),h=wrap.previousElementSibling?.previousElementSibling;if(h?.tagName==='H2'){const d=fold([h,h.nextElementSibling,wrap],'All move stages',root,wrap.nextSibling);d.open=true;mark(table,'mobile-stage-table');mark(wrap,'mobile-stage-scroll');attr(wrap,'tabindex','0');}}
   for(const panel of [...root.querySelectorAll(':scope > .panel')]){const h=panel.querySelector(':scope > h2');if(h&&!h.textContent.includes('simulation')){mark(h,'mobile-replaced-heading');const d=fold([...panel.childNodes],h.textContent,panel);d.open=true;}}
  }
  if(page==='move.html'){
   const root=document.getElementById('detail'),preview=root.querySelector('.move-simulation details');
   if(preview)move(preview,root.querySelector('.move-simulation'));
   for(const d of root.querySelectorAll('details.panel'))if(d.querySelector('summary')?.textContent==='Upgrade changes and evolution')attr(d,'open','');
   const h=[...root.querySelectorAll(':scope > h2')].find(n=>n.textContent.includes('can learn this TM'));
   if(h){const nodes=[h,h.nextElementSibling,h.nextElementSibling?.nextElementSibling].filter(Boolean);mark(h,'mobile-replaced-heading');fold(nodes,h.textContent,root,h);}
  }
  if(page==='simulation.html'){const saved=document.getElementById('sim-saved-section');if(saved)attr(saved,'open',null);}
  function abilityHolders(){if(page!=='abilities.html')return;for(const entry of main.querySelectorAll('.ability-entry')){const h=[...entry.children].find(n=>n.tagName==='H3'&&n.textContent.includes('with this ability'));if(h){const list=h.nextElementSibling;mark(h,'mobile-replaced-heading');fold([h,list],h.textContent,entry,h);}}}
  if(page==='mechanics.html')for(const article of main.querySelectorAll('.mechanic')){const h=article.querySelector('h2');if(h){mark(h,'mobile-replaced-heading');const d=fold([...article.childNodes],h.textContent,article);if(location.hash==='#'+article.id)d.open=true;}}
  // Defer each training iframe until explicitly expanded on a phone.
  function previews(){for(const frame of main.querySelectorAll('iframe.combo-preview')){
   if(!frames.has(frame)){const wrapper=own(el('details','mobile-preview')),summary=el('summary','','Play simulation'),body=el('div','mobile-preview-body');wrapper.append(summary,body);frame.before(wrapper);body.append(frame);frames.set(frame,{wrapper,src:frame.getAttribute('data-mobile-src')||frame.getAttribute('src')});frame.removeAttribute('src');const auto=page==='move.html'||page==='simulation.html'||frame.id==='best-build-preview';if(auto){wrapper.open=true;summary.textContent='Hide simulation';const src=frames.get(frame).src;if(src)frame.src=src;}on(wrapper,'toggle',()=>{const state=frames.get(frame);if(wrapper.open){if(state.src&&!frame.getAttribute('src'))frame.src=state.src;summary.textContent='Hide simulation';}else{if(frame.getAttribute('src'))state.src=frame.getAttribute('src');frame.removeAttribute('src');summary.textContent='Play simulation';}});}
   const state=frames.get(frame),deferred=frame.getAttribute('data-mobile-src');if(deferred&&deferred!==state.src){state.src=deferred;if(state.wrapper.open)frame.src=deferred;}if(!state.wrapper.open&&frame.getAttribute('src')){state.src=frame.getAttribute('src');frame.removeAttribute('src');}
  }}
  function tables(){for(const table of main.querySelectorAll('table')){
   if(table.closest('.pokemon-ranking')){
    const signature=table.innerHTML;if(tableCache.get(table)===signature)continue;tableCache.set(table,signature);const wrap=table.closest('.table-wrap');mark(wrap,'mobile-original-table');let cards=wrap.nextElementSibling;if(!cards?.classList.contains('mobile-rankings')){cards=own(el('div','mobile-rankings'));wrap.after(cards);}cards.replaceChildren();for(const row of table.tBodies[0]?.rows||[]){const c=row.cells;if(c.length<4)continue;const card=el('article','mobile-rank'),top=el('div','mobile-rank-top');top.append(el('span','',c[0].textContent.replace(' ranking','')));if(c[1].firstElementChild)top.append(c[1].firstElementChild.cloneNode(true));card.append(top,el('strong','',c[2].textContent),el('small','',c[3].textContent));cards.append(card);}continue;
   }
   if(table.querySelector('#move-rows')){
    const signature=table.innerHTML;if(tableCache.get(table)===signature)continue;tableCache.set(table,signature);const wrap=table.closest('.table-wrap');mark(wrap,'mobile-original-table');let list=wrap.nextElementSibling;if(!list?.classList.contains('mobile-move-list')){list=own(el('div','mobile-move-list'));wrap.after(list);}list.replaceChildren();for(const row of table.tBodies[0]?.rows||[]){const c=row.cells;if(c.length<12){list.append(el('p','',row.textContent));continue;}const card=el('article','mobile-move-card'),head=el('div','mobile-move-card-heading');head.append(c[0].firstElementChild.cloneNode(true));if(c[1].firstElementChild)head.append(c[1].firstElementChild.cloneNode(true));card.append(head,el('p','mobile-move-meta',c[2].textContent+' · '+c[3].textContent));const values=el('div','mobile-move-stats');for(const [i,label] of [[10,'Damage score'],[4,'Damage / hit'],[6,'Cooldown (s)']]){const stat=el('div','mobile-stat');stat.append(el('span','',label),el('strong','',c[i].textContent));values.append(stat);}card.append(values);const details=el('details','mobile-row-details'),summary=el('summary','','More stats');details.append(summary);for(const i of [5,7,8,9,11])details.append(el('p','',table.tHead.rows[0].cells[i].textContent+': '+c[i].textContent));card.append(details);list.append(card);}continue;
   }
   if(table.classList.contains('mobile-stage-table'))continue;if(!table.classList.contains('mobile-table'))mark(table,'mobile-table');const headers=[...(table.tHead?.rows[0]?.cells||table.rows[0]?.cells||[])].map(c=>c.textContent);
   for(const row of table.tBodies[0]?.rows||[])for(const [i,cell] of [...row.cells].entries())if(cell.tagName==='TD'&&cell.getAttribute('data-mobile-label')!==headers[i])attr(cell,'data-mobile-label',headers[i]||'Value');
  }}
  function refresh(){if(stopped)return;abilityHolders();previews();tables();}
  const revealHash=()=>{if(!location.hash)return;let target;try{target=document.getElementById(decodeURIComponent(location.hash.slice(1)));}catch{return;}if(!target)return;for(let n=target;n&&n!==main;n=n.parentElement)if(n.tagName==='DETAILS')n.open=true;const article=target.closest('.mechanic');if(article)article.querySelector(':scope > details')?.setAttribute('open','');requestAnimationFrame(()=>target.scrollIntoView({block:'start'}));};
  on(window,'hashchange',revealHash);revealHash();
  refresh();observer=new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;refresh();});});observer.observe(main,{childList:true,subtree:true,attributes:true,attributeFilter:['src','data-mobile-src']});
  return ()=>{stopped=true;observer.disconnect();controller.abort();closeHeader();for(const [frame,state] of frames){if(state.wrapper.isConnected&&frame.parentNode){state.wrapper.before(frame);frame.removeAttribute('data-mobile-src');if(state.src&&!frame.getAttribute('src'))frame.src=state.src;state.wrapper.remove();}}for(const fn of undo.reverse())fn();for(const [parent,nodes] of originalOrders)for(const n of nodes)if(n.parentNode===parent)parent.append(n);for(const n of created.reverse())n.remove();};
 }
 function apply(){if(query.matches&&!dispose)dispose=start();else if(!query.matches&&dispose){dispose();dispose=null;}}
 query.addEventListener('change',apply);if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();
})();
