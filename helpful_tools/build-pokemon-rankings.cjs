'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const ROOT=path.resolve(__dirname,'..');
const files=['js/core/util.js','js/data/pokedex.js','js/data/moves.js','js/data/tms.js','js/data/abilities.js','js/data/ability-fx.js','js/data/starters.js','js/data/sprites-meta.js','js/data/types.js','js/systems/stats.js','js/systems/weather.js','helpful_tools/typing-population.js','helpful_tools/typing-coefficients.js','helpful_tools/move-dps-data.js','helpful_tools/wiki-data.js','helpful_tools/combo-abilities.js','helpful_tools/move-combos.js'];
const options={includeTms:true,forceHarden:true,requiredMoves:['harden'],attackCategory:'all',attackStyle:'all',rankBy:'damageScore',limit:1,hpPercent:100,enemyHpPercent:100,elapsed:1200,kills:1000,weather:'auto',slowed:false,angry:true,hasItem:false};
const bands=[['S',.05],['A',.20],['B',.40],['C',.60],['D',.80],['E',.95],['F',1]];
function tierForRank(rank,count){const position=(rank-1)/count;return bands.find(([,end])=>position<end)[0];}
function load(){const c={G:{DB:{save:{ptm:{}}}},WIKI_EN:{}};c.window=c;vm.createContext(c);const sources={};for(const file of files){const source=fs.readFileSync(file.startsWith('js/')?path.join(__dirname,'game-reference',file):path.join(ROOT,file),'utf8');sources[file]=crypto.createHash('sha256').update(source).digest('hex');vm.runInContext(source,c,{filename:file});}return {c,sources};}
function hardenOptions(){return {forceHarden:true,requiredMoves:['harden'],excludedMoves:[]};}
function bestFor(mon,c,buildOptions=hardenOptions(mon,c)){let best;const ids=c.ComboAbilities.ids(mon);for(const abilityId of ids.length?ids:['none']){const combo=c.MoveCombos.best(mon,{...options,...buildOptions,abilityId})[0];if(!combo)continue;const score=combo.damageScore;if(!best||score>best.score+1e-8||(Math.abs(score-best.score)<1e-8&&(abilityId+'|'+combo.key)<(best.abilityId+'|'+best.moves.join('|'))))best={dex:mon.dex,score,abilityId,moves:Array.from(combo.ids)};}if(!best)throw Error('No valid combination for '+mon.dex);return best;}
function healthScore(mon,c){const physical=c.G.Stats.taken(mon,'physical'),special=c.G.Stats.taken(mon,'special');return mon.hp/((physical+special)/2);}
function overallScore(row){return row.damageRank*0.65+row.healthRank*0.25+row.speedRank*0.1;}
function referenceRank(score,rows,key,dex){return 1+rows.filter(row=>row.dex!==dex&&row[key]>score+1e-8).length;}
function selectOverallBuild(mon,c,rows){
 const row=rows.find(r=>r.dex===mon.dex);
 const candidates=(row.healthScore<130?[true]:[true,false]).map(harden=>{
  const build=bestFor(mon,c,{forceHarden:harden,requiredMoves:harden?['harden']:[],excludedMoves:harden?[]:['harden']});
  const damageRank=referenceRank(build.score,rows,'damageScore',mon.dex);
  const healthRank=harden?row.healthRank:referenceRank(row.healthScore*0.65,rows,'healthScore',mon.dex);
  return {...build,harden,overallScore:overallScore({damageRank,healthRank,speedRank:row.speedRank})};
 });
 return candidates[1]&&candidates[1].overallScore<candidates[0].overallScore-1e-8?candidates[1]:candidates[0];
}
function assignRanks(rows,scoreKey,rankKey,tierKey,descending=true){rows.sort((a,b)=>(descending?b[scoreKey]-a[scoreKey]:a[scoreKey]-b[scoreKey])||a.dex-b.dex);let rank=1,last;for(let i=0;i<rows.length;i++){if(i===0||Math.abs(rows[i][scoreKey]-last)>1e-8)rank=i+1;rows[i][rankKey]=rank;rows[i][tierKey]=tierForRank(rank,rows.length);last=rows[i][scoreKey];}}
function build(progress=()=>{}){const {c,sources}=load(),rows=c.G.DEX.map((mon,i)=>{const best=bestFor(mon,c);best.damageScore=best.score;best.healthScore=healthScore(mon,c);best.speedScore=mon.spd;progress(i+1,c.G.DEX.length);return best;});
 assignRanks(rows,'damageScore','damageRank','damageTier');assignRanks(rows,'healthScore','healthRank','healthTier');assignRanks(rows,'speedScore','speedRank','speedTier');
 for(const row of rows){row.overallBuild=selectOverallBuild(c.G.DEX_BY[row.dex],c,rows);row.overallScore=row.overallBuild.overallScore;row.rank=row.damageRank;row.tier=row.damageTier;}
 assignRanks(rows,'overallScore','overallRank','overallTier',false);
 const countsFor=key=>Object.fromEntries(bands.map(([tier])=>[tier,rows.filter(r=>r[key]===tier).length]));
 const countsByRanking={damage:countsFor('damageTier'),health:countsFor('healthTier'),speed:countsFor('speedTier'),overall:countsFor('overallTier')};
 return {version:4,model:'Damage: best four-move/ability estimate; Harden required for every Pokemon. Health: HP divided by equal physical/special damage taken. Speed: base movement speed. Overall: compare Harden and no-Harden builds only at effective HP >=130; otherwise require Harden with 65% damage, 25% health and 10% speed; no-Harden uses 65% effective HP against the unchanged health table. Public component rankings are independent.',healthFormula:'HP / ((physicalDamageTaken + specialDamageTaken) / 2), using the game Stats.taken defence formula; no abilities, typing, items or buffs.',speedFormula:'Base in-game movement speed (mon.spd); no abilities, items or buffs.',overallFormula:'Choose the lower weighted rank of Harden and no-Harden builds: 0.65 * build damage rank + 0.25 * build health rank + 0.10 * speed rank. Candidate ranks use unchanged public reference tables; no-Harden health uses 0.65 * effective HP. Harden wins exact ties. No-Harden is not evaluated below 130 effective HP.',hardenPolicy:{damageRanking:'required for every Pokemon',overallRanking:'compare required and excluded builds only at effective HP >=130; below 130 require Harden; no-Harden requires max Damage Reduction'},options,bands:bands.map(([tier,end])=>({tier,topFraction:end})),count:rows.length,counts:countsByRanking.damage,countsByRanking,sources,rows:Object.fromEntries(rows.map(row=>[row.dex,row]))};}
module.exports={build,load,bestFor,tierForRank,options,bands,healthScore,hardenOptions,overallScore,referenceRank,selectOverallBuild,assignRanks};
if(require.main===module){const data=build((n,total)=>{if(n%100===0||n===total)console.error('Ranked '+n+'/'+total+' Pokémon');});fs.writeFileSync(path.join(__dirname,'pokemon-rankings.js'),'// Generated by build-pokemon-rankings.cjs. Estimates, not battle simulations.\nG.PokemonRankings='+JSON.stringify(data)+';\n');console.log(JSON.stringify(data.counts));}
