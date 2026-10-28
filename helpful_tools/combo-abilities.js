'use strict';
// Runs only pure ability start/out hooks against isolated player/enemy models.
// Does not execute world-affecting tick/hit/contact hooks or access a game save.
window.ComboAbilities=(()=>{
  // Unresolved effects receive no bonus, including generic type passives.
  // Applies to estimates and live previews; upstream game mechanics are intact.
  const noBonus=new Set(['analytic','serene-grace','sheer-force','poison-touch',
    'rough-skin','iron-barbs','synchronize','infiltrator']);
  function ids(mon){return [...new Set((G.DEX_ABIL[mon.dex]||[]).filter(Boolean))];}
  const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
  function prepare(mon,options={}){
    const abilityId=options.abilityId??ids(mon)[0]??'none';
    if(abilityId!=='none'&&!ids(mon).includes(abilityId))throw new Error('Choose one of this Pokémon’s abilities.');
    const fx=abilityId==='none'||noBonus.has(abilityId)?{}:G.AbilityFX.of(abilityId,mon);
    const copy={...mon,types:[...mon.types]};
    const player={mon:copy,maxHp:mon.hp,hp:mon.hp,baseAtk:mon.atk,critChance:0,regenFlat:0,magnet:78,coinMul:1};
    if(fx.start)fx.start(player);
    player.hp=player.maxHp*clamp(Number(options.hpPercent??100),1,100)/100;
    player.item=options.hasItem?{}:null;
    player.slowT=options.slowed?1:0;
    player.ssT=Math.max(0,Number(options.elapsed??120));
    player.moxie=Math.min(.15,Math.max(0,Number(options.kills??30))*.005);
    player.angry=!!options.angry || player.hp<player.maxHp/2;
    const weather=options.weather==null||options.weather==='auto'?(fx.summon||null):options.weather==='none'?null:options.weather;
    const critFactor=1+clamp(player.critChance,0,1)*((fx.critMul||1.5)-1);
    const summonedWeather=!!fx.summon&&(options.weather==null||options.weather==='auto');
    return {abilityId,fx,player,weather,summonedWeather,critFactor,cdMul:fx.cdMul||1,statusCd:fx.statusCd||1,
      enemyHpPercent:clamp(Number(options.enemyHpPercent??100),1,100)};
  }
  function withWeather(profile,fn){
    const previous=G.Weather;
    G.Weather={current:profile.weather?{kind:profile.weather}:null};
    try{return fn();}finally{if(previous===undefined)delete G.Weather;else G.Weather=previous;}
  }
  function output(profile,move,enemy){
    const {player,fx,abilityId}=profile;
    // Expected values of random/cycling damage hooks, instead of random rankings.
    if(abilityId==='hustle')return move.cat==='physical'?(1/6*.3+5/6*1.25):1;
    if(abilityId==='stance-change')return 1.1;
    // Moody receives no bonus, including its generic type passive.
    if(abilityId==='moody')return 1;
    return fx.out?fx.out(player,move,enemy):1;
  }
  function factors(profile,move){
    const targets=new Set(['tinted-lens','scrappy','rivalry','justified','mold-breaker']);
    const enemy={hp:profile.enemyHpPercent,maxHp:100,types:[],boss:false};
    return withWeather(profile,()=>{
      let mean=0,typed=0;
      if(targets.has(profile.abilityId)){
        const bosses=new Map(G.TypingPopulation.bossWeights);
        for(const [dex,mass] of G.TypingPopulation.weights){
          enemy.types=G.DEX_BY[dex].types;
          const bossMass=bosses.get(dex)||0;
          let expected=0;
          for(const [boss,weight] of [[false,mass-bossMass],[true,bossMass]])if(weight>0){enemy.boss=boss;expected+=weight/G.TypingCoefficient.total*output(profile,move,enemy);}
          mean+=expected;typed+=expected*G.Types.mult(move.type,enemy.types);
        }
      }else{
        mean=output(profile,move,enemy);typed=mean*G.TypingCoefficient.coefficients[move.type];
      }
      return {ability:mean,typedAbility:typed/G.TypingCoefficient.coefficients[move.type],crit:profile.critFactor};
    });
  }
  function weatherMultiplier(profile,type){
    const multiplier=profile.weather?(G.Weather?.KINDS?.[profile.weather]?.mult[type]||1):1;
    // Summoned weather lasts 60 seconds in each 180-second cycle.
    // Explicit weather overrides still represent continuously active weather.
    return profile.summonedWeather?(multiplier*60+120)/180:multiplier;
  }
  return {ids,prepare,factors,weatherMultiplier};
})();
