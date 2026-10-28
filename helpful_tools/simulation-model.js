'use strict';
window.SimulationBuilds=(()=>{
 const key='pokesurvivor-simulation-v1';
 const defaults={mode:'swarm',enemyHp:800,spawnRate:20,maxEnemies:30,layers:1,perLayer:8,arc:360,distance:100,seed:42,weather:'auto',elapsed:1200,kills:1000,hpPercent:100};
 function pool(dex){const mon=G.DEX_BY[dex];if(!mon)return [];return [...new Set([...G.Moves.poolFor(mon,true),G.baseStartOf(dex),...G.TM_OF(dex)])].filter(id=>G.Moves.BY_ID[id]);}
 function abilityIds(dex){return [...new Set((G.DEX_ABIL[dex]||[]).filter(Boolean))];}
 function validate(input){
  if(!input||typeof input!=='object')throw Error('Invalid build.');
  const dex=Number(input.dex),mon=G.DEX_BY[dex];if(!mon)throw Error('Choose a Pokémon.');
  const abilityId=String(input.abilityId||'none');if(abilityId!=='none'&&!abilityIds(dex).includes(abilityId))throw Error('Choose an ability available to this Pokémon.');
  const moves=Array.isArray(input.moves)?input.moves.map(String):[];
  if(moves.length<1||moves.length>4||new Set(moves).size!==moves.length)throw Error('Choose one to four different moves.');
  const allowed=new Set(pool(dex));if(moves.some(id=>!allowed.has(id)))throw Error('A selected move is not available to this Pokémon, including its compatible TMs.');
  if(moves.filter(id=>G.Moves.BY_ID[id].kind==='buff').length>2)throw Error('Choose at most two status moves.');
  const name=String(input.name||'').trim().slice(0,80);if(!name)throw Error('Enter a build name.');
  const id=String(input.id||'');if(!/^[a-zA-Z0-9_-]{1,100}$/.test(id))throw Error('Invalid build identifier.');
  return {id,name,dex,abilityId,moves};
 }
 function cleanSettings(input={}){const out={};const ranges={enemyHp:[1,1e6],spawnRate:[.1,100],maxEnemies:[1,200],layers:[1,6],perLayer:[1,24],arc:[1,360],distance:[25,400],seed:[0,4294967295],elapsed:[0,100000],kills:[0,1000000],hpPercent:[1,100]};
  for(const [k,[lo,hi]] of Object.entries(ranges)){const value=Number(input[k]??defaults[k]);out[k]=Number.isFinite(value)?Math.max(lo,Math.min(hi,value)):defaults[k];if(['maxEnemies','layers','perLayer','seed','kills'].includes(k))out[k]=Math.round(out[k]);}
  out.mode=input.mode==='stationary'?'stationary':'swarm';out.weather=['auto','none','sun','rain','sand','snow','fog'].includes(input.weather)?input.weather:'auto';return out;
 }
 function empty(){return {version:1,canvasDefaultsVersion:2,builds:[],selected:[],settings:{...defaults}};}
 function parse(text){const raw=JSON.parse(text);if(raw?.version!==1||!Array.isArray(raw.builds)||raw.builds.length>100)throw Error('Choose a valid Simulation build backup (up to 100 builds).');const builds=raw.builds.map(validate);if(new Set(builds.map(b=>b.id)).size!==builds.length)throw Error('Build identifiers must be unique.');const ids=new Set(builds.map(b=>b.id));const settings=cleanSettings(raw.settings);if(!raw.canvasDefaultsVersion&&raw.settings?.enemyHp===1500&&raw.settings?.spawnRate===35){settings.enemyHp=800;settings.spawnRate=15;if(raw.settings.maxEnemies==null)settings.maxEnemies=20;}if((raw.canvasDefaultsVersion||0)<2&&settings.enemyHp===800&&settings.spawnRate===15&&settings.maxEnemies===20){settings.spawnRate=20;settings.maxEnemies=30;}return {version:1,canvasDefaultsVersion:2,builds,selected:Array.isArray(raw.selected)?[...new Set(raw.selected.filter(id=>ids.has(id)))]:builds.map(b=>b.id),settings};}
 function load(storage){try{const raw=storage.getItem(key);return {state:raw?parse(raw):empty(),error:''};}catch(e){return {state:empty(),error:'Saved builds could not be loaded: '+e.message};}}
 function save(storage,state){try{storage.setItem(key,JSON.stringify(parse(JSON.stringify(state))));return '';}catch(e){return 'Could not save builds in this browser. Export a backup to keep them. '+e.message;}}
 function id(){return globalThis.crypto?.randomUUID?.()||('build-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10));}
 function add(storage,input){
  const loaded=load(storage);if(loaded.error)throw Error(loaded.error);
  const state=loaded.state,candidate=validate({...input,id:id()});
  const moveKey=moves=>[...moves].sort().join('|');
  const existing=state.builds.find(b=>b.dex===candidate.dex&&b.abilityId===candidate.abilityId&&moveKey(b.moves)===moveKey(candidate.moves));
  let build=existing;
  if(!build){if(state.builds.length>=100)throw Error('Remove or export a build before adding more (maximum 100).');let name=candidate.name,n=2;while(state.builds.some(b=>b.name===name))name=candidate.name.slice(0,70)+' ('+(n++)+')';build={...candidate,name};state.builds.push(build);}
  if(!state.selected.includes(build.id))state.selected.push(build.id);
  const error=save(storage,state);if(error)throw Error(error);return {state,build,alreadySaved:!!existing};
 }
 function previewUrl(build,settings){const s=cleanSettings(settings),mon=G.DEX_BY[build.dex],conditions={abilityId:build.abilityId,weather:s.weather,elapsed:s.elapsed,kills:s.kills,hpPercent:s.hpPercent,enemyHpPercent:100};const p=ComboAbilities.prepare(mon,conditions);return 'combo-preview.html?'+new URLSearchParams({dex:build.dex,moves:build.moves.join(','),conditions:JSON.stringify(conditions),mode:s.mode,enemyHp:s.enemyHp,spawnRate:s.spawnRate,maxEnemies:s.maxEnemies,layers:s.layers,perLayer:s.perLayer,arc:s.arc,distance:s.distance,seed:s.seed,cd:p.cdMul,statusCd:p.statusCd}).toString();}
 return {key,defaults,pool,abilityIds,validate,cleanSettings,empty,parse,load,save,id,add,previewUrl};
})();
