const test=require('node:test');
const assert=require('node:assert/strict');
const {settings,runTrial,aggregate,csv,createRuntime}=require('./run.cjs');
test('single-move benchmark is reproducible and measures capped HP damage',()=>{
 const options=settings({duration:'20',warmup:'0','enemy-hp':'100',seed:'123'});
 const a=runTrial('ember',options),b=runTrial('ember',options);
 assert.deepEqual(a,b);assert.ok(a.raw_damage>0);assert.ok(a.kills>0);
 assert.equal(a.damage_score,a.total_damage/a.seconds);assert.equal(a.average_dps_per_enemy,a.raw_damage/a.enemy_seconds);
 assert.ok(a.total_damage<=100*(1+Math.floor(20*options.spawnRate)));
 assert.ok(a.average_living_enemies<=options.maxEnemies+1e-8);
});
test('status-only move has no direct damage and warm-up is excluded from results',()=>{
 const options=settings({duration:'2',warmup:'10'}),r=runTrial('harden',options);
 assert.equal(r.raw_damage,0);assert.equal(r.total_damage,-r.contact_penalty);assert.ok(r.damage_score<=0);assert.equal(r.average_dps_per_enemy,0);assert.ok(Math.abs(r.seconds-2)<1e-8);
 assert.ok(r.enemy_seconds>0&&r.enemy_seconds<=options.maxEnemies*r.seconds+1e-8);assert.equal(r.level,5);
});
test('aggregation weights measured time and enemy exposure rather than averaging ratios',()=>{
 const a={move_id:'x',seconds:2,total_damage:100,raw_damage:120,contact_penalty:20,contact_removals:1,enemy_seconds:4,kills:1};
 const b={move_id:'x',seconds:4,total_damage:300,raw_damage:400,contact_penalty:100,contact_removals:2,enemy_seconds:12,kills:3};
 const row=aggregate([a,b]);assert.equal(row.damage_score,400/6);assert.equal(row.average_dps_per_enemy,32.5);assert.equal(row.kills,4);
 assert.equal(csv([{move:'A, B',value:1.234}]),'move,value\n"A, B",1.23\n');
});
test('benchmark shares the preview core and validates move limits',()=>{
 const c=createRuntime(42).context;
 assert.throws(()=>c.ComboPreview.create(25,[]));
 const scene=c.ComboPreview.create(25,['ember'],{mode:'swarm',singleMove:true});
 scene.step(1/60);assert.equal(scene.moves.length,1);assert.equal(scene.moves[0].lvl,5);assert.ok(scene.enemySeconds>0);
 assert.throws(()=>settings({fps:'0'}));assert.throws(()=>settings({'spawn-rate':'-1'}));
 assert.throws(()=>runTrial('missing',settings()));
});

test('neutral benchmark removes species attack, mono bonus, ability and weather',()=>{
 const o=settings({neutral:true,weather:'sun',ability:'static'});assert.equal(o.neutralStats,true);assert.equal(o.spawnRate,15);assert.equal(o.enemyHp,100);assert.equal(o.maxEnemies,25);assert.equal(o.contactPenalty,true);assert.equal(o.conditions.abilityId,'none');assert.equal(o.conditions.weather,'none');
 for(const dex of [25,150]){const c=createRuntime(42).context,original=JSON.stringify(c.G.DEX_BY[dex]);const scene=c.ComboPreview.create(dex,['ember'],{singleMove:true,mode:'swarm',neutralStats:true,conditions:o.conditions,spawnRate:35,enemyHp:1500,layers:6,perLayer:24});
 assert.equal(scene.player.mon.pa,1);assert.equal(scene.player.mon.sa,1);assert.equal(scene.player.critChance,0);assert.equal(scene.player.mon.types.length,0);assert.equal(scene.player.atkFor({cat:'physical',type:'electric'}),1);assert.equal(scene.player.atkFor({cat:'special',type:'psychic'}),1);assert.equal(c.G.Weather.mult('fire'),1);assert.equal(scene.enemy.maxHp,1500);assert.equal(JSON.stringify(c.G.DEX_BY[dex]),original);}
 const c=createRuntime(42).context,scene=c.ComboPreview.create(25,['harden'],{singleMove:true,mode:'swarm',neutralStats:true,conditions:o.conditions,spawnRate:35,layers:6,perLayer:24});for(let i=0;i<60;i++)scene.step(1/60);assert.equal(scene.enemies.length,36);
});
