const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.resolve(__dirname,'..');
function runtime(){
 const ctx=new Proxy({},{get:(o,k)=>k in o?o[k]:()=>{},set:(o,k,v)=>(o[k]=v,true)});
 const c={performance:{now:()=>1000},console,Image:class{constructor(){this.complete=true;this.naturalWidth=64;this.naturalHeight=64;}set src(v){this._src=v;this.onload?.();}get src(){return this._src;}},document:{createElement:()=>({getContext:()=>ctx})},G:{DB:{save:{ptm:{}}}}};c.window=c;vm.createContext(c);
 for(const name of ['core/util','core/camera','data/pokedex','data/moves','data/sprites-meta','core/sprites','data/abilities','data/ability-fx','systems/weather'])vm.runInContext(fs.readFileSync(path.join(root,'js',name+'.js'),'utf8'),c);
 c.G.Settings={fx:1,get:key=>key==='dmgNumbers'};for(const name of ['entities/vfx','entities/fx','entities/projectile','systems/combat'])vm.runInContext(fs.readFileSync(path.join(root,'js',name+'.js'),'utf8'),c);
 vm.runInContext(fs.readFileSync(path.join(__dirname,'combo-abilities.js'),'utf8'),c);
 const source=fs.readFileSync(path.join(__dirname,'combo-preview.js'),'utf8');vm.runInContext(source.slice(0,source.indexOf('\n(() => {')),c);return {c,ctx};
}
test('every max-stage move runs and draws with immortal stationary preview actors',()=>{
 const {c,ctx}=runtime();
 for(const move of c.G.Moves.ALL){
  const ids=[move.id,...c.G.Moves.ALL.filter(m=>m.id!==move.id).slice(0,3).map(m=>m.id)];
  const scene=c.ComboPreview.create(25,ids);const start=[scene.player.x,scene.player.y,scene.enemy.x,scene.enemy.y];
  for(let i=0;i<360;i++)scene.step(1/60);
  scene.draw(ctx);scene.player.hurt(1e9);scene.enemy.hurt(1e9);scene.player.x=500;scene.enemy.y=-500;
  assert.deepEqual([scene.player.x,scene.player.y,scene.enemy.x,scene.enemy.y],start,move.id);
  assert.equal(scene.player.hp,Infinity);assert.equal(scene.enemy.hp,Infinity);assert.equal(scene.enemy.dead,false);
  for(const m of scene.moves){assert.equal(m.lvl,c.G.Moves.BY_ID[m.id].maxLvl);const expected=c.G.Moves.instance(m.id,m.lvl);c.G.Moves.evolve(expected);assert.equal(!!m.evolved,!!expected.evolved);}
  assert.ok(c.G.Projectiles.count<500,move.id);assert.ok(c.G.Combat.fieldCount<150,move.id);
 }
});
test('preview scenes reset isolated combat state and reject invalid inputs',()=>{const {c}=runtime();assert.throws(()=>c.ComboPreview.create(25,[]));assert.throws(()=>c.ComboPreview.create(999999,['harden','tackle','ember','confusion']));const ids=c.G.Moves.ALL.slice(0,4).map(m=>m.id),first=c.ComboPreview.create(25,ids);first.step(.02);const second=c.ComboPreview.create(25,ids);assert.equal(c.G.Projectiles.count,0);assert.equal(c.G.Combat.fieldCount,0);assert.notEqual(first.moves[0],second.moves[0]);});

test('full preview startup plays automatically without controls or motion preferences',async()=>{
 const {c,ctx}=runtime();let scheduled,draws=0;ctx.clearRect=()=>draws++;
 const nodes={preview:{getContext:()=>ctx},error:{hidden:true}};
 c.document.getElementById=id=>nodes[id];c.document.addEventListener=()=>{};c.document.hidden=false;
 c.location={search:'?dex=25&moves='+encodeURIComponent(c.G.Moves.ALL.slice(0,4).map(m=>m.id).join(','))};
 c.URLSearchParams=URLSearchParams;c.parent={};c.addEventListener=()=>{};c.requestAnimationFrame=fn=>(scheduled=fn,1);c.cancelAnimationFrame=()=>{};
 c.G.Sprites.preload=()=>Promise.resolve();c.matchMedia=()=>({matches:true});
 const source=fs.readFileSync(path.join(__dirname,'combo-preview.js'),'utf8');vm.runInContext(source.slice(source.indexOf('\n(() => {')),c);
 assert.equal(nodes.error.hidden,true);assert.equal(typeof scheduled,'function');const before=draws;scheduled(100);scheduled(120);assert.ok(draws>before);await Promise.resolve();
 const html=fs.readFileSync(path.join(__dirname,'combo-preview.html'),'utf8');assert.ok(!html.includes('<button'));assert.ok(!html.includes('<footer'));assert.match(html,/overflow:hidden/);
 const ui=fs.readFileSync(path.join(__dirname,'wiki-ui.js'),'utf8');assert.ok(!ui.includes('sandbox="allow-scripts"'));assert.match(ui,/scrolling="no"/);
});

test('enemy rings have equal distances and angles and live DPS counts resolved damage',()=>{
 const {c}=runtime(),ids=c.G.Moves.ALL.slice(0,4).map(m=>m.id),scene=c.ComboPreview.create(25,ids,{layers:3,perLayer:7});
 assert.equal(scene.enemies.length,21);
 for(let layer=0;layer<3;layer++)for(let i=0;i<7;i++){const e=scene.enemies[layer*7+i],r=100+60*layer,a=-Math.PI/2+i*2*Math.PI/7;assert.ok(Math.abs(e.x-scene.player.x-Math.cos(a)*r)<1e-8);assert.ok(Math.abs(e.y-scene.player.y-Math.sin(a)*r)<1e-8);}
 scene.step(1);const before=scene.totalDamage;scene.enemies[0].hurt(100);assert.equal(scene.totalDamage,before+100);assert.ok(scene.dps()>=100);
 for(let i=0;i<600;i++)scene.step(1/60);assert.ok(Number.isFinite(scene.dps()));assert.ok(scene.totalDamage>100);
});

test('displayed DPS refreshes once per second and uses a longer measurement window',()=>{
 const {c}=runtime(),ids=c.G.Moves.ALL.slice(0,4).map(m=>m.id),scene=c.ComboPreview.create(25,ids);
 scene.step(1);const previous=scene.displayedDps;scene.enemy.hurt(1000);scene.step(.1);assert.equal(scene.displayedDps,previous);
 scene.step(.9);assert.ok(scene.displayedDps>previous);assert.equal(scene.displayedDps,scene.dps());
 const source=fs.readFileSync(path.join(__dirname,'combo-preview.js'),'utf8');assert.ok(!source.includes('Last 5 seconds'));assert.match(source,/Math.min\(15,time\)/);
});

test('partial arcs are evenly spaced above the player with no full-circle duplicates',()=>{
 const {c}=runtime(),ids=c.G.Moves.ALL.slice(0,4).map(m=>m.id);
 for(const arc of [90,180,270,360])for(const perLayer of [1,2,8]){
 const scene=c.ComboPreview.create(25,ids,{layers:2,perLayer,arc});
 for(let layer=0;layer<2;layer++)for(let i=0;i<perLayer;i++){const e=scene.enemies[layer*perLayer+i],r=100+layer*60;const a=arc===360?-Math.PI/2+i*2*Math.PI/perLayer:-Math.PI/2-arc*Math.PI/360+(i+.5)*arc*Math.PI/180/perLayer;assert.ok(Math.abs(e.x-scene.player.x-r*Math.cos(a))<1e-8);assert.ok(Math.abs(e.y-scene.player.y-r*Math.sin(a))<1e-8);if(arc<=180)assert.ok(e.y<=scene.player.y+1e-8);}
 assert.equal(new Set(scene.enemies.map(e=>e.x.toFixed(6)+','+e.y.toFixed(6))).size,2*perLayer);
 }
});

test('configurable enemy distance preserves layer spacing and clamps limits',()=>{
 const {c}=runtime(),ids=c.G.Moves.ALL.slice(0,4).map(m=>m.id);
 for(const [input,expected] of [[25,25],[150,150],[400,400],[-10,25],[900,400]]){const scene=c.ComboPreview.create(25,ids,{distance:input,layers:3,perLayer:5,arc:180});for(let i=0;i<scene.enemies.length;i++){const e=scene.enemies[i];assert.ok(Math.abs(Math.hypot(e.x-scene.player.x,e.y-scene.player.y)-(expected+Math.floor(i/5)*60))<1e-8);}}
});

test('near-full arcs leave at least normal neighbour spacing across the opening',()=>{
 const {c}=runtime(),ids=c.G.Moves.ALL.slice(0,4).map(m=>m.id);
 for(const arc of [300,340,350,359,359.9]){const scene=c.ComboPreview.create(25,ids,{arc,perLayer:8});const es=scene.enemies;const gap=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);const adjacent=gap(es[0],es[1]);assert.ok(gap(es[0],es[7])>=adjacent-1e-8);assert.ok(gap(es[0],es[7])>64);for(let i=1;i<7;i++)assert.ok(Math.abs(gap(es[i],es[i+1])-adjacent)<1e-8);}
});

test('swarm enemies move, die without overkill DPS, and respawn within the population cap',()=>{
 const {c}=runtime(),ids=c.G.Moves.ALL.filter(m=>m.kind==='buff').slice(0,4).map(m=>m.id);
 const scene=c.ComboPreview.create(25,ids,{mode:'swarm',distance:200,layers:2,perLayer:4,arc:180});assert.equal(scene.enemies.length,1);
 const e=scene.enemies[0],distance=()=>Math.hypot(e.x-scene.player.x,e.y-scene.player.y),before=distance();scene.step(.1);assert.ok(distance()<before);
 const original=scene.totalDamage;e.hurt(1e9);assert.equal(e.dead,true);assert.equal(e.hp,0);assert.equal(scene.kills,1);assert.equal(scene.totalDamage-original,1000);
 assert.ok(!c.G.EnemyMgr.all().includes(e));e.hurt(1e9);assert.equal(scene.kills,1);
 for(let i=0;i<120;i++)scene.step(1/60);assert.equal(scene.enemies.length,8);assert.ok(!scene.enemies.includes(e));
 assert.equal(scene.player.hp,Infinity);assert.equal(scene.player.x,0);assert.equal(scene.player.y,65);assert.ok(Number.isFinite(scene.dps()));
});
test('swarm combat remains bounded while dealing damage and defeating enemies',()=>{
 const {c,ctx}=runtime(),ids=c.G.Moves.ALL.filter(m=>m.kind!=='buff').slice(0,4).map(m=>m.id);const scene=c.ComboPreview.create(25,ids,{mode:'swarm',perLayer:12});
 for(let i=0;i<3600;i++)scene.step(1/60);scene.draw(ctx);assert.ok(scene.totalDamage>0);assert.ok(scene.kills>0);assert.ok(scene.enemies.length<=12);assert.ok(scene.enemies.every(e=>Number.isFinite(e.x)&&Number.isFinite(e.y)));assert.ok(Number.isFinite(scene.dps()));
});

test('swarm spawns use the actual camera outer radius with game ring offsets',()=>{const {c}=runtime(),ids=c.G.Moves.ALL.filter(m=>m.kind==='buff').slice(0,4).map(m=>m.id);for(let i=0;i<20;i++){const scene=c.ComboPreview.create(25,ids,{mode:'swarm',enemyHp:2500});const e=scene.enemies[0],d=Math.hypot(e.x-scene.player.x,(e.y-scene.player.y)/.9);assert.ok(d>=c.G.Camera.outerRadius()+10-1e-8);assert.ok(d<=c.G.Camera.outerRadius()+70+1e-8);assert.equal(e.hp,2500);assert.equal(e.maxHp,2500);}});
test('spawn frequency controls arrivals and both modes show hit damage numbers',()=>{const {c}=runtime(),ids=c.G.Moves.ALL.filter(m=>m.kind==='buff').slice(0,4).map(m=>m.id);for(const [rate,count] of [[1,3],[4,9]]){const scene=c.ComboPreview.create(25,ids,{mode:'swarm',spawnRate:rate,layers:6,perLayer:24});for(let i=0;i<120;i++)scene.step(1/60);assert.equal(scene.enemies.length,count);}for(const mode of ['stationary','swarm']){const scene=c.ComboPreview.create(25,ids,{mode});let value;c.G.FX.dmgText=(_x,_y,n)=>{value=n;};scene.enemy.hurt(123);assert.equal(value,123);}});

test('average DPS per enemy uses enemy time and shares the display refresh cadence',()=>{
 const {c}=runtime(),ids=c.G.Moves.ALL.filter(m=>m.kind==='buff').slice(0,4).map(m=>m.id);
 let scene=c.ComboPreview.create(25,ids,{perLayer:4});assert.equal(scene.perEnemyDps(),0);scene.step(1);scene.enemy.hurt(400);assert.equal(scene.perEnemyDps(),scene.dps()/4);const displayed=scene.displayedPerEnemyDps;scene.step(.2);assert.equal(scene.displayedPerEnemyDps,displayed);scene.step(.8);assert.equal(scene.displayedPerEnemyDps,scene.perEnemyDps());
 scene=c.ComboPreview.create(25,ids,{mode:'swarm',spawnRate:.1});scene.step(1);scene.enemy.hurt(100);assert.equal(scene.perEnemyDps(),100);scene.enemy.hurt(900);scene.step(1);assert.equal(scene.perEnemyDps(),1000);assert.ok(Number.isFinite(scene.perEnemyDps()));
});

test('single-move URL boots the live preview without requiring four moves',async()=>{const {c,ctx}=runtime();const nodes={preview:{getContext:()=>ctx},error:{hidden:true}};c.document.getElementById=id=>nodes[id];c.document.addEventListener=()=>{};c.location={search:'?dex=25&moves=ember&single=1&conditions='+encodeURIComponent(JSON.stringify({abilityId:'none',weather:'none'}))};c.URLSearchParams=URLSearchParams;c.parent={};c.addEventListener=()=>{};let scheduled;c.requestAnimationFrame=fn=>(scheduled=fn,1);c.cancelAnimationFrame=()=>{};c.G.Sprites.preload=()=>Promise.resolve();const source=fs.readFileSync(path.join(__dirname,'combo-preview.js'),'utf8');vm.runInContext(source.slice(source.indexOf('\n(() => {')),c);assert.equal(nodes.error.hidden,true);assert.equal(typeof scheduled,'function');scheduled(100);await Promise.resolve();});

test('explicit swarm limit supports twenty enemies independently of stationary layers',()=>{const {c}=runtime(),scene=c.ComboPreview.create(25,['harden'],{singleMove:true,mode:'swarm',enemyHp:800,spawnRate:15,layers:1,perLayer:8,maxEnemies:20,conditions:{abilityId:'none'}});for(let i=0;i<180;i++)scene.step(1/60);assert.equal(scene.enemies.length,20);assert.ok(scene.enemies.every(e=>e.maxHp===800));});

test('benchmark contact subtracts remaining HP once and removes without a kill',()=>{const {c}=runtime(),scene=c.ComboPreview.create(25,['harden'],{singleMove:true,mode:'swarm',neutralStats:true,enemyHp:150,spawnRate:4,maxEnemies:6,contactPenalty:true,conditions:{abilityId:'none',weather:'none'}});const e=scene.enemy;e.hurt(40);e.x=scene.player.x+scene.player.r+e.r+.1;e.y=scene.player.y;scene.step(1/60);assert.equal(scene.totalDamage,40);assert.equal(scene.contactPenalty,110);assert.equal(scene.netDamage,-70);assert.equal(scene.contacts,1);assert.equal(scene.kills,0);assert.equal(e.dead,true);scene.step(1/60);assert.equal(scene.contactPenalty,110);assert.ok(!scene.enemies.includes(e));});
test('killed enemies cause no contact penalty and live previews retain non-contact behaviour',()=>{const {c}=runtime();let scene=c.ComboPreview.create(25,['harden'],{singleMove:true,mode:'swarm',enemyHp:150,contactPenalty:true});scene.enemy.x=scene.player.x;scene.enemy.y=scene.player.y;scene.enemy.hurt(150);scene.step(1/60);assert.equal(scene.contactPenalty,0);assert.equal(scene.kills,1);scene=c.ComboPreview.create(25,['harden'],{singleMove:true,mode:'swarm',enemyHp:150});scene.enemy.x=scene.player.x;scene.enemy.y=scene.player.y;scene.step(1/60);assert.equal(scene.contactPenalty,0);assert.equal(scene.enemy.dead,false);});
