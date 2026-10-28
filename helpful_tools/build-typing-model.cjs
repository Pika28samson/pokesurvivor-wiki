'use strict';
// Build a reproducible expected main-world spawn population without changing game files.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const ROOT=path.resolve(__dirname,'..');
const inputs=['core/util.js','data/pokedex.js','data/sprites-meta.js','data/types.js','data/enemies.js','systems/spawner.js'];
function build(){
  const context={G:{}};context.window=context;vm.createContext(context);
  const sources={};let spawnerSource;
  for(const file of inputs){
    let code=fs.readFileSync(path.join(ROOT,'js',file),'utf8');
    sources[file]=crypto.createHash('sha256').update(code).digest('hex');
    if(file==='data/enemies.js'){
      const needle='TIERS, BOSS_SLOTS, rollRun, scale, bossScale, bagAt, upcomingDex, candidates, hordeTypes, hordeDefs,';
      if(!code.includes(needle))throw new Error('Enemy exports changed; review the population model.');
      code=code.replace(needle,needle+' coefficientHooks: { behaviorOf, PLAIN, SUPPORT },');
    }
    if(file==='systems/spawner.js')spawnerSource=code;
    vm.runInContext(code,context,{filename:file});
  }
  const G=context.G,{behaviorOf,PLAIN,SUPPORT}=G.Enemies.coefficientHooks;
  const tiers=Array.from(G.Enemies.TIERS),tierMass=tiers.map(()=>0),speciesMass=new Map(),bossMass=new Map();
  const add=(dex,mass)=>speciesMass.set(dex,(speciesMass.get(dex)||0)+mass);
  const expectations=tiers.map(tier=>{
    const all=Array.from(G.Enemies.candidates(tier));
    const kinds=Array.from(SUPPORT).filter(kind=>all.some(mon=>behaviorOf(mon)===kind));
    const support=all.filter(mon=>kinds.includes(behaviorOf(mon)));
    const special=all.filter(mon=>!PLAIN.includes(behaviorOf(mon))&&!SUPPORT.includes(behaviorOf(mon)));
    const plain=all.filter(mon=>PLAIN.includes(behaviorOf(mon)));
    const supportSlots=kinds.length?1:0,specialSlots=tier.from>0&&special.length?1:0;
    const remaining=Math.max(0,tier.cast-supportSlots-specialSlots);
    const rows=all.map(mon=>{
      const kind=behaviorOf(mon);
      const first=kinds.includes(kind)?1/kinds.length/support.filter(m=>behaviorOf(m)===kind).length:0;
      if(tier.from===0)return [mon.dex,first+(PLAIN.includes(kind)?Math.min(remaining,plain.length)/plain.length:0)];
      const initial=first+(specialSlots&&special.includes(mon)?1/special.length:0);
      return [mon.dex,initial+(1-initial)*Math.min(1,remaining/(all.length-supportSlots-specialSlots))];
    });
    return {from:tier.from,candidates:all.length,castSize:rows.reduce((sum,[,p])=>sum+p,0),rows};
  });
  const integrate=(time,mass)=>{
    const weights=tiers.map((tier,i)=>time<tier.from?0:expectations[i].castSize*(time-tier.from>260?3:10));
    const total=weights.reduce((sum,w)=>sum+w,0);
    weights.forEach((w,i)=>{tierMass[i]+=mass*w/total;});
  };
  let drip=0;
  // Midpoint integration, half-second bins; all tier-change boundaries are integral.
  for(let time=.25;time<1800;time+=.5){const n=G.Spawner.rate(time)*.5;drip+=n;integrate(time,n);}
  // Sample only the renewal timing of surges, not species or tier cast selection.
  const first=spawnerSource.match(/surgeT = (\d+), announce/);
  const interval=spawnerSource.match(/surgeT = G\.U\.rand\(([\d.]+), ([\d.]+)\)/);
  const expression=spawnerSource.match(/Math\.round\(\(\d+ \+ Math\.floor\(t \/ \d+\)\) \* G\.Coop\.scaleRate\(players\.length\) \* [\d.]+\)/);
  if(!first||!interval||!expression)throw new Error('Surge rules changed; review model extraction.');
  const burst=vm.runInContext('(t)=>'+expression[0].replace('G.Coop.scaleRate(players.length)','1'),context);
  let seed=0x504f4b45;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const samples=4096,bins=new Float64Array(1800);let surge=0;
  for(let run=0;run<samples;run++)for(let time=Number(first[1]);time<1800;time+=Number(interval[1])+random()*(Number(interval[2])-Number(interval[1])))bins[Math.floor(time)]+=burst(time)/samples;
  bins.forEach((mass,time)=>{if(mass){surge+=mass;integrate(time+.5,mass);}});
  expectations.forEach((tier,i)=>tier.rows.forEach(([dex,p])=>{if(p)add(dex,tierMass[i]*p/tier.castSize);}));
  // Boss slots draw without repeats. Seeded sampling retains that dependency.
  const slots=Array.from(G.Enemies.BOSS_SLOTS);
  for(let run=0;run<samples;run++){
    const used=new Set();
    for(const slot of slots){
      let pool=G.DEX.filter(mon=>!mon.leg&&G.SPRITE_META[mon.dex]&&!used.has(mon.dex)&&mon.bst>=slot.bst[0]&&mon.bst<=slot.bst[1]);
      if(!pool.length)pool=G.DEX.filter(mon=>!mon.leg&&G.SPRITE_META[mon.dex]&&!used.has(mon.dex)&&mon.bst>=580);
      const mon=pool[Math.floor(random()*pool.length)];used.add(mon.dex);add(mon.dex,1/samples);bossMass.set(mon.dex,(bossMass.get(mon.dex)||0)+1/samples);
    }
  }
  return {version:2,horizonSeconds:1800,integrationStep:.5,samples,seed:'POKE',sources,
    model:'Expected potential main-world spawns in a solo 0–30 minute run, assuming spawn capacity and successful placements; ordinary drip, surges and scheduled bosses.',
    excluded:['Type-horde overrides and event bursts','Summoner offspring and treasure thieves','Optional rifts and Judgment enemies','Spawn failures, population/support caps, boss-fight wave suppression and kill/survival differences'],
    components:{drip,surge,bosses:slots.length},
    tiers:expectations.map((tier,i)=>({from:tier.from,candidates:tier.candidates,castSize:tier.castSize,expectedSpawns:tierMass[i]})),
    weights:[...speciesMass].sort(([a],[b])=>a-b),bossWeights:[...bossMass].sort(([a],[b])=>a-b)};
}
module.exports={build,inputs};
if(require.main===module){
  const data=build();
  fs.writeFileSync(path.join(__dirname,'typing-population.js'),'// Generated by node helpful_tools/build-typing-model.cjs; website estimates only.\nG.TypingPopulation = '+JSON.stringify(data,null,2)+';\n');
  console.log(`Generated typing-population.js: ${data.weights.length} weighted species, ${data.tiers.length} spawn tiers.`);
}
