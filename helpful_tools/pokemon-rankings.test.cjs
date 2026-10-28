'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const {load,options,tierForRank,hardenOptions,overallScore,selectOverallBuild}=require('./build-pokemon-rankings.cjs');
function setup(){const {c}=load();vm.runInContext(fs.readFileSync(path.join(__dirname,'pokemon-rankings.js'),'utf8'),c);return c;}

test('overall weights are always 65/25/10',()=>{assert.equal(overallScore({damageRank:100,healthRank:200,speedRank:400}),155);});

test('no-Harden evaluation starts at exactly 130 effective HP',()=>{
 const c=setup(),rows=Object.values(c.G.PokemonRankings.rows),original=c.MoveCombos.best;
 const calls=[];
 c.MoveCombos.best=(mon,options)=>{calls.push(options.requiredMoves.includes('harden'));return original(mon,options);};
 for(const hp of [129.999,130]){
  calls.length=0;
  selectOverallBuild(c.G.DEX_BY[25],c,rows.map(row=>row.dex===25?{...row,healthScore:hp}:row));
  assert.ok(calls.includes(true));
  assert.equal(calls.includes(false),hp>=130);
 }
});

test('damage ranking requires Harden regardless of effective HP',()=>{
 for(const hp of [1,149.999,150,150.001,1000]){
  assert.deepEqual(hardenOptions({hp},{G:{Stats:{taken:()=>1}}}),{forceHarden:true,requiredMoves:['harden'],excludedMoves:[]});
 }
});

test('speed ranks faster Pokemon first and gives equal speeds the same rank and tier',()=>{
 const c=setup(),rows=Object.values(c.G.PokemonRankings.rows).sort((a,b)=>b.speedScore-a.speedScore||a.dex-b.dex);
 let rank=1;
 for(let i=0;i<rows.length;i++){
  if(i&&rows[i].speedScore!==rows[i-1].speedScore)rank=i+1;
  assert.equal(rows[i].speedRank,rank);
  assert.equal(rows[i].speedTier,tierForRank(rank,rows.length));
 }
 assert.ok(rows[0].speedScore>rows.at(-1).speedScore);
});
test('ranking snapshot covers every Pokémon with a valid ability and four available moves',()=>{const c=setup(),data=c.G.PokemonRankings;assert.equal(data.count,c.G.DEX.length);assert.equal(Object.keys(data.rows).length,966);const seen=new Set();for(const mon of c.G.DEX){const row=data.rows[mon.dex];assert.ok(Number.isFinite(row.score));assert.ok(row.rank>=1&&row.rank<=data.count);assert.equal(row.tier,tierForRank(row.rank,data.count));seen.add(row.tier);const abilities=c.ComboAbilities.ids(mon);assert.ok(abilities.length?abilities.includes(row.abilityId):row.abilityId==='none');assert.equal(new Set(row.moves).size,4);assert.ok(row.moves.includes('harden'),'Damage ranking requires Harden for dex '+mon.dex);const pool=new Set(c.MoveCombos.pool(mon,true).map(m=>m.id));assert.ok(row.moves.every(id=>pool.has(id)));assert.ok(row.moves.filter(id=>c.G.Moves.BY_ID[id].kind==='buff').length<=2);}assert.equal(seen.size,7);assert.equal(Object.values(data.counts).reduce((a,b)=>a+b,0),966);assert.equal(data.options.forceHarden,true);assert.deepEqual(Array.from(data.options.requiredMoves),['harden']);assert.equal(data.options.attackCategory,'all');assert.equal(data.options.attackStyle,'all');});
test('ranking snapshot source hashes match current scores and game rules',()=>{const c=setup();for(const [file,hash] of Object.entries(c.G.PokemonRankings.sources))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,'..',file),'utf8')).digest('hex'),hash,'Regenerate Pokémon rankings after editing '+file);});
test('top-one optimisation agrees with full recommendation search across abilities',()=>{const c=setup();for(const dex of [1,25,150,184,212,289,493,700,966]){const mon=c.G.DEX_BY[dex];if(!mon)continue;let expected=-Infinity;for(const abilityId of c.ComboAbilities.ids(mon)){const combo=c.MoveCombos.best(mon,{...options,...hardenOptions(mon,c),abilityId,limit:5})[0];if(combo)expected=Math.max(expected,combo.damageScore);}assert.ok(Math.abs(c.G.PokemonRankings.rows[dex].score-expected)<1e-7,String(dex));}});
test('equal scores share competition rank and tier',()=>{const c=setup(),rows=Object.values(c.G.PokemonRankings.rows).sort((a,b)=>b.score-a.score||a.dex-b.dex);let rank=1;for(let i=0;i<rows.length;i++){if(i&&Math.abs(rows[i].score-rows[i-1].score)>1e-8)rank=i+1;assert.equal(rows[i].rank,rank);if(i&&Math.abs(rows[i].score-rows[i-1].score)<=1e-8)assert.equal(rows[i].tier,rows[i-1].tier);}});

test('public health uses game-scaled effective HP and overall uses its independent build score',()=>{const c=setup(),data=c.G.PokemonRankings;assert.equal(data.version,4);for(const mon of c.G.DEX){const row=data.rows[mon.dex],guard=x=>Math.min(1.25,Math.max(.78,(75/Math.max(5,x||75))**.35));const expected=mon.hp/((guard(mon.df)+guard(mon.sd))/2);assert.ok(Math.abs(row.healthScore-expected)<1e-10);assert.equal(row.damageScore,row.score);assert.equal(row.speedScore,mon.spd);assert.equal(row.overallScore,row.overallBuild.overallScore);for(const kind of ['damage','health','speed','overall'])assert.equal(row[kind+'Tier'],tierForRank(row[kind+'Rank'],data.count));}for(const kind of ['damage','health','speed','overall'])assert.equal(Object.values(data.countsByRanking[kind]).reduce((a,b)=>a+b,0),966);const sorted=Object.values(data.rows).sort((a,b)=>a.overallRank-b.overallRank);for(let i=1;i<sorted.length;i++)assert.ok(sorted[i].overallScore>=sorted[i-1].overallScore-1e-8);});

test('ranking ability assumptions use capped bonuses at full health',()=>{
  const c=setup(),A=c.ComboAbilities,C=c.MoveCombos;
  assert.equal(options.hpPercent,100);assert.equal(options.angry,true);
  assert.equal(options.slowed,false);assert.equal(options.weather,'auto');
  function factor(id,move){
    const mon=c.G.DEX.find(mon=>A.ids(mon).includes(id));
    assert.ok(mon,'Available ability '+id);
    const profile=A.prepare(mon,{...options,abilityId:id});
    assert.equal(profile.player.hp,profile.player.maxHp);
    return {value:A.factors(profile,C.maxMove(move)).ability,profile};
  }
  assert.equal(factor('anger-point','tackle').value,1.25);
  for(const id of ['moxie','chilling-neigh','grim-neigh','beast-boost'])assert.equal(factor(id,'tackle').value,1.15);
  for(const move of ['tackle','confusion'])assert.equal(factor('moody',move).value,1);
  assert.equal(factor('stance-change','tackle').value,1.1);
  for(const [id,move] of [['competitive','confusion'],['defiant','tackle'],['solar-power','confusion'],['sand-force','rock-throw'],['protosynthesis','tackle']]){
    const {value,profile}=factor(id,move),max=C.maxMove(move);
    const generic=profile.fx.plus&&max.type===profile.player.mon.types[0]?1.08:1;
    assert.equal(value,generic,id+' has no conditional bonus');
    assert.equal(profile.weather,null);
  }
  assert.equal(factor('blaze','ember').value,1);
  assert.equal(factor('guts','tackle').value,1);
});

test('overall respects no-Harden eligibility without modifying public component scores',()=>{
 const c=setup(),rows=Object.values(c.G.PokemonRankings.rows);let harden=0,noHarden=0;
 for(const row of rows){
  const mon=c.G.DEX_BY[row.dex],before=JSON.stringify([row.damageScore,row.damageRank,row.healthScore,row.healthRank,row.speedScore,row.speedRank]);
  const chosen=selectOverallBuild(mon,c,rows);
  if(row.healthScore<130)assert.equal(chosen.harden,true);
  assert.deepEqual(JSON.parse(JSON.stringify(row.overallBuild)),JSON.parse(JSON.stringify(chosen)));
  assert.equal(row.overallBuild.moves.includes('harden'),row.overallBuild.harden);
  const hp=chosen.harden?row.healthScore:row.healthScore*0.65;
  const healthRank=1+rows.filter(r=>r.dex!==row.dex&&r.healthScore>hp+1e-8).length;
  const damageRank=1+rows.filter(r=>r.dex!==row.dex&&r.damageScore>chosen.score+1e-8).length;
  assert.equal(row.overallScore,damageRank*0.65+healthRank*0.25+row.speedRank*0.1);
  assert.equal(JSON.stringify([row.damageScore,row.damageRank,row.healthScore,row.healthRank,row.speedScore,row.speedRank]),before);
  if(chosen.harden)harden++;else noHarden++;
 }
 assert.ok(harden>0&&noHarden>0);
});
