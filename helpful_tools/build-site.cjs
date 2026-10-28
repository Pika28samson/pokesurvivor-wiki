'use strict';
const fs=require('node:fs'),path=require('node:path');
const repo=path.resolve(__dirname,'..'),upstream=path.resolve(repo,process.argv[2]||'.'),out=process.argv[3]?path.resolve(process.argv[3]):path.join(repo,'_site');
if(fs.existsSync(out))throw Error('_site already exists; use a fresh build directory.');
fs.mkdirSync(out);
for(const dir of ['js','assets'])fs.cpSync(path.join(upstream,dir),path.join(out,dir),{recursive:true});
fs.cpSync(__dirname,path.join(out,'helpful_tools'),{recursive:true,filter:s=>!['hosting','swarm_simulator'].includes(path.basename(s))});
require('./navigation.cjs').apply(path.join(out,'helpful_tools'));
require('./build-reference-data.cjs').build(upstream,path.join(out,'helpful_tools'));
fs.mkdirSync(path.join(out,'helpful_tools/swarm_simulator/results'),{recursive:true});
for(const file of ['move-dps.csv','move-dps.json'])fs.copyFileSync(path.join(__dirname,'swarm_simulator/results',file),path.join(out,'helpful_tools/swarm_simulator/results',file));
for(const file of ['LICENSE','LICENSE-NONCOMMERCIAL.md','CREDITS.md'])fs.copyFileSync(path.join(upstream,file),path.join(out,file));
fs.writeFileSync(path.join(out,'.nojekyll'),'');
fs.writeFileSync(path.join(out,'index.html'),'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Pok\u00e9Survivor Wiki</title><meta http-equiv="refresh" content="0;url=helpful_tools/"></head><body><a href="helpful_tools/">Open Pok\u00e9Survivor Wiki</a></body></html>');
const home=path.join(out,'helpful_tools/index.html');
fs.writeFileSync(home,fs.readFileSync(home,'utf8').replace('</main>','<p class="source">Unofficial fan wiki. Game code: <a href="https://github.com/JPTER78/pokesurvivor">Copyright 2026 JPTER78</a> · <a href="../LICENSE-NONCOMMERCIAL.md">Noncommercial licence</a> · <a href="../CREDITS.md">Asset credits</a></p></main>'));
let checked=0;
function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory()){if(entry.name!=='assets')walk(file);continue;}if(!file.endsWith('.html'))continue;const html=fs.readFileSync(file,'utf8'),base=html.match(/<base href="([^"]+)"/),baseDir=base?path.resolve(path.dirname(file),base[1]):path.dirname(file);for(const match of html.matchAll(/(?:src|href)="([^"#]+)"/g)){const link=match[1].split(/[?#]/)[0];if(!link||/^(?:https?:|data:|mailto:)/.test(link))continue;if(!fs.existsSync(path.resolve(baseDir,link)))throw Error('Missing '+link+' in '+file);checked++;}}}
walk(out);console.log('Built wiki; verified '+checked+' local HTML links.');
