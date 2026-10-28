'use strict';
// Exact top-five search under the documented additive, neutral-target DPS model.
window.MoveCombos = (() => {
  const maximum = new Map();
  function maxMove(id) {
    if(!maximum.has(id))maximum.set(id,Wiki.stages(id).at(-1));
    return maximum.get(id);
  }
  function pool(mon,includeTms=true) {
    const ids=new Set(G.Moves.poolFor(mon,true));
    ids.add(G.baseStartOf(mon.dex));
    if(includeTms)for(const id of G.TM_OF(mon.dex))if(G.Moves.BY_ID[id])ids.add(id);
    return [...ids].sort().map(maxMove);
  }
  // Aggregate ideal contact DPS: enough enemies for all emitted hits to connect.
  // Not measured single-target DPS. Geometric area is deliberately not multiplied here.
  function dpsInfo(m) {
    if(m.kind==='buff')return {dps:0,formula:'Status move: no direct damage.'};
    const n=Math.max(1,m.count||1),cd=Math.max(.05,m.cd),pierces=1+(m.pierce||0);
    let rate=1/cd,formula='one hit / cooldown';
    if(['projectile','homing','cone','nova'].includes(m.kind)){rate=n*pierces/cd;formula='count × (1 + pierces) / cooldown';}
    if(m.kind==='bounce'){rate=n*(1+(m.bounce||0))/cd;formula='count × (1 + rebounds) / cooldown; assumes all rebounds connect';}
    if(m.kind==='chain'){rate=(1-.85**n)/.15/cd;formula='(1 + 0.85 + … + 0.85^(count−1)) / cooldown';}
    if(['mine','meteor','spin','quake'].includes(m.kind)){rate=n/cd;formula='count hits / cooldown';}
    if(m.kind==='boomerang'){rate=n*2/cd;formula='count × 2 journeys / cooldown';}
    if(m.kind==='orbit'){rate=n/Math.max(.12,m.cd);formula='count orbs / per-orb rehit cooldown; assumes continuous contact';}
    if(m.kind==='turret'){
      // One turret per cast; the cast interval or duration may prevent filling its cap.
      const shots=Math.max(0,Math.ceil(((m.dur||6)-.3)/(m.rate||.6)));
      const activeShots=Math.min(shots,Math.max(0,Math.ceil((n*cd-.3)/(m.rate||.6))));
      rate=activeShots/cd;formula='shots before expiry/replacement (0.3 s startup, rate interval) / cast cooldown';
    }
    if(m.kind==='vortex'){
      const duration=Math.min(m.dur||2.6,2*cd);
      rate=Math.max(0,Math.ceil((duration-.15)/.4))/cd;
      formula='ticks before expiry/replacement (0.15 s startup, 0.4 s ticks; 2-field cap) / cooldown';
    }
    if(m.kind==='trail'){
      const duration=Math.min(m.dur||3,18*cd);
      rate=Math.ceil(duration/.5)/cd;formula='patch ticks (0.5 s interval, 18-patch cap) / cooldown; assumes movement';
    }
    return {dps:m.dmg*rate,formula};
  }
  // Simulate the game's shared buff channels; two patk buffs overwrite amount,
  // share stacks and refresh the timer. Never multiply their bonuses together.
  const buffCache=new Map();
  function buffMultipliers(buffs) {
    const key=JSON.stringify(buffs.map(m=>[m.id,m.cd,m.amount,m.stacks,m.dur]));if(buffCache.has(key))return buffCache.get(key);
    const state={},totals={patk:0,satk:0,atk:0},next=buffs.map(()=>0);
    let time=0;const warmup=30,end=150;
    while(time<end){
      let at=end;for(const t of next)at=Math.min(at,t);
      for(const s of Object.values(state))if(s.expires>time)at=Math.min(at,s.expires);
      const duration=Math.max(0,at-Math.max(time,warmup));
      for(const channel of Object.keys(totals)){const s=state[channel];totals[channel]+=duration*(1+(s?.n||0)*(s?.amount||0));}
      time=at;
      for(const s of Object.values(state))if(s.expires<=time+1e-9)s.n=0;
      if(time>=end)break;
      for(let i=0;i<buffs.length;i++)if(next[i]<=time+1e-9){
        const m=buffs[i],s=state[m.stat] ||= {n:0};
        s.n=Math.min(m.stacks,s.n+1);s.amount=m.amount;s.expires=time+m.dur;
        next[i]+=Math.max(.05,m.cd);
      }
    }
    const result=Object.fromEntries(Object.entries(totals).map(([k,v])=>[k,v/(end-warmup)]));
    buffCache.set(key,result);return result;
  }
  // Best-first enumeration of k-element subsets of sorted weights.
  // Every unseen subset has a predecessor of at least its score, so this is exact.
  function topSums(items,k,limit=5) {
    if(k<0||items.length<k)return [];
    if(!k)return [{items:[],value:0}];
    const sorted=[...items].sort((a,b)=>b.value-a.value||a.move.id.localeCompare(b.move.id));
    const first=Array.from({length:k},(_,i)=>i),seen=new Set([first.join(',')]);
    const value=indices=>indices.reduce((sum,i)=>sum+sorted[i].value,0);
    const frontier=[{indices:first,value:value(first)}],out=[];
    while(frontier.length&&out.length<limit){
      frontier.sort((a,b)=>b.value-a.value||a.indices.join(',').localeCompare(b.indices.join(',')));
      const current=frontier.shift();out.push({items:current.indices.map(i=>sorted[i]),value:current.value});
      for(let i=0;i<k;i++){
        const indices=[...current.indices];indices[i]++;
        if(indices[i]>=sorted.length || (i<k-1&&indices[i]>=indices[i+1]))continue;
        const key=indices.join(',');if(seen.has(key))continue;seen.add(key);frontier.push({indices,value:value(indices)});
      }
    }
    return out;
  }
  const compare=(a,b)=>b.value-a.value||a.key.localeCompare(b.key);
  function best(mon,{includeTms=true,forceHarden=true,requiredMoves,excludedMoves=[],allowedFamilies,attackCategory='all',attackStyle='all',rankBy='dps',limit=5,...abilityOptions}={}) {
    limit=Math.max(1,Math.min(5,Math.floor(limit)||5));
    const profile=ComboAbilities.prepare(mon,abilityOptions);
    const moves=pool(mon,includeTms).filter(m=>!excludedMoves.includes(m.id)&&(!allowedFamilies||allowedFamilies.includes(m.kind))&&(m.kind==='buff'||((attackCategory==='all'||m.cat===attackCategory)&&(attackStyle==='all'||(['melee','aura','dash','orbit','shove','spin','mine','trail'].includes(m.kind)?'melee':'ranged')===attackStyle)))),damage=moves.filter(m=>m.kind!=='buff'),buffs=moves.filter(m=>m.kind==='buff');
    const requiredIds=new Set(requiredMoves??(forceHarden?['harden']:[]));
    if(requiredIds.size>4||[...requiredIds].some(id=>!moves.some(m=>m.id===id)))return [];
    const requiredDamage=damage.filter(m=>requiredIds.has(m.id));
    const perMove=new Map(damage.map(move=>[move.id,ComboAbilities.factors(profile,move)]));
    const required=buffs.filter(m=>requiredIds.has(m.id));
    if(required.length>2)return [];
    const optional=buffs.filter(m=>!required.includes(m)),sets=[];
    function choose(start,current){sets.push([...required,...current]);if(required.length+current.length>=Math.min(2,4-requiredDamage.length))return;for(let i=start;i<optional.length;i++)choose(i+1,[...current,optional[i]]);}
    choose(0,[]);const candidates=[];
    for(const selected of sets){
      const buffs=buffMultipliers(selected.map(m=>({...m,cd:Math.max(.05,m.cd*profile.cdMul*profile.statusCd)})));
      const items=damage.map(move=>{
        const effectiveMon=profile.player.mon;
        const attack=profile.player.baseAtk*(move.cat==='special'?effectiveMon.sa:effectiveMon.pa)/effectiveMon.atk;
        const channel=move.cat==='special'?'satk':'patk';
        const mono=effectiveMon.types.length===1&&effectiveMon.types[0]===move.type?1.2:1;
        const ability=perMove.get(move.id),weather=ComboAbilities.weatherMultiplier(profile,move.type);
        const multiplier=attack*buffs.atk*buffs[channel]*mono;
        const scheduled=move.kind==='orbit'?move:{...move,cd:Math.max(.05,move.cd*profile.cdMul)};
        const dps=dpsInfo(scheduled).dps*multiplier*ability.ability*ability.crit*weather;
        const metrics=Wiki.metrics(move);
        const scoreAbility=metrics.usesTypingCoefficient?ability.typedAbility:ability.ability;
        const damageScore=metrics.benchmarkRawDps/metrics.benchmarkFactor*multiplier*scoreAbility*ability.crit*weather*(move.cd/scheduled.cd)-metrics.benchmarkPenaltyDps;
        return {move,dps,damageScore,multiplier,attack,mono,ability,weather,cooldown:scheduled.cd,value:rankBy==='damageScore'?damageScore:dps};
      });
      const fixed=items.filter(x=>requiredIds.has(x.move.id));
      const remaining=items.filter(x=>!requiredIds.has(x.move.id));
      for(const extra of topSums(remaining,4-selected.length-fixed.length,limit)){
        const candidate={items:[...fixed,...extra.items],value:extra.value+fixed.reduce((sum,x)=>sum+x.value,0)};
        const ids=[...selected.map(m=>m.id),...candidate.items.map(x=>x.move.id)].sort();
        candidates.push({key:ids.join('|'),ids,buffs,profile,items:candidate.items,status:selected,
          dps:candidate.items.reduce((sum,x)=>sum+x.dps,0),damageScore:candidate.items.reduce((sum,x)=>sum+x.damageScore,0),value:candidate.value});
      }
    }
    return candidates.sort(compare).slice(0,limit);
  }
  return {pool,maxMove,dpsInfo,buffMultipliers,topSums,best};
})();
