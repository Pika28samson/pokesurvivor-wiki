'use strict';
(()=>{
 const B=SimulationBuilds,W=Wiki,$=id=>document.getElementById(id);
 const node=(tag,text,className)=>{const n=document.createElement(tag);if(text!=null)n.textContent=text;if(className)n.className=className;return n;};
 const abilityName=id=>id==='none'?'No ability':G.ABIL[id]?.[1]||id;
 let storage;try{storage=localStorage;}catch{}
 const loaded=B.load(storage);let state=loaded.state,editing=null,picked=new Set(),observer,lastSettings=JSON.stringify(state.settings);
 function message(text){$('sim-storage-message').hidden=!text;$('sim-storage-message').textContent=text;}
 function persist(){const error=B.save(storage,state);message(error);return !error;}
 function error(text){$('sim-form-error').textContent=text;}
 function pokemonOptions(query=''){
  const previous=Number($('sim-pokemon').value)||25,q=query.toLowerCase().trim();const rank=m=>m.name.toLowerCase()===q?0:m.name.toLowerCase().startsWith(q)?1:2;const mons=G.DEX.filter(m=>!q||`${m.name} ${m.dex}`.toLowerCase().includes(q)).sort((a,b)=>q?rank(a)-rank(b)||a.dex-b.dex:0);$('sim-pokemon').replaceChildren();
  for(const m of mons)$('sim-pokemon').add(new Option(`#${String(m.dex).padStart(4,'0')} ${m.name}`,m.dex));
  $('sim-pokemon').value=String(!q&&mons.some(m=>m.dex===previous)?previous:mons[0]?.dex||'');
  return Number($('sim-pokemon').value)!==previous;
 }
 function updatePokemon(build){
  const dex=Number($('sim-pokemon').value),mon=G.DEX_BY[dex];$('sim-ability').replaceChildren();$('sim-portrait').replaceChildren();
  if(!mon){picked.clear();renderMoves();return;}
  for(const id of B.abilityIds(dex))$('sim-ability').add(new Option(abilityName(id)+(G.DEX_ABIL[dex]?.[2]===id?' (hidden)':''),id));
  $('sim-ability').add(new Option('None (comparison baseline)','none'));$('sim-ability').value=build?.abilityId||B.abilityIds(dex)[0]||'none';
  const available=new Set(B.pool(dex));picked=new Set(build?build.moves:[G.baseStartOf(dex),'harden'].filter(id=>available.has(id)));
  $('sim-portrait').append(W.sprite(mon));const info=node('div');info.append(node('strong',mon.name));for(const t of mon.types)info.append(W.badge(t));info.append(node('p',`Physical attack ×${mon.pa} · Special attack ×${mon.sa}`,'source'));$('sim-portrait').append(info);
  $('sim-move-search').value='';$('sim-move-type').value='';error('');renderMoves();
 }
 function renderMoves(){
  const dex=Number($('sim-pokemon').value),q=$('sim-move-search').value.toLowerCase().trim(),type=$('sim-move-type').value;
  const ids=B.pool(dex).sort((a,b)=>W.moveName(a).localeCompare(W.moveName(b))).filter(id=>{const m=G.Moves.BY_ID[id];return (!type||type===m.type)&&`${W.moveName(id)} ${m.type} ${m.kind} ${m.cat||'status'}`.toLowerCase().includes(q);});
  $('sim-move-options').replaceChildren();$('sim-picked').replaceChildren();$('sim-move-count').textContent=`${picked.size}/4 selected · ${ids.length} moves shown`;
  for(const id of picked){const button=node('button',W.moveName(id)+' ×','sim-picked-move');button.type='button';button.style.setProperty('--type-color',W.colours[G.Moves.BY_ID[id].type]);button.setAttribute('aria-label','Remove '+W.moveName(id));button.addEventListener('click',()=>{picked.delete(id);error('');renderMoves();});$('sim-picked').append(button);}
  for(const id of ids){const m=G.Moves.BY_ID[id],label=node('label',null,'sim-move-choice'),box=node('input');box.type='checkbox';box.value=id;box.checked=picked.has(id);label.style.setProperty('--type-color',W.colours[m.type]);const text=node('span',W.moveName(id));text.append(node('small',`${W.title(m.type)} · ${m.cat||'status'} · ${m.kind}`));label.append(box,text);
   box.addEventListener('change',()=>{if(box.checked){if(picked.size>=4){box.checked=false;error('Remove a move before choosing another.');return;}if(m.kind==='buff'&&[...picked].filter(x=>G.Moves.BY_ID[x].kind==='buff').length>=2){box.checked=false;error('A build can include at most two status moves.');return;}picked.add(id);}else picked.delete(id);error('');renderMoves();});$('sim-move-options').append(label);
  }
  if(!ids.length)$('sim-move-options').append(node('p','No moves match these filters.'));
 }
 function renderSaved(){
  $('sim-saved').replaceChildren();if(!state.builds.length){$('sim-saved').append(node('p','No saved builds yet. Create your first build above.','empty'));return;}
  for(const build of state.builds){const row=node('div',null,'sim-saved-row'),label=node('label',null,'sim-saved-choice'),box=node('input');box.type='checkbox';box.checked=state.selected.includes(build.id);box.setAttribute('aria-label','Compare '+build.name);const text=node('span',build.name);text.append(node('small',`${G.DEX_BY[build.dex].name} · ${abilityName(build.abilityId)}`));label.append(box,text);box.addEventListener('change',()=>{state.selected=box.checked?[...state.selected,build.id]:state.selected.filter(id=>id!==build.id);persist();renderComparisons();});
   const actions=node('div',null,'sim-actions'),edit=node('button','Edit','secondary'),remove=node('button','Delete','secondary');edit.type=remove.type='button';edit.addEventListener('click',()=>editBuild(build));remove.addEventListener('click',()=>{state.builds=state.builds.filter(b=>b.id!==build.id);state.selected=state.selected.filter(id=>id!==build.id);if(editing===build.id)cancelEdit();persist();renderSaved();renderComparisons();});actions.append(edit,remove);row.append(label,actions);$('sim-saved').append(row);
  }
 }
 function renderComparisons(){
  observer?.disconnect();$('sim-comparisons').replaceChildren();const builds=state.builds.filter(b=>state.selected.includes(b.id));if(!builds.length){$('sim-comparisons').append(node('p','Select saved builds to compare their canvas previews.','empty'));return;}
  if(typeof IntersectionObserver!=='undefined')observer=new IntersectionObserver(entries=>{for(const entry of entries)entry.target.contentWindow?.postMessage({type:'combo-preview-visibility',visible:entry.isIntersecting},'*');});
  for(const build of builds){const mon=G.DEX_BY[build.dex],card=node('article',null,'panel sim-comparison');card.append(node('h3',build.name));const info=node('p',`${mon.name} · ${abilityName(build.abilityId)}`);card.append(info);for(const t of mon.types)card.append(W.badge(t));const links=node('div',null,'move-links');for(const id of build.moves){const link=node('a',W.moveName(id)+' (max)');link.href='move.html?id='+encodeURIComponent(id);link.style.setProperty('--type-color',W.colours[G.Moves.BY_ID[id].type]);links.append(link);}card.append(links);
   const frame=node('iframe',null,'combo-preview');frame.title=build.name+' live simulation';frame.loading='lazy';frame.setAttribute('scrolling','no');frame.src=B.previewUrl(build,state.settings);frame.addEventListener('load',()=>{const rect=frame.getBoundingClientRect();frame.contentWindow?.postMessage({type:'combo-preview-visibility',visible:rect.bottom>0&&rect.top<innerHeight},'*');});card.append(frame);$('sim-comparisons').append(card);observer?.observe(frame);
  }
 }
 function editBuild(build){editing=build.id;$('sim-editor').open=true;$('sim-editor-title').textContent='Edit build';$('sim-save').textContent='Update build';$('sim-cancel-edit').hidden=false;$('sim-name').value=build.name;$('sim-pokemon-search').value='';pokemonOptions();$('sim-pokemon').value=String(build.dex);updatePokemon(build);$('sim-name').focus();$('sim-editor').scrollIntoView({behavior:'smooth',block:'start'});}
 function cancelEdit(){editing=null;$('sim-editor-title').textContent='Create a build';$('sim-save').textContent='Save build';$('sim-cancel-edit').hidden=true;$('sim-name').value='';error('');}
 $('sim-build-form').addEventListener('submit',event=>{event.preventDefault();try{if(!editing&&state.builds.length>=100)throw Error('Export or remove a build before adding more (maximum 100).');const build=B.validate({id:editing||B.id(),name:$('sim-name').value,dex:$('sim-pokemon').value,abilityId:$('sim-ability').value,moves:[...picked]});const at=state.builds.findIndex(b=>b.id===build.id);if(at>=0)state.builds[at]=build;else state.builds.push(build);if(!state.selected.includes(build.id))state.selected.push(build.id);persist();cancelEdit();renderSaved();renderComparisons();}catch(e){error(e.message);}});
 $('sim-cancel-edit').addEventListener('click',cancelEdit);
 $('sim-pokemon-search').addEventListener('input',()=>{if(pokemonOptions($('sim-pokemon-search').value))updatePokemon();});$('sim-pokemon').addEventListener('change',()=>updatePokemon());
 for(const type of Object.keys(W.colours).sort())$('sim-move-type').add(new Option(W.title(type),type));$('sim-move-search').addEventListener('input',renderMoves);$('sim-move-type').addEventListener('change',renderMoves);
 for(const key of Object.keys(B.defaults))$('sim-'+key).value=state.settings[key];
 const settingChanged=()=>{const raw=Object.fromEntries(Object.keys(B.defaults).map(key=>[key,$('sim-'+key).value]));const next=B.cleanSettings(raw),signature=JSON.stringify(next);if(signature===lastSettings)return;state.settings=next;lastSettings=signature;persist();renderComparisons();};
 for(const key of Object.keys(B.defaults)){const input=$('sim-'+key);input.addEventListener('input',settingChanged);input.addEventListener('change',settingChanged);} $('sim-settings').addEventListener('submit',e=>e.preventDefault());
 $('sim-reset-settings').addEventListener('click',()=>{state.settings=B.cleanSettings(B.defaults);lastSettings=JSON.stringify(state.settings);for(const key of Object.keys(B.defaults))$('sim-'+key).value=state.settings[key];persist();renderComparisons();});
 $('sim-restart').addEventListener('click',renderComparisons);
 $('sim-export').addEventListener('click',()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(state,null,2)],{type:'application/json'})),link=node('a');link.href=url;link.download='pokesurvivor-builds.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
 $('sim-import').addEventListener('change',async event=>{const file=event.target.files?.[0];if(!file)return;try{if(file.size>2*1024*1024)throw Error('Backup is too large (maximum 2 MB).');const imported=B.parse(await file.text()),next={...state,builds:[...state.builds],selected:[...state.selected]};let added=0;for(const build of imported.builds){if(next.builds.some(b=>b.id===build.id&&JSON.stringify(b)===JSON.stringify(build)))continue;if(next.builds.length>=100)throw Error('Too many builds to import (maximum 100).');const copy={...build,id:next.builds.some(b=>b.id===build.id)?B.id():build.id};next.builds.push(copy);if(imported.selected.includes(build.id))next.selected.push(copy.id);added++;}next.settings=imported.settings;state=next;lastSettings=JSON.stringify(state.settings);for(const key of Object.keys(B.defaults))$('sim-'+key).value=state.settings[key];const saved=persist();if(saved)message('Imported '+added+' build(s). Existing builds were kept.');renderSaved();renderComparisons();}catch(e){message('Import failed: '+e.message);}event.target.value='';});
 pokemonOptions();$('sim-pokemon').value='25';updatePokemon();
 let arrivalMessage='',arrivalAdded=false;
 const params=new URLSearchParams(location.search),dex=Number(params.get('dex'));if(G.DEX_BY[dex]){const abilityId=params.get('ability')||B.abilityIds(dex)[0]||'none',moves=(params.get('moves')||'').split(',');try{const build=B.validate({id:'draft',name:params.get('name')||G.DEX_BY[dex].name+' build',dex,abilityId,moves});$('sim-pokemon').value=String(dex);updatePokemon(build);$('sim-name').value=build.name;if(params.get('add')==='1'){const result=B.add(storage,build);state=result.state;arrivalAdded=true;arrivalMessage=result.alreadySaved?'This build is already saved and selected for comparison.':'Added '+result.build.name+' to your simulation builds.';cancelEdit();if(typeof history!=='undefined'){params.delete('add');history.replaceState(null,'','?'+params.toString());}}}catch(e){arrivalMessage='Could not add this build: '+e.message;}}
 renderSaved();renderComparisons();message(arrivalMessage||loaded.error);if(arrivalAdded)$('sim-compare-title').scrollIntoView({block:'start'});addEventListener('pagehide',()=>observer?.disconnect());
})();
