'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
function build(upstream=path.resolve(__dirname,'..'),destination=__dirname){
 const c={G:{},WIKI_EN:{}};c.window=c;c.G.I18n={add:d=>Object.assign(c.WIKI_EN,d)};vm.createContext(c);
 const inputs=['js/core/util.js','js/data/pokedex.js','js/data/sprites-meta.js','js/data/moves.js','js/data/abilities.js','js/data/ability-fx.js','js/data/items.js','js/ui/icons.js','js/systems/gacha.js','js/systems/mons.js','js/systems/orbs.js','js/entities/player.js','js/entities/pickup.js','js/entities/enemy.js','js/systems/combat.js','js/world/world.js','js/systems/judgment.js'];
 for(const file of ['js/core/util.js','js/data/pokedex.js','js/data/sprites-meta.js','js/data/moves.js','js/data/abilities.js','js/data/ability-fx.js','js/data/lang-en.js'])vm.runInContext(fs.readFileSync(path.join(upstream,file),'utf8'),c,{filename:file});
 for(const file of ['english-text.js','abilities.js','items.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,file),'utf8'),c,{filename:file});
 const clean=s=>String(s).replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim(),entries=[],add=(kind,title,url,text='',keywords='')=>entries.push({kind,title,url,text:clean(text),keywords});
 for(const m of c.G.DEX)add('pokemon',m.name,'pokemon-detail.html?dex='+m.dex,`${m.types.join(' ')} Generation ${m.gen} ${m.rarity} stars`,String(m.dex)+' '+String(m.dex).padStart(3,'0')+' '+(c.G.DEX_ABIL[m.dex]||[]).filter(Boolean).map(id=>c.G.ABIL[id]?.[1]||id).join(' '));
 for(const m of c.G.Moves.ALL)add('move',c.WIKI_EN[m.name]||m.name,'move.html?id='+m.id,`${c.WIKI_EN[m.desc]||m.desc} ${m.type} ${m.kind} ${m.cat||'buff'}`,m.id);
 for(const id of Object.keys(c.G.ABIL)){const mon=c.G.DEX.find(m=>(c.G.DEX_ABIL[m.dex]||[]).includes(id))||{types:['normal']};add('ability',c.G.ABIL[id][1]||id,'abilities.html#'+id,c.AbilityReference.description(id,mon),id);}
 for(const item of c.WikiItems)add('item',item.name,'items.html#'+item.id,item.effect,item.kind==='orb'?'mystery dungeon orb':item.kind);
 const ui=fs.readFileSync(path.join(__dirname,'wiki-ui.js'),'utf8'),start=ui.indexOf('  const articles=['),end=ui.indexOf('  function typingArticle()',start);
 if(start<0||end<0)throw Error('Cannot locate mechanics catalogue for search.');vm.runInContext(ui.slice(start,end).replace('const articles=','window._mechanics='),c);
 for(const [id,title,body] of c._mechanics)add('mechanic',title,'mechanics.html#'+id,body);
 for(const match of ui.matchAll(/articles\.unshift\(\['([^']+)','([^']+)'/g))add('mechanic',match[2],'mechanics.html#'+match[1],match[1]==='typing-score'?'Damage score DPS benchmark typing coefficient effectiveness spawns':'Damage health speed overall tiers ranking assumptions');
 add('tool','Gacha probability calculator','gacha.html','Gacha tickets pity ten-pull guarantee shiny chance banner');add('tool','TM partner finder','tm-finder.html','Kecleon shop date partner teaching TMs');add('tool','Build simulation','simulation.html','Save compare builds moving swarm DPS damage');
 fs.writeFileSync(path.join(destination,'search-index.js'),'window.WIKI_SEARCH_INDEX='+JSON.stringify({entries})+';\n');
 vm.runInContext(fs.readFileSync(path.join(upstream,'js/ui/icons.js'),'utf8'),c);
 fs.mkdirSync(path.join(destination,'item-sprites'),{recursive:true});
 for(const item of c.WikiItems){const icon=item.kind==='orb'?'orb:'+item.id:item.id;if(!c.G.Icons.UI[icon])throw Error('Missing game sprite: '+icon);fs.writeFileSync(path.join(destination,'item-sprites',item.id+'.svg'),decodeURIComponent(c.G.Icons.url(icon).split(',').slice(1).join(',')));}
 fs.writeFileSync(path.join(destination,'search-index.json'),JSON.stringify({entries},null,2)+'\n');
 const hashes=Object.fromEntries(inputs.map(file=>[file,crypto.createHash('sha256').update(fs.readFileSync(path.join(upstream,file))).digest('hex')]));fs.writeFileSync(path.join(destination,'reference-provenance.json'),JSON.stringify({description:'Game sources used to verify gacha, ability slot probabilities and item/orb references. Deployment uses the upstream commit pinned in hosting/pages.yml.',sources:hashes},null,2)+'\n');
 console.log(`Indexed ${entries.length} wiki entries.`);return {entries,hashes};
}
module.exports={build};if(require.main===module)build(process.argv[2]?path.resolve(process.argv[2]):undefined);
