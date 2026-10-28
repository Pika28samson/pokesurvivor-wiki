'use strict';
const fs=require('node:fs'),path=require('node:path');
const {createRuntime}=require('./swarm_simulator/run.cjs');
function parseCsv(text){const rows=[];let row=[],cell='',quoted=false;for(let i=0;i<text.length;i++){const ch=text[i];if(ch==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}else if(!quoted&&(ch===','||ch==='\n')){row.push(cell.replace(/\r$/,''));cell='';if(ch==='\n'){rows.push(row);row=[];}}else cell+=ch;}if(quoted)throw Error('Unclosed CSV quote.');if(cell||row.length){row.push(cell.replace(/\r$/,''));rows.push(row);}const header=rows.shift().map(s=>s.replace(/^\uFEFF/,''));return rows.filter(r=>r.some(Boolean)).map(r=>Object.fromEntries(header.map((h,i)=>[h,r[i]])));}
function build(csvFile=path.join(__dirname,'swarm_simulator/results/move-dps.csv'),outFile=path.join(__dirname,'move-dps-data.js')){
 const entries=parseCsv(fs.readFileSync(csvFile,'utf8')),json=path.join(path.dirname(csvFile),'move-dps.json');
 if(!fs.existsSync(json))throw Error('Matching move-dps.json is required to identify the benchmark Pokémon and ability.');
 const report=JSON.parse(fs.readFileSync(json,'utf8')),options=report.settings,c=createRuntime(42).context,rows={};
 const profile=c.ComboAbilities.prepare(c.G.DEX_BY[options.pokemon],options.conditions);
 for(const entry of entries){const id=entry.move_id,value=Number(entry.damage_score),level=Number(entry.level);if(rows[id]||!c.G.Moves.BY_ID[id]||!Number.isFinite(value))throw Error('Invalid/duplicate benchmark row: '+id);
 const original=report.results.find(row=>row.move_id===id);if(!original||Number(original.damage_score.toFixed(2))!==value)throw Error('CSV and JSON benchmark results differ for '+id);
 const scene=c.ComboPreview.create(options.pokemon,[id],{singleMove:true,mode:'swarm',neutralStats:options.neutralStats,conditions:options.conditions,cdMul:profile.cdMul,statusCd:profile.statusCd});
 const m=scene.moves[0],p=scene.player,e=scene.enemy;
 const scheduled=m.kind==='orbit'?m.cd:Math.max(.05,m.cd*profile.cdMul);
 const crit=1+p.critChance*((p.abil.critMul||1.5)-1);
 const factor=m.kind==='buff'?1:p.atkFor(m)*(p.abil.out?p.abil.out(p,m,e):1)*crit*c.G.Weather.mult(m.type)*m.cd/scheduled;
 if(!Number.isFinite(factor)||factor<=0)throw Error('Invalid benchmark scaling: '+id);
 const raw=Number(entry.raw_dps),penalty=Number(entry.contact_penalty_dps);if(!Number.isFinite(raw)||raw<0||!Number.isFinite(penalty)||penalty<0)throw Error('Invalid damage components: '+id);
 rows[id]={damage_score:value,raw_dps:raw,contact_penalty_dps:penalty,level,evolved:entry.evolved==='true',benchmark_factor:factor};
 }
 for(const m of c.G.Moves.ALL)if(!rows[m.id])throw Error('Missing benchmark move: '+m.id);
 const data={source:'swarm_simulator/results/move-dps.csv',pokemon:options.pokemon,pokemonName:report.pokemon,settings:options,generatedAt:report.generated_at,rows};
 fs.writeFileSync(outFile,'// Generated from move-dps.csv by import-move-dps.cjs. Do not edit.\nG.MoveDps='+JSON.stringify(data,null,2)+';\n');return data;
}
module.exports={parseCsv,build};
if(require.main===module){try{const data=build(process.argv[2]?path.resolve(process.argv[2]):undefined);console.log('Imported '+Object.keys(data.rows).length+' CSV DPS values into helpful_tools/move-dps-data.js');}catch(e){console.error(e.message);process.exitCode=1;}}
