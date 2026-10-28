'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {load,options}=require('./build-pokemon-rankings.cjs');

test('unresolved abilities give no bonus even with low target HP or matching primary type',()=>{
  const {c}=load(),A=c.ComboAbilities;
  for(const abilityId of ['analytic','serene-grace','sheer-force','poison-touch','rough-skin','iron-barbs','synchronize','infiltrator']){
    const mons=c.G.DEX.filter(m=>A.ids(m).includes(abilityId));
    assert.ok(mons.length,abilityId);
    for(const mon of mons){
      const profile=A.prepare(mon,{...options,abilityId,enemyHpPercent:25});
      assert.equal(Object.keys(profile.fx).length,0,abilityId+' cannot add preview damage or change statuses');
      for(const move of c.G.Moves.ALL.filter(m=>m.kind!=='buff')){
        assert.equal(A.factors(profile,c.MoveCombos.maxMove(move.id)).ability,1,abilityId+' '+move.id);
      }
      const best=id=>c.MoveCombos.best(mon,{...options,abilityId:id,enemyHpPercent:25})[0];
      assert.equal(best(abilityId).damageScore,best('none').damageScore,abilityId);
    }
  }
});

test('every available ability evaluates every damaging move without invalid factors or mutations',()=>{
  const {c}=load(),A=c.ComboAbilities;
  const before=JSON.stringify(c.G.DEX);
  const moves=c.G.Moves.ALL.filter(m=>m.kind!=='buff').map(m=>c.MoveCombos.maxMove(m.id));
  const seen=new Set();
  for(const mon of c.G.DEX)for(const abilityId of A.ids(mon)){
    const key=abilityId+'|'+mon.types.join(',');if(seen.has(key))continue;seen.add(key);
    const profile=A.prepare(mon,{...options,abilityId});
    for(const move of moves){
      const factors=A.factors(profile,move);
      for(const [name,value] of Object.entries(factors))assert.ok(Number.isFinite(value)&&value>0,`${mon.dex} ${abilityId} ${move.id} ${name}`);
    }
  }
  assert.equal(JSON.stringify(c.G.DEX),before);
});

test('Technician eligibility uses base hit damage at every level and after evolution',()=>{
  const {c}=load(),A=c.ComboAbilities;
  const mon=c.G.DEX.find(m=>A.ids(m).includes('technician'));
  const profile=A.prepare(mon,{...options,abilityId:'technician'});
  let eligible=0,ineligible=0,upgraded=0;
  for(const def of c.G.Moves.ALL.filter(m=>m.kind!=='buff')){
    const expected=def.dmg<=12?1.35:1;
    if(expected>1)eligible++;else ineligible++;
    for(const move of c.Wiki.stages(def.id)){
      assert.equal(A.factors(profile,move).ability,expected,`${def.id} level ${move.lvl}, evolved ${!!move.evolved}`);
      if(def.dmg<=12&&move.dmg>12)upgraded++;
    }
  }
  assert.ok(eligible>0&&ineligible>0&&upgraded>0);
});

test('Technician increases the actual recommendation damage score by 35 percent of raw damage',()=>{
  const {c}=load(),C=c.MoveCombos;
  const mon=c.G.DEX.find(m=>c.ComboAbilities.ids(m).includes('technician')&&C.pool(m).some(move=>move.def.dmg<=12&&move.kind!=='buff'));
  const moves=C.pool(mon).filter(m=>m.kind!=='buff');
  const weak=moves.find(m=>m.def.dmg<=12);
  const requiredMoves=['harden',weak.id,...moves.filter(m=>m.id!==weak.id).slice(0,2).map(m=>m.id)];
  const combo=abilityId=>C.best(mon,{...options,abilityId,requiredMoves})[0];
  const item=combo('technician').items.find(x=>x.move.id===weak.id);
  const baseline=combo('none').items.find(x=>x.move.id===weak.id);
  const penalty=c.Wiki.metrics(weak).benchmarkPenaltyDps;
  assert.ok(Math.abs(item.damageScore+penalty-(baseline.damageScore+penalty)*1.35)<1e-8);
  assert.ok(Math.abs(item.dps-baseline.dps*1.35)<1e-8);
});
