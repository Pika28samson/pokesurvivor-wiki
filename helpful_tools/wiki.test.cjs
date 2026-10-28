const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ROOT = path.resolve(__dirname, '..');

// A small DOM harness exercises page initialisation and filter interactions.
// Canvas calls are stubbed; these checks do not verify browser appearance.
function load(page='wiki.html', search='', localStorage) {
  class Element {
    constructor(){this.value='';this.children=[];this.handlers={};this.innerHTML='';this.dataset={};this.style={setProperty(){}};this.classList={add(){},toggle(){}};}
    set id(value){this._id=value;ids[value]=this;}
    get id(){return this._id;}
    append(...nodes){this.children.push(...nodes);}
    add(node){this.append(node);}
    replaceChildren(...nodes){this.children=nodes;}
    addEventListener(type,handler){this.handlers[type]=handler;}
    setAttribute(){}
    getContext(){return new Proxy({}, {get:()=>()=>{}});}
  }
  const ids = {};
  const document={
    getElementById:id=>ids[id] ||= new Element(),
    createElement:()=>new Element(), createDocumentFragment:()=>new Element(),
    createTextNode:text=>({textContent:text}),
    querySelectorAll:()=>[],
  };
  const context={document,location:{pathname:page,search,hash:''},URLSearchParams,
    Option:class extends Element{constructor(label,value){super();this.textContent=label;this.value=value;}},
    setTimeout:fn=>fn(), performance, G:{DB:{save:{ptm:{}}}},WIKI_EN:{}};
  if(localStorage)context.localStorage=localStorage;
  context.window=context;context.G.I18n={add:dict=>Object.assign(context.WIKI_EN,dict)};
  vm.createContext(context);
  for(const file of ['core/util.js','data/pokedex.js','data/moves.js','data/tms.js','data/abilities.js','data/ability-fx.js','data/starters.js','data/sprites-meta.js','data/lang-en.js'])vm.runInContext(fs.readFileSync(path.join(ROOT,'js',file),'utf8'),context,{filename:file});
  context.G.Sprites={PX:2};
  vm.runInContext(fs.readFileSync(path.join(__dirname,'english-text.js'),'utf8'),context);
  vm.runInContext(fs.readFileSync(path.join(__dirname,'attack-style.js'),'utf8'),context);
  vm.runInContext(fs.readFileSync(path.join(__dirname,'family-exclusions.js'),'utf8'),context);
  vm.runInContext(fs.readFileSync(path.join(ROOT,'js/entities/vfx.js'),'utf8'),context);
  context.G.Settings={fx:2,get:()=>true};
  vm.runInContext(fs.readFileSync(path.join(ROOT,'js/entities/fx.js'),'utf8'),context);
  vm.runInContext(fs.readFileSync(path.join(ROOT,'js/data/types.js'),'utf8'),context);
  vm.runInContext(fs.readFileSync(path.join(__dirname,'typing-population.js'),'utf8'),context);
  vm.runInContext(fs.readFileSync(path.join(__dirname,'typing-coefficients.js'),'utf8'),context);
  vm.runInContext(fs.readFileSync(path.join(__dirname,'move-dps-data.js'),'utf8'),context);
  vm.runInContext(fs.readFileSync(path.join(__dirname,'wiki-data.js'),'utf8'),context);
  vm.runInContext(fs.readFileSync(path.join(ROOT,'js/systems/weather.js'),'utf8'),context);
  vm.runInContext(fs.readFileSync(path.join(__dirname,'combo-abilities.js'),'utf8'),context);
  vm.runInContext(fs.readFileSync(path.join(__dirname,'move-combos.js'),'utf8'),context);
  vm.runInContext(fs.readFileSync(path.join(__dirname,'pokemon-rankings.js'),'utf8'),context);
  const el=id=>document.getElementById(id);
  if(page==='moves.html'){el('stage').value='1';el('sort').value='name';el('order').value='asc';}
  if(page==='pokemon.html'){const html=fs.readFileSync(path.join(__dirname,page),'utf8');for(const match of html.matchAll(/<select id="([^"]+)"[^>]*>([\s\S]*?)<\/select>/g)){const options=[...match[2].matchAll(/<option value="([^"]*)"([^>]*)>/g)];el(match[1]).value=(options.find(o=>/\bselected\b/.test(o[2]))||options[0])[1];}}
  const render=()=>vm.runInContext(fs.readFileSync(path.join(__dirname,'wiki-ui.js'),'utf8'),context);
  return {context,el,render};
}

test('all moves have translations, stage stats, behaviour and valid effect shapes',()=>{
  const {context:c}=load();
  for(const m of c.G.Moves.ALL){
    assert.ok(c.WIKI_EN[m.desc],m.id);assert.ok(c.WIKI_EN[m.name],m.id);
    assert.ok(c.Wiki.behaviours[m.kind],m.id);
    const stages=c.Wiki.stages(m.id);assert.equal(stages.length,m.maxLvl+(c.G.Moves.EVO[m.id]?1:0));
    for(const stage of stages){assert.ok(stage.cd>0);assert.ok(c.Wiki.areaKind(stage));const area=c.Wiki.metrics(stage).area;assert.ok(area==null||Number.isFinite(area));}
    const vis=c.G.VFX.forMove(m);for(const key of ['proj','beam','melee','aura','buff'])if(vis[key])assert.ok(c.G.VFX.SHAPES[vis[key]]||['vine','feather','lightning'].includes(vis[key]),`${m.id}: ${vis[key]}`);
  }
  assert.match(c.Wiki.specials(c.G.Moves.BY_ID.confusion).join(' '),/Tracks enemies/);
  const orbit=c.G.Moves.ALL.find(m=>m.kind==='orbit');
  assert.equal(c.Wiki.metrics(orbit).dps,orbit.dmg/orbit.cd);
});

test('maximum-stage scores exactly match CSV DPS and lower stages are unmeasured',()=>{
 const {context:c}=load(),{parseCsv}=require('./import-move-dps.cjs');
 const rows=parseCsv(fs.readFileSync(path.join(__dirname,'swarm_simulator/results/move-dps.csv'),'utf8'));
 assert.equal(rows.length,c.G.Moves.ALL.length);
 for(const row of rows){const stages=c.Wiki.stages(row.move_id);for(const m of stages){const x=c.Wiki.metrics(m);if(m.kind==='buff')assert.equal(x.area,null);else assert.ok(Number.isInteger(x.area)&&x.area>0);assert.equal(x.damageScore,m===stages.at(-1)?Number(row.damage_score):null);assert.equal(x.usesTypingCoefficient,false);}assert.ok(c.Wiki.metrics(stages.at(-1)).benchmarkFactor>0);}
});

test('typing coefficients use spawn weights and each species complete dual typing',()=>{
  const {context:c}=load(),data=c.G.TypingCoefficient,chart=c.G.Types.CHART;
  assert.equal(Object.keys(data.coefficients).length,18);
  assert.ok(Math.abs(data.probabilities.reduce((s,p)=>s+p.probability,0)-1)<1e-10);
  assert.ok(data.frequencies.water>data.frequencies.ice);
  assert.ok(Math.abs(Object.values(data.frequencies).reduce((s,p)=>s+p,0)-1-data.dualTypeShare)<1e-10);
  assert.equal(c.G.Types.mult('electric',['water','flying']),2.4);
  assert.equal(c.G.Types.mult('normal',['ghost','dark']),.3);
  assert.equal(c.G.Types.mult('fire',['water','grass']),.96);
  for(const type of Object.keys(chart)){
    const expected=data.probabilities.reduce((sum,{dex,probability})=>{
      let mult=1;for(const defend of c.G.DEX_BY[dex].types){const raw=chart[type][defend]??1;mult*=raw===2?1.6:raw===.5?.6:raw===0?.3:1;}
      return sum+probability*Math.min(2.4,Math.max(.3,mult));
    },0);
    assert.ok(Math.abs(expected-data.coefficients[type])<1e-12,type);
    const outcome=data.outcomes[type];assert.ok(Math.abs(outcome.superEffective+outcome.resisted+outcome.neutral-1)<1e-10);
  }
  const population=c.G.TypingPopulation;
  assert.ok(population.weights.every(([,weight])=>weight>0));
  assert.ok(Math.abs(data.total-population.components.drip-population.components.surge-population.components.bosses)<1e-7);
  assert.ok(population.tiers.every(tier=>Math.abs(tier.castSize-7)<1e-10));
});

test('generated spawn population is reproducible and matches current source files',()=>{
  const {context:c}=load(),crypto=require('node:crypto'),{build}=require('./build-typing-model.cjs');
  for(const [file,hash] of Object.entries(c.G.TypingPopulation.sources))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT,'js',file),'utf8')).digest('hex'),hash,`Regenerate typing population after editing ${file}`);
  assert.deepEqual(JSON.parse(JSON.stringify(c.G.TypingPopulation)),build());
});

test('mechanics explain the CSV benchmark and keep independent typing reference',()=>{
 const {context:c,el,render}=load('mechanics.html');render();const html=el('mechanics').innerHTML;
 assert.ok(html.includes('damage_score from move-dps.csv'));assert.ok(html.includes('not used on the official game website'));
 assert.ok(!html.includes('Damage score formulas'));for(const type of Object.keys(c.G.TypingCoefficient.coefficients))assert.ok(html.includes('>'+type+'</span>'));
});

test('top-sum search agrees with exhaustive subsets, including ties',()=>{
  const {context:c}=load();
  for(const weights of [[7,2,9,5,4,11,1],[1,1,1,1,1,1,1],[-7,-2,-9,-5,-4,-11,-1]])for(const k of [2,3,4]){
    const items=weights.map((value,i)=>({value,move:{id:`move-${i}`}})),all=[];
    const walk=(at,selected)=>{if(selected.length===k){all.push(selected.reduce((sum,i)=>sum+weights[i],0));return;}for(let i=at;i<weights.length;i++)walk(i+1,[...selected,i]);};walk(0,[]);
    all.sort((a,b)=>b-a);
    assert.deepEqual(Array.from(c.MoveCombos.topSums(items,k),s=>s.value),all.slice(0,5));
  }
});

test('buffs boost their own attack side, share channels and Harden adds no damage',()=>{
  const {context:c}=load(), C=c.MoveCombos;
  const sword=C.maxMove('swords-dance'),nasty=C.maxMove('nasty-plot'),dragon=C.maxMove('dragon-dance'),harden=C.maxMove('harden');
  const physical=C.buffMultipliers([sword]);assert.ok(Math.abs(physical.patk-(1+sword.stacks*sword.amount))<1e-8);assert.equal(physical.satk,1);
  const special=C.buffMultipliers([nasty]);assert.ok(special.satk>1);assert.equal(special.patk,1);
  const shared=C.buffMultipliers([sword,dragon]);assert.ok(shared.patk<=physical.patk+1e-8);assert.ok(shared.patk>=1+dragon.stacks*dragon.amount);
  assert.equal(C.dpsInfo(harden).dps,0);assert.equal(C.buffMultipliers([harden]).patk,1);
  const chain=C.maxMove('thunderbolt');assert.ok(Math.abs(C.dpsInfo(chain).dps-chain.dmg/chain.cd*(1-.85**chain.count)/.15)<1e-8);
});

test('combination settings enforce four unique maxed moves, TM choice and Harden',()=>{
  const {context:c}=load(),C=c.MoveCombos,mon=c.G.DEX_BY[25];
  for(const includeTms of [true,false])for(const forceHarden of [true,false])for(const rankBy of ['dps','damageScore']){
    const combos=C.best(mon,{includeTms,forceHarden,rankBy}),allowed=new Set(C.pool(mon,includeTms).map(m=>m.id));
    assert.equal(combos.length,5);assert.equal(new Set(combos.map(x=>x.key)).size,5);
    for(let i=0;i<combos.length;i++){
      const combo=combos[i];assert.equal(new Set(combo.ids).size,4);assert.ok(combo.ids.every(id=>allowed.has(id)));
      if(forceHarden)assert.ok(combo.ids.includes('harden'));
      assert.ok(combo.status.length<=2);assert.ok(combo.ids.every(id=>C.maxMove(id).lvl===5));
      assert.ok(combo.dps>0);if(i)assert.ok(combos[i-1].value>=combo.value);
    }
  }
  const natural=new Set(C.pool(mon,false).map(m=>m.id));assert.ok(C.pool(mon,true).some(m=>!natural.has(m.id)));
});

test('full optimizer matches exhaustive four-move search for a natural pool',()=>{
  const {context:c}=load(),C=c.MoveCombos,mon=c.G.DEX_BY[129],moves=Array.from(C.pool(mon,false));
  const scores=[];
  for(let a=0;a<moves.length-3;a++)for(let b=a+1;b<moves.length-2;b++)for(let d=b+1;d<moves.length-1;d++)for(let e=d+1;e<moves.length;e++){
    const chosen=[moves[a],moves[b],moves[d],moves[e]],buffs=chosen.filter(m=>m.kind==='buff');
    if(buffs.length>2||!chosen.some(m=>m.id==='harden'))continue;
    const mult=C.buffMultipliers(buffs);
    const score=chosen.filter(m=>m.kind!=='buff').reduce((sum,m)=>sum+C.dpsInfo(m).dps*(m.cat==='special'?mon.sa*mult.satk:mon.pa*mult.patk)*(mon.types.length===1&&mon.types[0]===m.type?1.2:1),0);
    scores.push(score);
  }
  scores.sort((a,b)=>b-a);const best=C.best(mon,{includeTms:false,abilityId:'none'});
  for(let i=0;i<5;i++)assert.ok(Math.abs(best[i].dps-scores[i])<1e-7);
});

test('Pokemon combination UI defaults, toggles and score ranking update results',()=>{
  const {context:c,el,render}=load('pokemon-detail.html','?dex=25');render();
  assert.equal(el('combo-tms').checked,true);assert.equal(el('combo-required-harden').checked,c.G.PokemonRankings.rows[25].overallBuild.harden);
  assert.equal(el('combo-rank').value,'damageScore');assert.equal(el('combo-time').value,'1200');assert.equal(el('combo-kills').value,'1000');assert.equal(el('combo-category').value,c.G.DEX_BY[25].pa>c.G.DEX_BY[25].sa?'physical':'special');assert.equal(el('combo-style').value,'ranged');assert.equal((el('combo-results').innerHTML.match(/class="combo-result"/g)||[]).length,5);
  if(c.G.PokemonRankings.rows[25].overallBuild.harden)assert.match(el('combo-results').innerHTML,/Harden/);assert.equal((el('combo-results').innerHTML.match(/class="combo-preview"/g)||[]).length,5);assert.match(el('combo-results').innerHTML,/combo-preview.html\?dex=25/);
  el('combo-tms').checked=false;el('combo-required-harden').checked=false;el('combo-category').value='all';el('combo-style').value='all';el('combo-rank').value='damageScore';el('combo-rank').handlers.change();
  assert.ok(!el('combo-results').innerHTML.includes(' · TM'));
  const first=c.MoveCombos.best(c.G.DEX_BY[25],{includeTms:false,forceHarden:false,rankBy:'damageScore',elapsed:1200,kills:1000})[0];
  for(const id of first.ids)assert.ok(el('combo-results').innerHTML.includes(`move.html?id=${id}`));
});

test('ability damage, start effects, generic bonuses and conditions use game hooks',()=>{
  const {context:c}=load(),A=c.ComboAbilities,C=c.MoveCombos;
  const monFor=id=>c.G.DEX.find(mon=>A.ids(mon).includes(id));
  const factors=(id,move,options={})=>A.factors(A.prepare(monFor(id),{abilityId:id,...options}),C.maxMove(move));
  assert.equal(factors('huge-power','tackle').ability,1.5);
  assert.equal(factors('huge-power','confusion').ability,1);
  assert.equal(factors('adaptability','tackle').ability,1.25);
  assert.equal(factors('technician','poison-sting').ability,1.35);
  assert.equal(factors('technician','tackle').ability,1);
  assert.ok(Math.abs(factors('hustle','tackle').ability-(.3/6+1.25*5/6))<1e-12);
  assert.equal(factors('blaze','ember',{hpPercent:25}).ability,1.35);
  assert.equal(factors('blaze','ember',{hpPercent:100}).ability,1);
  assert.equal(factors('slow-start','tackle',{elapsed:20}).ability,.6);
  assert.equal(factors('slow-start','tackle',{elapsed:120}).ability,1);
  const weatherProfile=A.prepare(monFor('drought'),{abilityId:'drought'});
  assert.equal(weatherProfile.weather,'sun');assert.equal(A.weatherMultiplier(weatherProfile,'fire'),7/6);
  const plot=A.prepare(monFor('prankster'),{abilityId:'prankster'});assert.equal(plot.statusCd,.7);
  const crit=A.prepare(monFor('super-luck'),{abilityId:'super-luck'});assert.ok(Math.abs(crit.critFactor-1.05)<1e-12);
  const imposterMon=monFor('imposter'),before=JSON.stringify(imposterMon),imposter=A.prepare(imposterMon,{abilityId:'imposter'});
  assert.equal(imposter.player.mon.pa,Math.max(imposterMon.atk,1.12));assert.equal(imposter.player.mon.sa,imposter.player.mon.pa);assert.equal(JSON.stringify(imposterMon),before);
  const genericMon=c.G.DEX.find(mon=>A.ids(mon).some(id=>!c.G.AbilityFX.FX[id]));
  const genericId=A.ids(genericMon).find(id=>!c.G.AbilityFX.FX[id]);
  const move=c.G.Moves.ALL.find(m=>m.kind!=='buff'&&m.type===genericMon.types[0]);
  assert.equal(A.factors(A.prepare(genericMon,{abilityId:genericId}),move).ability,1.08);
});

test('all weather summoners average bonuses and penalties over a three-minute cycle',()=>{
  const {context:c}=load(),A=c.ComboAbilities;
  for(const id of ['drought','orichalcum-pulse','drizzle','sand-stream','snow-warning']){
    const mon=c.G.DEX.find(mon=>A.ids(mon).includes(id));
    const profile=A.prepare(mon,{abilityId:id});
    for(const type of ['water','fire','electric','rock','ground','steel','ice','normal']){
      const full=c.G.Weather.KINDS[profile.weather].mult[type]||1;
      assert.equal(A.weatherMultiplier(profile,type),(full*60+120)/180,id+' '+type);
      assert.equal(A.weatherMultiplier(A.prepare(mon,{abilityId:id,weather:profile.weather}),type),full);
      assert.equal(A.weatherMultiplier(A.prepare(mon,{abilityId:id,weather:'none'}),type),1);
    }
  }
});

test('target-dependent abilities average effectiveness jointly in damage scores',()=>{
  const {context:c}=load(),A=c.ComboAbilities;
  const mon=c.G.DEX.find(m=>A.ids(m).includes('tinted-lens')),move=c.MoveCombos.maxMove('bug-buzz');
  const result=A.factors(A.prepare(mon,{abilityId:'tinted-lens'}),move);
  let expected=0;for(const {dex,probability} of c.G.TypingCoefficient.probabilities)expected+=probability*Math.max(1,c.G.Types.mult(move.type,c.G.DEX_BY[dex].types));
  assert.ok(Math.abs(result.typedAbility*c.G.TypingCoefficient.coefficients[move.type]-expected)<1e-10);
  const before=c.G.Weather;
  A.factors(A.prepare(mon,{abilityId:'tinted-lens',weather:'rain'}),move);
  assert.equal(c.G.Weather,before);
});

test('combos include physical/special scaling, mono bonus and ability cooldowns once',()=>{
  const {context:c}=load(),C=c.MoveCombos;
  for(const dex of [25,184,212,289]){
    const mon=c.G.DEX_BY[dex],combos=C.best(mon,{forceHarden:false});
    for(const combo of combos)for(const item of combo.items){
      const profile=combo.profile,m=item.move;
      const attack=profile.player.baseAtk*(m.cat==='special'?profile.player.mon.sa:profile.player.mon.pa)/profile.player.mon.atk;
      const mono=mon.types.length===1&&mon.types[0]===m.type?1.2:1;
      assert.equal(item.attack,attack);assert.equal(item.mono,mono);
      const buff=combo.buffs.atk*combo.buffs[m.cat==='special'?'satk':'patk'];
      const scheduled={...m,cd:item.cooldown};
      assert.ok(Math.abs(item.dps-C.dpsInfo(scheduled).dps*attack*mono*buff*item.ability.ability*item.ability.crit*item.weather)<1e-8);
      const metrics=c.Wiki.metrics(m),ability=metrics.usesTypingCoefficient?item.ability.typedAbility:item.ability.ability;
      assert.ok(Math.abs(item.damageScore-(metrics.benchmarkRawDps/metrics.benchmarkFactor*attack*mono*buff*ability*item.ability.crit*item.weather*m.cd/item.cooldown-metrics.benchmarkPenaltyDps))<1e-7);
    }
  }
  const truant=c.G.DEX.find(m=>c.ComboAbilities.ids(m).includes('truant'));
  assert.equal(c.ComboAbilities.prepare(truant,{abilityId:'truant'}).cdMul,1.6);
});

test('all available Pokemon abilities evaluate without mutating their base stats',()=>{
  const {context:c}=load(),A=c.ComboAbilities;
  for(const mon of c.G.DEX){
    const original=JSON.stringify(mon);
    for(const id of A.ids(mon)){
      const profile=A.prepare(mon,{abilityId:id});
      for(const moveId of ['tackle','confusion']){const f=A.factors(profile,c.MoveCombos.maxMove(moveId));assert.ok(Number.isFinite(f.ability)&&f.ability>0,`${mon.dex}: ${id}`);assert.ok(Number.isFinite(f.typedAbility)&&f.typedAbility>0);}
    }
    assert.equal(JSON.stringify(mon),original);
  }
});

test('move list supports combined filters, stages, numeric ordering and no results',()=>{
  const {context:c,el,render}=load('moves.html');render();assert.match(el('count').textContent,/103 of 103/);
  el('query').value='confusion';el('move-controls').handlers.input();assert.match(el('count').textContent,/1 of 103/);assert.match(el('move-rows').innerHTML,/confusion/);
  el('type').value='fire';el('move-controls').handlers.change();assert.match(el('count').textContent,/0 of/);
  el('query').value='';el('type').value='';el('category').value='physical';el('coverage').value='All directions';el('stage').value='evolved';el('sort').value='damage';el('order').value='desc';el('move-controls').handlers.change();assert.ok(!el('count').textContent.startsWith('0 '));
  el('category').value='';el('coverage').value='';el('move-controls').handlers.change();
  const firstId=el('move-rows').innerHTML.match(/move.html\?id=([^"&]+)/)[1];
  const firstDamage=Math.max(...c.G.Moves.ALL.map(m=>c.Wiki.stages(m.id).at(-1).dmg||0));assert.equal(c.Wiki.stages(firstId).at(-1).dmg,firstDamage);
});

test('every move detail renders including buff and evolution cases',()=>{
  const {context:c,el,render}=load('move.html');
  for(const m of c.G.Moves.ALL){c.location.search=`?id=${m.id}`;render();assert.match(el('detail').innerHTML,/Every stage/);assert.match(el('detail').innerHTML,/In-game effect sprites/);}
  c.location.search='?id=missing';render();assert.match(el('detail').innerHTML,/not found/);
});

test('attack style distinguishes melee from ranged and buffs and combines with category',()=>{
  const {context:c,el,render}=load('moves.html');render();
  for(const style of ['melee','ranged','status']){
    el('attack-style').value=style;el('move-controls').handlers.change();
    const expected=c.G.Moves.ALL.filter(m=>c.G.moveAttackStyle(m)===style);
    assert.equal(el('count').textContent,`${expected.length} of ${c.G.Moves.ALL.length} moves`);
    assert.ok(expected.length>0);
  }
  assert.equal(c.G.moveAttackStyle(c.G.Moves.BY_ID.confusion),'ranged');
  assert.equal(c.G.moveAttackStyle(c.G.Moves.BY_ID.tackle),'melee');
  for(const move of c.G.Moves.ALL.filter(m=>['aura','dash','orbit','shove','spin','mine','trail'].includes(m.kind)))assert.equal(c.G.moveAttackStyle(move),'melee',move.id);
  assert.equal(c.G.moveAttackStyle(c.G.Moves.BY_ID['swords-dance']),'status');
  el('attack-style').value='melee';el('category').value='special';el('move-controls').handlers.change();
  assert.equal(el('count').textContent,`${c.G.Moves.ALL.filter(m=>['melee','aura','dash','orbit','shove','spin','mine','trail'].includes(m.kind)&&m.cat==='special').length} of ${c.G.Moves.ALL.length} moves`);
});

test('multiple family exclusions combine with include filters and clear restores results',()=>{
  const {context:c,el,render}=load('moves.html');render();
  const details=el('family-exclusions').children[0],labels=details.children[2].children;
  const exclude=family=>{const box=labels.find(label=>label.children[0].value===family).children[0];box.checked=true;box.handlers.change();};
  exclude('projectile');exclude('beam');
  assert.equal(el('count').textContent,`${c.G.Moves.ALL.filter(m=>!['projectile','beam'].includes(m.kind)).length} of 103 moves`);
  assert.match(details.children[0].textContent,/2 excluded/);
  el('family').value='beam';el('move-controls').handlers.change();assert.match(el('count').textContent,/^0 of/);
  el('family').value='';details.children[3].handlers.click();assert.equal(el('count').textContent,'103 of 103 moves');assert.match(details.children[0].textContent,/0 excluded/);
});

test('TM search supports multiple family exclusions and clear-all',()=>{
  const {context:c,el}=load();
  for(const file of ['systems/mons.js','data/shop.js'])vm.runInContext(fs.readFileSync(path.join(ROOT,'js',file),'utf8'),c);
  vm.runInContext(fs.readFileSync(path.join(__dirname,'finder-ui.js'),'utf8'),c);
  const details=el('family-exclusions').children[0],labels=details.children[2].children;
  for(const family of ['beam','homing']){const box=labels.find(label=>label.children[0].value===family).children[0];box.checked=true;box.handlers.change();}
  const total=Object.keys(c.G.TM_MOVES).length,expected=Object.keys(c.G.TM_MOVES).filter(id=>!['beam','homing'].includes(c.G.Moves.BY_ID[id].kind)).length;
  assert.ok(el('move-count').textContent.startsWith(`${expected} of ${total}`));
  el('clear-moves').handlers.click();assert.ok(el('move-count').textContent.startsWith(`${total} of ${total}`));assert.match(details.children[0].textContent,/0 excluded/);
});

test('all Pokemon details render, with starter overrides and natural/TM separation',()=>{
  const {context:c,el,render}=load('pokemon-detail.html');
  for(const mon of c.G.DEX){c.location.search=`?dex=${mon.dex}`;render();assert.ok(el('detail').innerHTML.includes(mon.name));assert.match(el('detail').innerHTML,/Natural move pool/);const natural=c.G.Moves.poolFor(mon,true);const extra=c.G.TM_OF(mon.dex).filter(id=>!natural.includes(id));assert.ok(extra.every(id=>c.G.Moves.BY_ID[id]));}
  c.location.search='?dex=54';render();assert.match(el('detail').innerHTML,/move.html\?id=confusion/);
});

test('Pokemon search includes abilities and combines type/rarity filters',()=>{
  const {el,render}=load('pokemon.html');render();assert.match(el('count').textContent,/966 of 966/);
  el('query').value='pikachu';el('pokemon-controls').handlers.input();assert.match(el('count').textContent,/1 of 966/);
  el('type').value='water';el('pokemon-controls').handlers.change();assert.match(el('count').textContent,/0 of/);
  el('query').value='levitate';el('type').value='';el('pokemon-controls').handlers.change();assert.ok(!el('count').textContent.startsWith('0 '));
});

test('mechanics search and all relative HTML links resolve',()=>{
  const {el,render}=load('mechanics.html');render();assert.match(el('mechanics').innerHTML,/0.8/);assert.match(el('mechanics').innerHTML,/bypasses the cap check/);
  el('mechanics-search').value='Arceus';el('mechanics-search').handlers.input();assert.match(el('mechanics').innerHTML,/Judgment/);
  for(const file of fs.readdirSync(__dirname).filter(f=>f.endsWith('.html'))){const html=fs.readFileSync(path.join(__dirname,file),'utf8');for(const match of html.matchAll(/(?:href|src)="([^"#?]+)(?:[?#][^"]*)?"/g)){const target=match[1],base=html.match(/<base href="([^"]+)"/)?.[1]||'.';if(!/^(https?:|data:)/.test(target))assert.ok(fs.existsSync(path.resolve(__dirname,target===base?target:path.join(base,target))),`${file}: ${target}`);}}
});

test('required moves and allowed families constrain every recommendation',()=>{
 const {context:c}=load(),C=c.MoveCombos,mon=c.G.DEX_BY[25];
 const moves=C.pool(mon,true),attack=moves.find(m=>m.kind!=='buff');
 const required=['harden',attack.id];
 const combos=C.best(mon,{requiredMoves:required});assert.equal(combos.length,5);
 for(const combo of combos)for(const id of required)assert.ok(combo.ids.includes(id));
 const families=['buff',attack.kind];
 for(const combo of C.best(mon,{requiredMoves:required,allowedFamilies:families}))assert.ok(combo.ids.every(id=>families.includes(C.maxMove(id).kind)));
 assert.equal(C.best(mon,{requiredMoves:required,allowedFamilies:[]}).length,0);
 assert.equal(C.best(mon,{requiredMoves:['missing']}).length,0);
 const four=moves.filter(m=>m.kind!=='buff').slice(0,4).map(m=>m.id);
 const exact=C.best(mon,{requiredMoves:four});assert.equal(exact.length,1);assert.deepEqual([...exact[0].ids].sort(),[...four].sort());
});

test('combination attack filters retain status moves and constrain damage moves',()=>{
 const {context:c}=load(),C=c.MoveCombos,mon=c.G.DEX_BY[25];
 for(const attackCategory of ['physical','special','all'])for(const attackStyle of ['ranged','melee','all']){
 const combos=C.best(mon,{attackCategory,attackStyle,requiredMoves:['harden']});
 for(const combo of combos){assert.ok(combo.ids.includes('harden'));for(const item of combo.items){if(attackCategory!=='all')assert.equal(item.move.cat,attackCategory);if(attackStyle!=='all')assert.equal(['melee','aura','dash','orbit','shove','spin','mine','trail'].includes(item.move.kind)?'melee':'ranged',attackStyle);}}
 const eligible=C.pool(mon,true).filter(m=>m.kind!=='buff'&&(attackCategory==='all'||m.cat===attackCategory)&&(attackStyle==='all'||(['melee','aura','dash','orbit','shove','spin','mine','trail'].includes(m.kind)?'melee':'ranged')===attackStyle));
 if(eligible.length>=3)assert.ok(combos.length>0);
 }
});

test('combination required moves, families, and live inputs refresh immediately',()=>{
 const {el,render}=load('pokemon-detail.html','?dex=25');render();
 const harden=el('combo-required-harden');harden.checked=true;harden.handlers.change();
 const initial=el('combo-results').innerHTML;harden.checked=false;harden.handlers.change();assert.notEqual(el('combo-results').innerHTML,initial);
 harden.checked=true;harden.handlers.input();assert.match(el('combo-results').innerHTML,/move.html\?id=harden/);
 const buff=el('combo-family-buff');buff.checked=false;buff.handlers.change();assert.match(el('combo-results').innerHTML,/No four-move/);
 buff.checked=true;buff.handlers.input();assert.match(el('combo-results').innerHTML,/class="combo-result"/);
 el('combo-time').value='1500';el('combo-time').handlers.input();el('combo-ability').value='none';el('combo-ability').handlers.change();assert.match(el('combo-summary').innerHTML,/No ability/);
 const source=fs.readFileSync(path.join(__dirname,'wiki-ui.js'),'utf8');assert.ok(source.indexOf('id="combo-ability"')<source.indexOf('<summary>Advanced Settings</summary>'));
});

test('enemy arc defaults to 360 and changing it refreshes all previews',()=>{const {el,render}=load('pokemon-detail.html','?dex=25');render();assert.equal(el('combo-arc').value,'360');assert.match(el('combo-results').innerHTML,/amp;arc=360/);el('combo-arc').value='180';el('combo-arc').handlers.input();assert.equal((el('combo-results').innerHTML.match(/amp;arc=180/g)||[]).length,5);});

test('enemy distance defaults to 100 and refreshes every preview immediately',()=>{const {el,render}=load('pokemon-detail.html','?dex=25');render();assert.equal(el('combo-distance').value,'100');el('combo-distance').value='150';el('combo-distance').handlers.input();assert.equal((el('combo-results').innerHTML.match(/amp;distance=150/g)||[]).length,5);});

test('preview mode switches all canvases immediately',()=>{const {el,render}=load('pokemon-detail.html','?dex=25');render();assert.equal(el('combo-preview-mode').value,'swarm');assert.equal(el('combo-enemy-health').value,'800');assert.equal(el('combo-spawn-rate').value,'20');assert.equal(el('combo-max-enemies').value,'30');el('combo-preview-mode').value='stationary';el('combo-preview-mode').handlers.change();assert.equal((el('combo-results').innerHTML.match(/amp;mode=stationary/g)||[]).length,5);});

test('canvas controls are collapsible and HP and spawn rate propagate to every preview',()=>{const {el,render}=load('pokemon-detail.html','?dex=25');render();el('combo-enemy-health').value='2500';el('combo-spawn-rate').value='2.5';el('combo-spawn-rate').handlers.input();assert.equal((el('combo-results').innerHTML.match(/amp;enemyHp=2500/g)||[]).length,5);assert.equal((el('combo-results').innerHTML.match(/amp;spawnRate=2.5/g)||[]).length,5);const source=fs.readFileSync(path.join(__dirname,'wiki-ui.js'),'utf8');const start=source.indexOf('<summary>Canvas Settings</summary>'),end=source.indexOf('</details>',start);for(const id of ['combo-preview-mode','combo-distance','combo-layers','combo-arc','combo-per-layer','combo-enemy-health','combo-spawn-rate'])assert.ok(source.indexOf('id="'+id+'"',start)<end);});

test('neutral benchmark single-move contributions are not scaled twice',()=>{const {context:c}=load();const mon={...c.G.DEX_BY[25],pa:1,sa:1,atk:1,types:[]};const combos=c.MoveCombos.best(mon,{requiredMoves:['harden'],rankBy:'damageScore',abilityId:'none',weather:'none'});assert.ok(combos.length);for(const combo of combos)for(const item of combo.items){const buff=combo.buffs.atk*combo.buffs[item.move.cat==='special'?'satk':'patk'];assert.ok(Math.abs(item.damageScore-(c.G.MoveDps.rows[item.move.id].raw_dps*buff-(c.G.MoveDps.rows[item.move.id].raw_dps-c.G.MoveDps.rows[item.move.id].damage_score)))<1e-7);}});

test('each recommendation has an Add to Simulation button with the chosen ability and moves',()=>{const {context:c,el,render}=load('pokemon-detail.html','?dex=25');render();assert.equal((el('combo-results').innerHTML.match(/Add to Simulation/g)||[]).length,5);el('combo-add-0').handlers.click();const url=new URL(c.location.href,'https://example.test/');assert.equal(url.pathname,'/simulation.html');assert.equal(url.searchParams.get('add'),'1');assert.equal(url.searchParams.get('dex'),'25');assert.equal(url.searchParams.get('ability'),el('combo-ability').value);assert.equal(new Set(url.searchParams.get('moves').split(',')).size,4);if(c.G.PokemonRankings.rows[25].overallBuild.harden)assert.ok(url.searchParams.get('moves').split(',').includes('harden'));});

test('each move selects the strongest eligible attack stat after matching mono bonus',()=>{const {context:c}=load();for(const move of c.G.Moves.ALL){const best=c.Wiki.bestMoveUser(move.id);assert.ok(best,move.id);let max=-Infinity,lowest=Infinity,rarity=-Infinity;for(const mon of c.G.DEX){const eligible=c.G.Moves.poolFor(mon,true).includes(move.id)||c.G.baseStartOf(mon.dex)===move.id||c.G.TM_OF(mon.dex).includes(move.id);if(!eligible)continue;const attack=move.cat==='physical'?mon.pa:move.cat==='special'?mon.sa:move.stat==='satk'?mon.sa:move.stat==='patk'?mon.pa:Math.max(mon.pa,mon.sa);const score=attack*(mon.types.length===1&&mon.types[0]===move.type?1.2:1);if(score>max+1e-12){max=score;lowest=mon.dex;rarity=mon.rarity;}else if(Math.abs(score-max)<1e-12&&(mon.rarity>rarity||(mon.rarity===rarity&&mon.dex<lowest))){lowest=mon.dex;rarity=mon.rarity;}}assert.ok(Math.abs(best.multiplier-max)<1e-12,move.id);assert.equal(best.mon.dex,lowest,move.id);}});
test('move pages have a single-move max-stage live preview with no ability',()=>{const {context:c,el,render}=load('move.html','?id=ember');render();const html=el('detail').innerHTML;assert.match(html,/Move simulation/);const src=html.match(/src="(combo-preview.html[^"]+)"/)[1].replaceAll('&amp;','&');const url=new URL(src,'https://example.test/');assert.equal(url.searchParams.get('single'),'1');assert.equal(url.searchParams.get('moves'),'ember');assert.equal(Number(url.searchParams.get('dex')),c.Wiki.bestMoveUser('ember').mon.dex);assert.equal(JSON.parse(url.searchParams.get('conditions')).abilityId,'none');assert.equal(JSON.parse(url.searchParams.get('conditions')).weather,'none');assert.equal(url.searchParams.get('spawnRate'),'15');assert.equal(url.searchParams.get('enemyHp'),'100');assert.equal(url.searchParams.get('maxEnemies'),'25');assert.equal(url.searchParams.get('contactPenalty'),'1');});

test('Pokemon Canvas Settings reset restores defaults without changing build controls',()=>{const {el,render}=load('pokemon-detail.html','?dex=25');render();el('combo-ability').value='none';el('combo-enemy-health').value='9999';el('combo-spawn-rate').value='99';el('combo-max-enemies').value='1';el('combo-preview-mode').value='stationary';el('combo-arc').value='180';el('combo-arc').handlers.input();el('combo-reset-canvas').handlers.click();assert.equal(el('combo-enemy-health').value,'800');assert.equal(el('combo-spawn-rate').value,'20');assert.equal(el('combo-max-enemies').value,'30');assert.equal(el('combo-preview-mode').value,'swarm');assert.equal(el('combo-arc').value,'360');assert.equal(el('combo-ability').value,'none');assert.equal((el('combo-results').innerHTML.match(/amp;enemyHp=800/g)||[]).length,5);});

test('Pokémon tier filtering, score-rank sorting and best-build detail render',()=>{const {context:c,el,render}=load('pokemon.html');render();el('ranking-type').value='damage';el('tier').value='S';el('pokemon-controls').handlers.change();assert.equal(el('count').textContent,c.G.PokemonRankings.counts.S+' of 966 Pokémon');el('tier').value='';el('sort').value='rank';el('order').value='desc';el('pokemon-controls').handlers.change();const expected=Object.values(c.G.PokemonRankings.rows).sort((a,b)=>a.rank-b.rank||a.dex-b.dex)[0];const cards=el('pokemon-list').children[0].children;assert.equal(cards[0].href,'pokemon-detail.html?dex='+expected.dex);const detail=load('pokemon-detail.html','?dex=25');detail.render();assert.match(detail.el('detail').innerHTML,/Damage ranking/);assert.match(detail.el('detail').innerHTML,/Add ranked build to Simulation/);});

test('every available ability description and secondary effect has an English translation',()=>{const {context:c}=load();for(const mon of c.G.DEX)for(const id of c.ComboAbilities.ids(mon)){const fx=c.G.AbilityFX.of(id,mon);for(const key of ['d','d2'])if(fx[key]){assert.ok(c.WIKI_EN[fx[key]],mon.dex+': '+id+' '+key);const text=c.Wiki.tr(fx[key]);assert.ok(!/\b(?:daño|vida|movimientos|velocidad|recibe|mitad|golpes|enemigos|poca|cuando|alrededor)\b/iu.test(text),text);}}});
test('type-specific ability translations retain their effects and percentages',()=>{const {context:c}=load();assert.equal(c.Wiki.tr('+35 % de daño de tipo Planta con poca vida (menos de 1/3).'),'+35% Grass-type damage while below one-third HP.');assert.equal(c.Wiki.tr('+8 % de daño con movimientos de tipo Bicho.'),'+8% damage with Bug-type moves.');assert.match(c.Wiki.tr('Los ataques de tipo Eléctrico no le hacen daño: le curan un poco.'),/^Electric-type attacks deal no damage/);assert.match(c.Wiki.tr('+40 % de daño de tipo Agua y recibe la mitad de daño de Fuego.'),/40% Water-type damage.*half damage from Fire-type/);});

test('all four rankings sort best first on Highest first and worst first on Lowest first',()=>{const {context:c,el,render}=load('pokemon.html');render();for(const [key,kind] of [['rank','damage'],['healthRank','health'],['speedRank','speed'],['overallRank','overall']]){el('sort').value=key;el('order').value='desc';el('pokemon-controls').handlers.change();let cards=el('pokemon-list').children[0].children;const rank=dex=>c.G.PokemonRankings.rows[dex][kind+'Rank'];const dex=card=>Number(card.href.split('=')[1]);for(let i=1;i<cards.length;i++)assert.ok(rank(dex(cards[i]))>=rank(dex(cards[i-1])));el('order').value='asc';el('pokemon-controls').handlers.change();cards=el('pokemon-list').children[0].children;for(let i=1;i<cards.length;i++)assert.ok(rank(dex(cards[i]))<=rank(dex(cards[i-1])));el('ranking-type').value=kind;el('tier').value='S';el('pokemon-controls').handlers.change();assert.equal(el('count').textContent,c.G.PokemonRankings.countsByRanking[kind].S+' of 966 Pokémon');el('tier').value='';}});

test('recommendations default to the ability with the best number-one damage score',()=>{for(const dex of [25,150,183,184,212,289]){const {context:c,el,render}=load('pokemon-detail.html','?dex='+dex);render();const mon=c.G.DEX_BY[dex],ids=c.ComboAbilities.ids(mon),base={includeTms:true,requiredMoves:c.G.PokemonRankings.rows[dex].overallBuild.harden?['harden']:[],attackCategory:mon.pa>mon.sa?'physical':'special',attackStyle:'ranged',rankBy:'damageScore',hpPercent:100,enemyHpPercent:100,elapsed:1200,kills:1000,weather:'auto'};const scores=ids.map(abilityId=>({abilityId,score:c.MoveCombos.best(mon,{...base,abilityId})[0]?.damageScore??-Infinity}));const chosen=scores.find(x=>x.abilityId===el('combo-ability').value);assert.ok(chosen);assert.ok(chosen.score>=Math.max(...scores.map(x=>x.score))-1e-8);el('combo-ability').value='none';el('combo-ability').handlers.change();el('combo-tms').checked=false;el('combo-tms').handlers.change();assert.equal(el('combo-ability').value,'none');}});

test('equal attack multipliers default recommendations to special attacks',()=>{
 const {context:c,el,render}=load('pokemon-detail.html','?dex=25');
 c.G.DEX_BY[25].pa=c.G.DEX_BY[25].sa;
 render();
 assert.equal(el('combo-category').value,'special');
});

test('winning no-Harden build removes default requirement and shows the damage reduction reminder',()=>{
 const {context:c}=load();
 for(const high of [false,true]){
  const mon=c.G.DEX.find(m=>(!c.G.PokemonRankings.rows[m.dex].overallBuild.harden)===high);
  assert.ok(mon);
  const page=load('pokemon-detail.html','?dex='+mon.dex);page.render();
  assert.equal(page.el('combo-required-harden').checked,!high);
  const html=page.el('detail').innerHTML;
  assert.equal(html.includes('To make this build work, max out the Damage Reduction upgrade in each run.'),high);
 }
});

test('Pokemon list defaults to best overall ranking and displays named rarities',()=>{const {context:c,el,render}=load('pokemon.html');render();assert.equal(el('sort').value,'overallRank');assert.equal(el('order').value,'desc');assert.equal(el('ranking-type').value,'overall');const cards=el('pokemon-list').children[0].children;const ranks=cards.map(card=>c.G.PokemonRankings.rows[Number(card.href.split('=')[1])].overallRank);for(let i=1;i<ranks.length;i++)assert.ok(ranks[i]>=ranks[i-1]);for(const card of cards)assert.match(card.children[1].innerHTML,/Common|Uncommon|Rare|Epic|Legendary/);const html=fs.readFileSync(path.join(__dirname,'pokemon.html'),'utf8');assert.doesNotMatch(html,/\d stars/);const detail=load('pokemon-detail.html','?dex=25');detail.render();assert.match(detail.el('detail').innerHTML,/Common|Uncommon|Rare|Epic|Legendary/);assert.doesNotMatch(detail.el('detail').innerHTML,/★|Rarity \d\/5/);});

test('Best damage build preview shares canvas settings but keeps its ranked moves and ability',()=>{
 const {context:c,el,render}=load('pokemon-detail.html','?dex=25');render();
 assert.match(el('detail').innerHTML,/id="best-build-preview"/);
 const build=c.G.PokemonRankings.rows[25].overallBuild;
 const params=()=>new URL(el('best-build-preview').src,'https://example.test/').searchParams;
 assert.equal(params().get('moves'),build.moves.join(','));
 assert.equal(JSON.parse(params().get('conditions')).abilityId,build.abilityId);
 assert.equal(params().get('enemyHp'),'800');assert.equal(params().get('maxEnemies'),'30');
 const fields={'combo-max-enemies':['maxEnemies','64'],'combo-enemy-health':['enemyHp','1200'],'combo-spawn-rate':['spawnRate','12'],'combo-preview-mode':['mode','stationary'],'combo-distance':['distance','150'],'combo-arc':['arc','180'],'combo-layers':['layers','3'],'combo-per-layer':['perLayer','12']};
 for(const [id,[key,value]] of Object.entries(fields)){el(id).value=value;el(id).handlers.input();assert.equal(params().get(key),value);assert.ok(el('combo-results').innerHTML.includes(key+'='+value));}
 const before=el('best-build-preview').src;
 el('combo-ability').value='none';el('combo-ability').handlers.change();
 assert.equal(el('best-build-preview').src,before);
 el('combo-reset-canvas').handlers.click();
 assert.equal(params().get('enemyHp'),'800');assert.equal(params().get('maxEnemies'),'30');assert.equal(params().get('mode'),'swarm');assert.equal(params().get('moves'),build.moves.join(','));
});

test('recommendation family choices persist across Pokemon and refreshes without Canvas Reset clearing them',()=>{
 const data=new Map(),storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};
 const first=load('pokemon-detail.html','?dex=25',storage);first.render();
 first.el('combo-family-spin').checked=false;first.el('combo-family-spin').handlers.change();
 first.el('combo-family-melee').checked=false;first.el('combo-family-melee').handlers.input();
 const next=load('pokemon-detail.html','?dex=150',storage);next.render();
 assert.equal(next.el('combo-family-spin').checked,false);assert.equal(next.el('combo-family-melee').checked,false);
 assert.equal(next.el('combo-family-projectile').checked,true);
 next.el('combo-reset-canvas').handlers.click();assert.equal(next.el('combo-family-spin').checked,false);
 next.el('combo-family-spin').checked=true;next.el('combo-family-spin').handlers.change();
 const refreshed=load('pokemon-detail.html','?dex=25',storage);refreshed.render();
 assert.equal(refreshed.el('combo-family-spin').checked,true);assert.equal(refreshed.el('combo-family-melee').checked,false);
});
test('invalid or unavailable preference storage does not break recommendations',()=>{
 for(const storage of [{getItem:()=>'{bad',setItem:()=>{}},{getItem:()=>{throw Error('blocked');},setItem:()=>{throw Error('blocked');}}]){
  const page=load('pokemon-detail.html','?dex=25',storage);page.render();assert.equal(page.el('combo-family-spin').checked,true);
  page.el('combo-family-spin').checked=false;assert.doesNotThrow(()=>page.el('combo-family-spin').handlers.change());
 }
});
