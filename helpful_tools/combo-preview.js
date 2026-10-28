'use strict';
// Isolated visual playground: uses game combat code, never the ranking model or save.
window.ComboPreview = (() => {
  const noop=()=>{};
  const fixed=(object,key,value)=>Object.defineProperty(object,key,{get:()=>value,set:noop,enumerable:true});
  // Keep full runtime effects separate from the ranking estimator's exclusions.
  function liveProfile(mon,conditions){
    const abilityId=conditions.abilityId??ComboAbilities.ids(mon)[0]??'none';
    if(abilityId!=='none'&&!ComboAbilities.ids(mon).includes(abilityId))throw Error('Choose an ability available to this Pokémon.');
    const profile=ComboAbilities.prepare(mon,{...conditions,abilityId:'none'});
    let fx=abilityId==='none'?{}:G.AbilityFX.of(abilityId,mon);
    if(fx.summon){fx={...fx};delete fx.summon;}
    if(fx.start)fx.start(profile.player);
    profile.player.hp=profile.player.maxHp*Math.min(100,Math.max(1,Number(conditions.hpPercent??100)))/100;
    Object.assign(profile,{abilityId,fx,summonedWeather:false,cdMul:fx.cdMul||1,statusCd:fx.statusCd||1});
    return profile;
  }
  function create(dex,ids,{cdMul=1,statusCd=1,layers=1,perLayer=8,arc=360,distance=100,mode='stationary',enemyHp=1000,spawnRate=4,conditions={},singleMove=false,neutralStats=false,maxEnemies,contactPenalty=false}={}) {
    const swarm=mode==='swarm';
    enemyHp=Math.min(1000000,Math.max(1,Number(enemyHp)||1000));spawnRate=Math.min(100,Math.max(.1,Number(spawnRate)||4));
    let mon=G.DEX_BY[dex];
    if(!mon||ids.length<1||ids.length>4||(singleMove&&ids.length!==1)||new Set(ids).size!==ids.length||ids.some(id=>!G.Moves.BY_ID[id]))throw Error('Invalid preview combination.');
    if(neutralStats)mon={...mon,pa:1,sa:1,atk:1,types:[]};
    const profile=window.ComboAbilities?(singleMove?ComboAbilities.prepare(mon,{...conditions,abilityId:'none',weather:'none'}):liveProfile(mon,conditions)):null;
    if(profile)mon=profile.player.mon;
    G.FX.clear();G.Projectiles.clear();G.Combat.clearFields();
    const moves=ids.map(id=>{const m=G.Moves.instance(id,G.Moves.BY_ID[id].maxLvl);G.Moves.evolve(m);m.t=0;return m;});
    const anim=new G.Sprites.Animator(dex,G.Sprites.playerScale(dex));anim.dir=4;
    const player={...(profile?.player||{}),mon,dex,r:G.Sprites.playerRadius(dex),bodyH:G.Sprites.bodyHeight(dex),dead:false,cdMul,abil:profile?{...profile.fx,statusCd,out:(_pl,m,e)=>profile.fx.out?profile.fx.out(profile.player,m,{...e,hp:swarm?e.hp:enemyHp*profile.enemyHpPercent/100,maxHp:swarm?e.maxHp:enemyHp}):1}:{statusCd},critChance:profile?.player.critChance||0,dmgDealt:0,buffs:{},
      aim:-Math.PI/2,anim,activeGroup:()=>moves,activeMove:()=>moves[0],heal:noop,hurt:noop,onDealt:noop,hasItem:()=>false,
      addBuff(stat,amount,dur,stacks){const b=this.buffs[stat]||{n:0};b.n=Math.min(stacks,b.n+1);b.amount=amount;b.t=dur;this.buffs[stat]=b;},
      atkFor(m){const b=this.buffs[m.cat==='special'?'satk':'patk'];const a=this.buffs.atk;return (profile?profile.player.baseAtk/mon.atk:1)*(m.cat==='special'?mon.sa:mon.pa)*(1+(a?.n||0)*(a?.amount||0))*(1+(b?.n||0)*(b?.amount||0))*(mon.types.length===1&&mon.types[0]===m.type?1.2:1);},
      cast(m){if(anim.busy()&&anim.progress()<.65)return;anim.play(({melee:'Attack',beam:'Shoot',projectile:'Shoot',homing:'Shoot',bounce:'Shoot',chain:'Shoot',boomerang:'Shoot',cone:'Shoot',buff:'Charge',orbit:'Charge'})[m.kind]||'Attack');}
    };
    const abilityState=profile?.player;
    if(abilityState){
      Object.assign(abilityState,{level:1,dead:false,r:player.r,bodyH:player.bodyH,x:0,y:65,addBuff:player.addBuff.bind(player)});
      player.level=abilityState.level;
      for(const hook of ['hit','contact'])if(profile.fx[hook])player.abil[hook]=(_pl,...args)=>profile.fx[hook](abilityState,...args);
      player.hurt=(_amount,type,pure,cat)=>{if(!pure&&profile.fx.hurt)profile.fx.hurt(abilityState,type,cat==='physical'?'p':cat==='special'?'s':'');};
    }
    fixed(player,'x',0);fixed(player,'y',65);fixed(player,'hp',Infinity);fixed(player,'maxHp',Infinity);
    const camera=Object.assign({},G.Camera);camera.zoom=1;camera.resize(480,340);camera.x=player.x;camera.y=player.y;camera.kick=noop;
    const spawnRadius=camera.outerRadius();
    layers=Math.min(6,Math.max(1,Math.round(Number(layers)||1)));perLayer=Math.min(24,Math.max(1,Math.round(Number(perLayer)||1)));
    distance=Math.min(400,Math.max(25,Number(distance)||100));
    arc=Math.min(360,Math.max(1,Number(arc)||360));const arcRadians=arc*Math.PI/180;
    let time=0,totalDamage=0,displayedDps=0,displayedScore=0,displayedPerEnemyDps=0,nextDpsUpdate=1,enemySecondsTotal=0,contactPenaltyTotal=0,contacts=0;const damageLog=[],enemyTimeLog=[],contactLog=[];
    const record=damage=>{if(Number.isFinite(damage)&&damage>0){totalDamage+=damage;damageLog.push([time,damage]);}};
    const enemies=[];let nextId=1,kills=0,spawnTimer=0;
    const population=maxEnemies==null?layers*perLayer:Math.min(200,Math.max(1,Math.round(Number(maxEnemies)||20)));
    function makeEnemy(x,y){
      const enemy={id:nextId++,mon:{},types:['normal'],r:18,bodyH:40,dead:false,touchCd:singleMove?Infinity:0,dmg:10,atkType:'normal',cat:'physical',kx:0,ky:0,flash:0,burn:0,poison:0,burnT:0,poisonT:0,burnTick:0,poisonTick:0,slow:0,slowT:0,stunT:0,speed:45+Math.random()*20,
        cy(){return this.y;},hurt(damage,color='#aab6c8',dx=0,dy=0,knock=0,eff=null){
          if(this.dead||!Number.isFinite(damage)||damage<=0)return;
          this.flash=.09;const dealt=swarm?Math.min(this.hp,Math.max(1,Math.round(damage))):damage;record(dealt);
          G.FX.dmgText(this.x,this.y-this.bodyH-4,Math.round(dealt),eff==='crit'?'#ff9a3c':color,true);
          if(swarm){this.hp-=dealt;const len=Math.hypot(dx,dy)||1;this.kx+=dx/len*knock;this.ky+=dy/len*knock;
            if(this.hp<=0){this.dead=true;kills++;if(profile?.fx.kill)profile.fx.kill(abilityState,this);G.FX.burst(this.x,this.y-16,'#8edbc5',6,65);}}
        },strike:noop,
        applyBurn(n=1){this.burn=Math.min(8,this.burn+n);this.burnT=3;},applyPoison(n=1){this.poison=Math.min(8,this.poison+n);this.poisonT=4;},
        applySlow(n=.3,dur=2){this.slow=Math.min(.8,n);this.slowT=dur;},applyStun(dur=1){this.stunT=Math.max(this.stunT,dur);}};
      if(swarm){Object.assign(enemy,{x,y,hp:enemyHp,maxHp:enemyHp});}
      else{fixed(enemy,'x',x);fixed(enemy,'y',y);fixed(enemy,'hp',Infinity);fixed(enemy,'maxHp',Infinity);}
      enemies.push(enemy);return enemy;
    }
    function spawn(){const angle=-Math.PI/2+(Math.random()-.5)*arcRadians,radius=spawnRadius+G.U.rand(10,70);return makeEnemy(player.x+Math.cos(angle)*radius,player.y+Math.sin(angle)*radius*.9);}
    if(swarm){spawn();spawnTimer=1/spawnRate;}
    else for(let layer=0;layer<layers;layer++)for(let i=0;i<perLayer;i++){
      const angle=arc===360?-Math.PI/2+i*2*Math.PI/perLayer:-Math.PI/2-arcRadians/2+(i+.5)*arcRadians/perLayer,radius=distance+layer*60;
      makeEnemy(player.x+Math.cos(angle)*radius,player.y+Math.sin(angle)*radius);
    }
    const enemy=enemies.slice(0,perLayer).reduce((best,e)=>e.y<best.y?e:best,enemies[0]);player.target=enemy;
    player.aim=Math.atan2(enemy.y-player.y,enemy.x-player.x);anim.dir=G.Sprites.dirFromAngle(player.aim);
    G.Coop={active:false};G.Audio={sfx:noop};G.Pickups={drop:noop};G.Camera=swarm?camera:{...camera,sees:(x,y,margin=0)=>Math.abs(x)<420+margin&&Math.abs(y)<360+margin,kick:noop};
    G.World={isWall:()=>false,isFree:()=>true,collide:noop,propsInCircle:()=>[],damageProp:noop,projectileBlock:()=>null};
    G.EnemyMgr={all:()=>enemies.filter(e=>!e.dead),queryCircle:(x,y,r)=>enemies.filter(e=>!e.dead&&G.U.dist2(x,y,e.x,e.y)<=(r+e.r)**2)};
    // Neutral dummy targets; damage is measured from actual resolved hits, never used to rank combinations.
    G.Types={mult:()=>1,label:()=>null};const kinds=G.Weather?.KINDS;G.Weather={KINDS:kinds,current:profile?.weather?{kind:profile.weather}:null,mult:type=>profile?ComboAbilities.weatherMultiplier(profile,type):1};G.Stats={taken:()=>1};
    let lastContext;
    const substitute=new Image();substitute.onload=()=>{if(lastContext)draw(lastContext);};substitute.src='helpful_tools/subsitute.png';
    function removeContacts(){
      if(!swarm||!contactPenalty)return;
      for(const e of enemies)if(!e.dead&&G.U.dist2(e.x,e.y,player.x,player.y)<=(player.r+e.r+1e-6)**2){contactLog.push([time,e.hp]);contactPenaltyTotal+=e.hp;contacts++;e.hp=0;e.dead=true;}
    }
    function step(dt){
      time+=dt;anim.update(dt);
      if(abilityState){if(profile.fx.tick)profile.fx.tick(abilityState,dt);if(abilityState.regenFlat>0)abilityState.hp=Math.min(abilityState.maxHp,abilityState.hp+abilityState.regenFlat*dt);}
      if(swarm){
        for(let i=enemies.length-1;i>=0;i--)if(enemies[i].dead)enemies.splice(i,1);
        spawnTimer-=dt;while(spawnTimer<=1e-9){if(enemies.length<population)spawn();spawnTimer+=1/spawnRate;}
      }
      const liveEnemies=enemies.filter(e=>!e.dead).length;
      enemyTimeLog.push([time-dt,time,liveEnemies]);enemySecondsTotal+=dt*liveEnemies;
      while(enemyTimeLog.length&&enemyTimeLog[0][1]<=time-15)enemyTimeLog.shift();
      for(const e of enemies){if(e.dead)continue;e.touchCd=Math.max(0,e.touchCd-dt);
        if(swarm){e.slowT=Math.max(0,e.slowT-dt);e.stunT=Math.max(0,e.stunT-dt);if(!e.slowT)e.slow=0;
          const dx=player.x-e.x,dy=player.y-e.y,d=Math.hypot(dx,dy)||1,stop=player.r+e.r;
          const travel=e.stunT>0?0:Math.min(Math.max(0,d-stop),e.speed*(1-e.slow)*dt);
          e.x+=dx/d*travel+e.kx*dt;e.y+=dy/d*travel+e.ky*dt;e.kx*=Math.exp(-8*dt);e.ky*=Math.exp(-8*dt);
        }
        if(swarm&&contactPenalty&&G.U.dist2(e.x,e.y,player.x,player.y)<=(player.r+e.r+1e-6)**2){contactLog.push([time,e.hp]);contactPenaltyTotal+=e.hp;contacts++;e.hp=0;e.dead=true;continue;}
        e.flash=Math.max(0,e.flash-dt);
        if(e.burn>0){e.burnT-=dt;e.burnTick-=dt;if(e.burnTick<=0){e.burnTick=.5;e.hurt(1.6*e.burn*1.06);}if(e.burnT<=0)e.burn=0;}
        if(e.poison>0){e.poisonT-=dt;e.poisonTick-=dt;if(e.poisonTick<=0){e.poisonTick=.6;e.hurt((swarm?e.maxHp:enemyHp)*.012*e.poison+1);}if(e.poisonT<=0)e.poison=0;}
      }
      while(damageLog.length&&damageLog[0][0]<time-15)damageLog.shift();
      while(contactLog.length&&contactLog[0][0]<time-15)contactLog.shift();
      for(const b of Object.values(player.buffs)){b.t-=dt;if(b.t<=0)b.n=0;}
      if(swarm){player.target=G.Projectiles.nearest(enemies,player.x,player.y,10000);if(player.target){player.aim=Math.atan2(player.target.y-player.y,player.target.x-player.x);anim.dir=G.Sprites.dirFromAngle(player.aim);}}
      G.Combat.tick(dt,player,time);G.Combat.updateFields(dt);G.Projectiles.update(dt,player,enemies);G.Combat.resolve(dt,player,time);removeContacts();G.FX.update(dt);
      if(time+1e-9>=nextDpsUpdate){displayedDps=dps();displayedScore=score();displayedPerEnemyDps=perEnemyDps();nextDpsUpdate=Math.floor(time+1e-9)+1;}
    }
    function draw(ctx){
      lastContext=ctx;
      ctx.clearRect(0,0,480,340);ctx.fillStyle='#111a2a';ctx.fillRect(0,0,480,340);
      ctx.save();ctx.translate(240,swarm?170:185);const zoom=swarm?480/camera.w:Math.min(.72,120/(distance+(layers-1)*60));ctx.scale(zoom,zoom);ctx.translate(0,-player.y);ctx.imageSmoothingEnabled=false;
      ctx.strokeStyle='#223047';ctx.lineWidth=1;
      for(let i=-400;i<=400;i+=40){ctx.beginPath();ctx.moveTo(i,-240);ctx.lineTo(i,240);ctx.stroke();ctx.beginPath();ctx.moveTo(-400,i);ctx.lineTo(400,i);ctx.stroke();}
      G.Combat.drawGroundFields(ctx);
      if(substitute.complete&&substitute.naturalWidth){const scale=Math.min(64/substitute.naturalWidth,64/substitute.naturalHeight);const w=substitute.naturalWidth*scale,h=substitute.naturalHeight*scale;for(const e of enemies){if(e.dead)continue;ctx.globalAlpha=e.flash>0?.65:1;ctx.drawImage(substitute,e.x-w/2,e.y-h,w,h);if(swarm){ctx.globalAlpha=1;ctx.fillStyle='#263447';ctx.fillRect(e.x-22,e.y-h-7,44,4);ctx.fillStyle='#8edbc5';ctx.fillRect(e.x-22,e.y-h-7,44*Math.max(0,e.hp/e.maxHp),4);}}ctx.globalAlpha=1;}
      G.Sprites.drawShadow(ctx,dex,player.x,player.y,anim.scale);anim.draw(ctx,player.x,player.y);
      G.Combat.drawAirFields(ctx);G.Projectiles.draw(ctx);G.FX.draw(ctx);ctx.restore();
      ctx.fillStyle='#eaf3ff';ctx.font='bold 15px system-ui';ctx.fillText(contactPenalty?'Damage score: '+displayedScore.toFixed(2):'Live DPS: '+displayedDps.toFixed(2),12,24);
      ctx.font='bold 13px system-ui';ctx.fillText('Average DPS / enemy: '+displayedPerEnemyDps.toFixed(2),12,44);
      if(swarm){ctx.font='12px system-ui';ctx.fillText('Defeated: '+kills,12,63);}
    }
    function dps(){return damageLog.reduce((sum,hit)=>sum+hit[1],0)/Math.max(1/60,Math.min(15,time));}
    function score(){return dps()-contactLog.reduce((sum,hit)=>sum+hit[1],0)/Math.max(1/60,Math.min(15,time));}
    function perEnemyDps(){const start=Math.max(0,time-15),enemySeconds=enemyTimeLog.reduce((sum,[from,to,count])=>sum+Math.max(0,to-Math.max(start,from))*count,0);return enemySeconds>0?damageLog.reduce((sum,hit)=>sum+hit[1],0)/enemySeconds:0;}
    return {player,abilityState,enemy,enemies,moves,step,draw,dps,perEnemyDps,score,get enemySeconds(){return enemySecondsTotal;},get contactPenalty(){return contactPenaltyTotal;},get contacts(){return contacts;},get netDamage(){return totalDamage-contactPenaltyTotal;},get displayedPerEnemyDps(){return displayedPerEnemyDps;},get kills(){return kills;},get displayedDps(){return displayedDps;},get totalDamage(){return totalDamage;},get elapsed(){return time;}};
  }
  return {create};
})();
(() => {
  if(typeof document==='undefined'||!document.getElementById?.('preview'))return;
  const params=new URLSearchParams(location.search),canvas=document.getElementById('preview');
  if(params.has('seed')){let state=Number(params.get('seed'))>>>0;Math.random=()=>{state=(state+0x6D2B79F5)|0;let t=Math.imul(state^(state>>>15),1|state);t^=t+Math.imul(t^(t>>>7),61|t);return ((t^(t>>>14))>>>0)/4294967296;};}
  let preview;
  try{preview=ComboPreview.create(Number(params.get('dex')),(params.get('moves')||'').split(','),{contactPenalty:params.get('contactPenalty')==='1',maxEnemies:params.has('maxEnemies')?params.get('maxEnemies'):undefined,singleMove:params.get('single')==='1',mode:params.get('mode')||'swarm',enemyHp:params.get('enemyHp')??1500,spawnRate:params.get('spawnRate')??35,conditions:JSON.parse(params.get('conditions')||'{}'),distance:params.get('distance')??100,arc:params.get('arc')??360,layers:params.get('layers')??1,perLayer:params.get('perLayer')??8,cdMul:Math.max(.05,Number(params.get('cd'))||1),statusCd:Math.max(.05,Number(params.get('statusCd'))||1)});}catch(error){document.getElementById('error').hidden=false;document.getElementById('error').textContent=error.message;return;}
  let visible=true,last=0,request=0;
  const ctx=canvas.getContext('2d');
  function frame(now){request=0;if(visible&&!document.hidden){const dt=last?Math.min((now-last)/1000,.05):1/60;preview.step(dt);preview.draw(ctx);}last=now;schedule();}
  function schedule(){if(!request&&visible&&!document.hidden)request=requestAnimationFrame(frame);}
  function refresh(){last=0;preview.draw(ctx);schedule();}
  addEventListener('message',event=>{if(event.source===parent&&event.data?.type==='combo-preview-visibility'){visible=!!event.data.visible;last=0;schedule();}});
  document.addEventListener('visibilitychange',()=>{last=0;schedule();});
  addEventListener('pagehide',()=>{if(request)cancelAnimationFrame(request);request=0;});
  refresh();
  G.Sprites.preload([preview.player.dex]).then(()=>preview.draw(ctx));
})();
