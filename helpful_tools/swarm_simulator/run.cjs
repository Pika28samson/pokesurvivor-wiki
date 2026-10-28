#!/usr/bin/env node
'use strict';
// Standalone benchmark. Reuses the preview's real combat loop; no browser/server required.
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const crypto=require('node:crypto');
const {parseArgs}=require('node:util');
const ROOT=path.resolve(__dirname,'../..');
const SOURCES=[
 'js/core/util.js','js/core/camera.js','js/data/pokedex.js','js/data/moves.js',
 'js/data/sprites-meta.js','js/core/sprites.js','js/data/abilities.js','js/data/ability-fx.js',
 'js/systems/weather.js','js/data/lang-en.js','js/entities/vfx.js','js/entities/fx.js',
 'js/entities/projectile.js','js/systems/combat.js','helpful_tools/combo-abilities.js','helpful_tools/combo-preview.js'
];
const compiled=SOURCES.map(file=>{const source=fs.readFileSync(path.join(ROOT,file),'utf8');return {file,hash:crypto.createHash('sha256').update(source).digest('hex'),script:new vm.Script(source,{filename:file})};});
function createRuntime(seed=42){
 let clock=0;
 const canvasContext=new Proxy({},{get:(obj,key)=>key in obj?obj[key]:()=>{},set:(obj,key,value)=>(obj[key]=value,true)});
 const context={console,G:{DB:{save:{ptm:{}}}},WIKI_EN:{},performance:{now:()=>clock*1000},
  document:{getElementById:()=>null,createElement:()=>({getContext:()=>canvasContext})},
  Image:class{constructor(){this.complete=false;this.naturalWidth=0;this.naturalHeight=0;}set src(value){this._src=value;}get src(){return this._src;}}
 };
 context.window=context;context.G.I18n={add:dict=>Object.assign(context.WIKI_EN,dict)};
 context.G.Settings={fx:1,get:key=>key==='dmgNumbers'};
 vm.createContext(context);
 // Keep the complete visual-effects code running so its random draws match preview steps.
 vm.runInContext(`Math.random=(()=>{let state=${seed>>>0};return ()=>{state=(state+0x6D2B79F5)|0;let t=Math.imul(state^(state>>>15),1|state);t^=t+Math.imul(t^(t>>>7),61|t);return ((t^(t>>>14))>>>0)/4294967296;};})();`,context);
 for(const source of compiled)source.script.runInContext(context);
 return {context,setClock:value=>{clock=value;}};
}
function range(value,name,min,max,integer=false){
 const n=Number(value);if(!Number.isFinite(n)||n<min||n>max||(integer&&!Number.isInteger(n)))throw Error(`${name} must be ${integer?'an integer ':''}between ${min} and ${max}.`);return n;
}
function settings(values={}){
 const n=(key,fallback,min,max,int=false)=>range(values[key]??fallback,'--'+key,min,max,int);
 return {contactPenalty:!values['no-contact-penalty'],maxEnemies:n('max-enemies',25,1,200,true),neutralStats:!!values.neutral,pokemon:n('pokemon',25,1,100000,true),duration:n('duration',120,.1,3600),warmup:n('warmup',30,0,3600),
  fps:n('fps',60,30,240,true),trials:n('trials',1,1,100,true),seed:n('seed',42,0,4294967295,true),
  enemyHp:n('enemy-hp',100,1,1000000),spawnRate:n('spawn-rate',15,.1,100),layers:n('layers',1,1,6,true),
  perLayer:n('per-layer',8,1,24,true),arc:n('arc',360,1,360),
  conditions:{...(values.neutral?{abilityId:'none'}:values.ability?{abilityId:values.ability}:{}),elapsed:n('elapsed',1200,0,100000),kills:n('kills',1000,0,1000000),hpPercent:100,enemyHpPercent:100,weather:values.neutral?'none':values.weather||'auto'}
 };
}
function runTrial(moveId,options,seed=options.seed){
 const runtime=createRuntime(seed),c=runtime.context,mon=c.G.DEX_BY[options.pokemon];
 if(!mon)throw Error(`Unknown Pokémon dex number: ${options.pokemon}`);
 const def=c.G.Moves.BY_ID[moveId];if(!def)throw Error(`Unknown move: ${moveId}`);
 const profile=c.ComboAbilities.prepare(mon,options.conditions);
 const scene=c.ComboPreview.create(options.pokemon,[moveId],{mode:'swarm',singleMove:true,neutralStats:options.neutralStats,maxEnemies:options.maxEnemies,contactPenalty:options.contactPenalty,
  enemyHp:options.enemyHp,spawnRate:options.spawnRate,layers:options.layers,perLayer:options.perLayer,arc:options.arc,
  conditions:options.conditions,cdMul:profile.cdMul,statusCd:profile.statusCd});
 function advance(seconds){const frames=Math.ceil(seconds*options.fps);for(let i=0;i<frames;i++){const dt=Math.min(1/options.fps,seconds-i/options.fps);runtime.setClock(scene.elapsed+dt);scene.step(dt);}}
 advance(options.warmup);
 const initial={penalty:scene.contactPenalty,contacts:scene.contacts,damage:scene.totalDamage,enemySeconds:scene.enemySeconds,kills:scene.kills,time:scene.elapsed};
 advance(options.duration);
 const seconds=scene.elapsed-initial.time,rawDamage=scene.totalDamage-initial.damage,penalty=scene.contactPenalty-initial.penalty,damage=rawDamage-penalty,enemySeconds=scene.enemySeconds-initial.enemySeconds;
 return {move_id:moveId,move_name:c.WIKI_EN[def.name]||def.name,type:def.type,category:def.cat||'status',family:def.kind,
  level:scene.moves[0].lvl,evolved:!!scene.moves[0].evolved,pokemon:options.neutralStats?'Neutral attacker':mon.name,ability:profile.abilityId,seed,
  seconds,total_damage:damage,raw_damage:rawDamage,contact_penalty:penalty,contact_removals:scene.contacts-initial.contacts,enemy_seconds:enemySeconds,kills:scene.kills-initial.kills,
  damage_score:damage/seconds,raw_dps:rawDamage/seconds,contact_penalty_dps:penalty/seconds,average_dps_per_enemy:enemySeconds>0?rawDamage/enemySeconds:0,average_damage_score_per_enemy:enemySeconds>0?damage/enemySeconds:0,
  average_living_enemies:enemySeconds/seconds,final_15s_dps:scene.dps(),final_15s_dps_per_enemy:scene.perEnemyDps()};
}
function aggregate(trials){
 const rawDamage=trials.reduce((n,t)=>n+t.raw_damage,0),penalty=trials.reduce((n,t)=>n+t.contact_penalty,0),damage=trials.reduce((n,t)=>n+t.total_damage,0),seconds=trials.reduce((n,t)=>n+t.seconds,0),enemySeconds=trials.reduce((n,t)=>n+t.enemy_seconds,0),first=trials[0];
 return {move_id:first.move_id,move_name:first.move_name,type:first.type,category:first.category,family:first.family,
  level:first.level,evolved:first.evolved,trials:trials.length,total_damage:damage,raw_damage:rawDamage,contact_penalty:penalty,contact_removals:trials.reduce((n,t)=>n+t.contact_removals,0),simulated_seconds:seconds,
  damage_score:damage/seconds,raw_dps:rawDamage/seconds,contact_penalty_dps:penalty/seconds,average_dps_per_enemy:enemySeconds?rawDamage/enemySeconds:0,average_damage_score_per_enemy:enemySeconds?damage/enemySeconds:0,average_living_enemies:enemySeconds/seconds,
  enemy_seconds:enemySeconds,kills:trials.reduce((n,t)=>n+t.kills,0)};
}
function csv(rows){const keys=Object.keys(rows[0]||{});const cell=value=>{const s=typeof value==='number'&&!Number.isInteger(value)?value.toFixed(2):String(value??'');return /[",\r\n]/.test(s)?'"'+s.replaceAll('"','""')+'"':s;};return [keys.join(','),...rows.map(row=>keys.map(key=>cell(row[key])).join(','))].join('\n')+'\n';}
const HELP=`Standalone PokéSurvivor swarm move benchmark (Node.js 18+; no installation needed)

  node helpful_tools/swarm_simulator/run.cjs [options]

  --neutral             Equal ×1 attack multipliers, no mono-type bonus, no ability,
                        no items/run upgrades, Hardy nature and clear weather.
  --pokemon 25          Pokémon dex number (default Pikachu). Benchmarks ALL moves,
                        even ones this Pokémon cannot learn.
  --duration 120        Measured seconds per move, after warm-up.
  --warmup 30           Unmeasured seconds for arrivals and status stacking.
  --enemy-hp 100        Enemy HP.
  --spawn-rate 15       Arrivals per second (0.1–100), subject to population limit.
  --max-enemies 25       Maximum living enemies.
  --no-contact-penalty  Disable the contact rule for a raw-DPS reference run.
  --layers 1           Stationary-layout setting (unused in benchmark swarm).
  --per-layer 8         Stationary-layout setting (unused in benchmark swarm).
  --arc 360             Spawn arc, centred upward. Game-derived offscreen radius.
  --ability ID          Pokémon's ability ID, or none. Default: first regular ability.
  --elapsed 1200        Run seconds used by conditional abilities, as in preview.
  --kills 1000          Kills used by conditional abilities, as in preview.
  --weather auto        auto, none, sun, rain, sand, snow, fog.
  --trials 1            Repetitions per move, consecutive seeds.
  --seed 42             Reproducible starting seed (same seed set for each move).
  --fps 60              Fixed simulation steps per second (30–240).
  --moves ID,ID         Only run selected move IDs; default: every move.
  --out PATH           Output directory; default: results beside this program.
  --list               List available move IDs without running simulations.
  --help               Show this help.

Outputs move-dps.csv and move-dps.json. Damage score = (raw HP damage minus
remaining HP of enemies removed on player contact) / measured time. Scores may
be negative. Raw damage and contact penalties are also exported separately.
Average DPS per enemy = measured damage / living-enemy seconds (includes arrivals
outside the view). JSON includes full-precision results and individual trials.
Max level + evolution, one move at a time. Status-only moves deal zero raw damage but can have negative damage scores.
This measures the preview's neutral training swarm, not the full game's wave AI.
`;
function main(argv=process.argv.slice(2)){
 const strings=['pokemon','duration','warmup','enemy-hp','spawn-rate','layers','per-layer','max-enemies','arc','ability','elapsed','kills','weather','trials','seed','fps','moves','out'];
 const {values}=parseArgs({args:argv,options:Object.fromEntries([...strings.map(key=>[key,{type:'string'}]),['no-contact-penalty',{type:'boolean'}],['neutral',{type:'boolean'}],['help',{type:'boolean'}],['list',{type:'boolean'}]])});
 if(values.help){process.stdout.write(HELP);return;}
 const options=settings(values),c=createRuntime(options.seed).context;
 if(!c.G.DEX_BY[options.pokemon])throw Error(`Unknown Pokémon dex number: ${options.pokemon}`);
 if(!['auto','none','sun','rain','sand','snow','fog'].includes(options.conditions.weather))throw Error('Unknown weather.');
 c.ComboAbilities.prepare(c.G.DEX_BY[options.pokemon],options.conditions);
 const all=c.G.Moves.ALL;
 if(values.list){console.table(all.map(m=>({id:m.id,name:c.WIKI_EN[m.name]||m.name,type:m.type,family:m.kind})));return;}
 const ids=values.moves?[...new Set(values.moves.split(',').map(s=>s.trim()).filter(Boolean))]:all.map(m=>m.id);
 if(!ids.length||ids.some(id=>!c.G.Moves.BY_ID[id]))throw Error('Unknown or empty --moves list. Use --list for move IDs.');
 const out=path.resolve(values.out||path.join(__dirname,'results')),rows=[],trials=[];
 console.error(`Simulating ${ids.length} moves × ${options.trials} trial(s); ${options.warmup}s warm-up + ${options.duration}s measured at ${options.fps} Hz.`);
 for(let i=0;i<ids.length;i++){
  const runs=[];for(let t=0;t<options.trials;t++)runs.push(runTrial(ids[i],options,(options.seed+t)>>>0));
  trials.push(...runs);rows.push(aggregate(runs));
  if((i+1)%10===0||i===ids.length-1)console.error(`Completed ${i+1}/${ids.length} moves.`);
 }
 rows.sort((a,b)=>b.damage_score-a.damage_score||a.move_id.localeCompare(b.move_id));
 const report={generated_at:new Date().toISOString(),settings:options,pokemon:options.neutralStats?'Neutral attacker (×1 physical/special)':c.G.DEX_BY[options.pokemon].name,
  metric_definitions:{damage_score:'(Raw HP damage minus remaining HP removed on player contact) divided by measured seconds. Negative scores are valid.',total_damage:'Raw damage minus contact penalty, over the measurement window.',raw_dps:'Actual HP damage divided by measured seconds, excluding overkill.',average_dps_per_enemy:'Raw HP damage divided by living-enemy seconds, including offscreen enemies.',average_damage_score_per_enemy:'Net damage after contact penalties divided by living-enemy seconds.'},
  limitations:['Same neutral Substitute training swarm as the preview, not full game waves.','Stationary invulnerable player; no items or run upgrades; one maximum/evolved move per trial.','Ability start/outgoing/critical/cooldown hooks and selected weather follow preview; passive ability tick/contact damage excluded.','Burn follows preview level-1 scaling; poison uses enemy maximum HP.','Trials use fixed time steps and seeded randomness; website playback uses variable frame timing.'],
  sources:Object.fromEntries(compiled.map(s=>[s.file,s.hash])),results:rows,trials};
 fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'move-dps.csv'),csv(rows));fs.writeFileSync(path.join(out,'move-dps.json'),JSON.stringify(report,null,2)+'\n');
 console.table(rows.slice(0,20).map(r=>({move:r.move_name,'Damage score':r.damage_score.toFixed(2),'Contact penalty':r.contact_penalty,'DPS / enemy':r.average_dps_per_enemy.toFixed(2),kills:r.kills})));
 console.log(`All ${rows.length} results saved to:\n${path.join(out,'move-dps.csv')}\n${path.join(out,'move-dps.json')}`);
 return report;
}
module.exports={createRuntime,settings,runTrial,aggregate,csv,main};
if(require.main===module){try{main();}catch(error){console.error('Error: '+error.message);process.exitCode=1;}}
