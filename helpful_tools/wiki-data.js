'use strict';
// Shared, save-free wiki helpers. All stats come from the current game catalogue.
window.Wiki = (() => {
  const colours = G.U.TYPE_COLOR;
  const title = s => s.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
  const tr = s => window.WIKI_EN[s] || s;
  const moveName = id => tr(G.Moves.BY_ID[id]?.name || title(id));
  const fmt = n => typeof n === 'number' ? Number(n.toFixed(3)).toLocaleString('en-GB') : String(n ?? '—');
  const behaviours = {
    projectile:['Directional / fan','Fires towards the aim direction; multiple projectiles spread into a fan.'],
    melee:['Directional arc','Hits enemies inside a forward arc. At higher stages the arc may become a full circle.'],
    beam:['Directional line','An instant line attack that stops at the first wall.'],
    orbit:['All directions / orbit','Orbs circle the player and damage enemies on contact.'],
    nova:['All directions / radial','Fires projectiles around the full circle. The projectile count varies by move and stage; it is not always eight.'],
    aura:['All directions / area','Repeated damage in a circle around the player.'],
    buff:['Status / self','Applies a temporary, stackable buff to the player rather than dealing direct damage.'],
    boomerang:['Directional / returning','Travels out towards enemies and returns to the player, allowing hits on both journeys.'],
    chain:['Targeted / chain','Hits an enemy and jumps to nearby enemies; each subsequent jump deals 85% of the previous jump’s damage.'],
    mine:['Ground / persistent','Leaves mines on the ground that explode when enemies trigger them.'],
    meteor:['Targeted / area','Drops meteors on nearby enemies after a warning.'],
    turret:['Ground / persistent','Creates a temporary turret that fires automatically.'],
    dash:['Directional line','Dashes towards the enemy, damaging enemies along the path; the player is invulnerable during the dash.'],
    trail:['Ground / persistent','Leaves damaging patches behind the player.'],
    cone:['Directional / fan','Fires many short-range shots in a fan.'],
    homing:['Tracking / targeted','Projectiles steer towards enemies.'],
    bounce:['Targeted / chain','Projectiles rebound between enemies.'],
    charge:['Directional line','Charges before firing a large beam.'],
    spin:['All directions / area','Repeated circular strikes around the player.'],
    quake:['Directional line','A sequence of ground explosions advances in a line.'],
    vortex:['Targeted / area','A persistent vortex pulls enemies inward and damages them repeatedly.'],
    shove:['All directions / area','An outward wave damages and knocks enemies away.'],
    stun:['Targeted / area','A telegraphed area strike damages and stuns enemies.']
  };
  function areaKind(m) {
    if (m.homing) return m.kind === 'nova' ? 'All directions / tracking' : 'Tracking / targeted';
    if (m.kind === 'melee' && m.arc >= Math.PI * 2) return 'All directions / area';
    return behaviours[m.kind]?.[0] || m.kind;
  }
  function stages(id) {
    const def = G.Moves.BY_ID[id], out = [];
    for (let i = 1; i <= def.maxLvl; i++) out.push(G.Moves.instance(id,i));
    const last = G.Moves.instance(id,def.maxLvl);
    if (G.Moves.evolve(last)) out.push(last);
    return out;
  }
  // Equal weight per non-legendary species, normal enemy scale = 1, art scale = 2.
  // Mirrors Sprites.bodyRadius; average areas rather than squaring an average radius.
  const normalEnemyAreas = G.DEX.filter(mon=>!mon.leg && G.SPRITE_META[mon.dex]).map(mon=>{
    const a=G.SPRITE_META[mon.dex].a, meta=a.Idle||a.Walk;
    const radius=Math.min(26,Math.max(5,(meta?.w||32)*.22))*2;
    return Math.PI*radius*radius;
  });
  const averageEnemyArea = normalEnemyAreas.reduce((sum,a)=>sum+a,0)/normalEnemyAreas.length;
  function areaInfo(m) {
    if(m.kind==='buff')return {area:null,formula:'Status move: no damaging area.'};
    const count=Math.max(1,m.count||1),circle=r=>Math.PI*r*r;
    let raw,formula;
    if(['projectile','homing','bounce','nova','cone','boomerang','orbit','turret'].includes(m.kind)){
      const radius=m.size || (m.kind==='turret'?6:0);
      raw=count*circle(radius);formula=`${count} × π × ${fmt(radius)}² (summed projectile hitboxes)`;
    }else if(m.kind==='chain'){
      raw=count*averageEnemyArea;formula=`${count} enemy hits × mean normal-enemy hitbox area (approximately ${fmt(Math.round(averageEnemyArea))} px² per enemy)`;
    }else if(m.kind==='melee'){
      const arc=Math.min(m.arc,Math.PI*2);raw=arc*m.radius*m.radius/2;formula=`${fmt(arc)} × ${fmt(m.radius)}² / 2 (arc sector)`;
    }else if(['beam','charge','dash'].includes(m.kind)){
      const width=m.width || 34;raw=m.radius*width;formula=`${fmt(m.radius)} × ${fmt(width)} (line footprint)`;
    }else if(['mine','meteor','quake'].includes(m.kind)){
      raw=count*circle(m.radius);formula=`${count} × π × ${fmt(m.radius)}² (summed explosion circles)`;
    }else if(['aura','spin','vortex','shove','stun','trail'].includes(m.kind)){
      raw=circle(m.radius);formula=`π × ${fmt(m.radius)}² (one circular footprint)`;
    }else throw new Error(`No area model for ${m.kind}`);
    return {area:Math.round(raw),formula};
  }
  function metrics(m) {
    const dps = m.dmg != null && m.cd > 0 ? m.dmg / m.cd : null;
    const area=areaInfo(m).area;
    const typingCoefficient=G.TypingCoefficient.coefficients[m.type];
    const projectile=['projectile','homing','bounce','nova','cone','boomerang','orbit','turret'].includes(m.kind);
    const piercingMultiplier=projectile?Math.max(1,m.pierce||0):1;
    const usesTypingCoefficient=false;
    const benchmark=G.MoveDps?.rows[m.id];
    const matchesStage=benchmark&&m.lvl===benchmark.level&&!!m.evolved===benchmark.evolved;
    const scoreRaw=matchesStage?benchmark.damage_score:null;
    const benchmarkFactor=benchmark?.benchmark_factor||1;
    const benchmarkRawDps=benchmark?.raw_dps??0,benchmarkPenaltyDps=benchmark?benchmarkRawDps-benchmark.damage_score:0;
    return { damage:m.dmg ?? null, dps, speed:m.speed ?? null, area, typingCoefficient, piercingMultiplier, usesTypingCoefficient, scoreRaw, benchmarkFactor, benchmarkRawDps, benchmarkPenaltyDps,
      damageScore:scoreRaw==null?null:Number(scoreRaw.toFixed(2)), cooldown:m.cd, radius:m.radius ?? null, count:m.count ?? null };
  }
  function scoreFormula(m){return 'damage_score from move-dps.csv (maximum stage only)';}
  function specials(m) {
    const out = [behaviours[m.kind]?.[1] || ''];
    if (m.homing) out.push(`Tracks enemies (homing strength ${fmt(m.homing)}), even if its family is ${m.kind}.`);
    for (const [key,label] of Object.entries({burn:'Burn',poison:'Poison',slow:'Slow',knock:'Knockback',drain:'Healing on hit',bounce:'Rebounds',pierce:'Extra pierces',pull:'Inward pull',stun:'Stun duration',hex:'Damage multiplier against an enemy already burning, poisoned or slowed'})) if(m[key]) out.push(`${label}: ${fmt(m[key])}${key === 'stun' ? ' s' : ''}.`);
    if(m.kind==='melee') out.push('While a melee move is in the active group, ordinary incoming damage is multiplied by 0.75.');
    const runtimeNotes={
      mine:'Mines arm after 0.35 s. An enemy within 14 px triggers the explosion; expiration without a trigger deals half damage. The field cap is 4 + 2 × count per player.',
      meteor:'Meteor impacts have a 0.5 s fall delay, staggered by 0.09 s per meteor.',
      turret:'Count is the maximum number of simultaneous turrets, not projectiles per cast. The oldest turret is removed above that cap. Firing interval uses rate, or 0.6 s by default.',
      vortex:'At most two vortices per player. Damage ticks every 0.4 s after an initial 0.15 s delay. Pull reaches 1.4 × radius; bosses and Judgment enemies are pulled at 25% strength.',
      spin:'Strikes repeat every 0.13 s. Each strike hits the full circle even though the slash visual is an arc.',
      quake:'Ground explosions are staggered by 0.07 s and stop when they reach a wall.',
      stun:'Bosses and Judgment enemies receive only 35% of the listed stun duration.',
      dash:'The dash stops at blocked terrain and grants at least 0.3 s of invulnerability.'
    };
    if(runtimeNotes[m.kind])out.push(runtimeNotes[m.kind]);
    if(m.burn)out.push('Burn adds stacks, capped at 8, and refreshes its enemy timer to 3 s.');
    if(m.poison)out.push('Poison adds stacks, capped at 8, and refreshes its enemy timer to 4 s.');
    return out.filter(Boolean);
  }
  function badge(type) { const el=document.createElement('span'); el.className='badge';el.textContent=type;el.style.setProperty('--type-color',colours[type]);return el; }
  function sprite(mon,options={}) {
    const area=document.createElement('div');area.className='sprite-area';
    const meta=G.SPRITE_META[mon.dex],shiny=!!options.shiny,a=meta?.a,available=name=>a?.[name]&&!(shiny&&meta.sm?.includes(name)),anim=available('Idle')?'Idle':available('Walk')?'Walk':null;
    if(!anim||(shiny&&!meta.sh)){area.textContent=shiny?'Shiny unavailable':'Sprite unavailable';return area;}
    const m=(shiny&&meta.sa?.[anim])||a[anim],s=Math.min(options.maxScale||2,(options.height||100)/m.h,(options.width||170)/m.w),frame=document.createElement('span'),img=document.createElement('img');
    frame.className='sprite-frame';frame.style.width=`${m.w*s}px`;frame.style.height=`${m.h*s}px`;
    img.src=`../assets/pokemon/${mon.dex}/${shiny?'s/':''}${anim}.png`;img.alt=`${mon.name}${shiny?' shiny':''} sprite`;img.loading='lazy';img.style.width=`${m.w*m.n*s}px`;img.style.height=`${m.h*m.r*s}px`;
    if(options.bounds){const [x,y,w,h]=options.bounds,scale=Math.min((options.width||52)/w,(options.height||52)/h);frame.style.width=w*scale+'px';frame.style.height=h*scale+'px';img.style.width=m.w*m.n*scale+'px';img.style.height=m.h*m.r*scale+'px';img.style.position='relative';img.style.left=-x*scale+'px';img.style.top=-y*scale+'px';}
    img.onerror=()=>{area.textContent='Sprite unavailable';};frame.append(img);area.append(frame);return area;
  }
  let bestMoveUsers;
  function bestMoveUser(id){
    if(!bestMoveUsers){
      bestMoveUsers=new Map();
      for(const mon of G.DEX){
        const available=new Set([...G.Moves.poolFor(mon,true),G.baseStartOf(mon.dex),...G.TM_OF(mon.dex)]);
        for(const moveId of available){const move=G.Moves.BY_ID[moveId];if(!move)continue;
          const side=move.cat==='special'||(move.kind==='buff'&&move.stat==='satk')?'sa':move.cat==='physical'||(move.kind==='buff'&&move.stat==='patk')?'pa':mon.sa>mon.pa?'sa':'pa';
          const attack=mon[side],mono=mon.types.length===1&&mon.types[0]===move.type?1.2:1,multiplier=attack*mono,current=bestMoveUsers.get(moveId);
          if(!current||multiplier>current.multiplier+1e-12||(Math.abs(multiplier-current.multiplier)<1e-12&&(mon.rarity>current.mon.rarity||(mon.rarity===current.mon.rarity&&mon.dex<current.mon.dex))))bestMoveUsers.set(moveId,{mon,side,attack,mono,multiplier});
        }
      }
    }
    return bestMoveUsers.get(id)||null;
  }
  return {bestMoveUser,colours,title,tr,moveName,fmt,behaviours,areaKind,stages,metrics,scoreFormula,areaInfo,averageEnemyArea,specials,badge,sprite};
})();
