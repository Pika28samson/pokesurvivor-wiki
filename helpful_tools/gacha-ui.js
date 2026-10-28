'use strict';
(()=>{
 const $=id=>document.getElementById(id),game=G.Gacha,regions=['Kanto','Johto','Hoenn','Sinnoh','Unova','Kalos','Alola','Galar','Paldea'];
 regions.forEach((n,i)=>$('gacha-banner').add(new Option(n,i+1)));
 function populate(){const gen=Number($('gacha-banner').value),previous=$('gacha-target').value;$('gacha-target').replaceChildren(new Option('Any 5★ Pokémon','any5'));G.DEX.filter(m=>m.gen===gen&&G.SPRITE_META[m.dex]).sort((a,b)=>a.name.localeCompare(b.name)).forEach(m=>$('gacha-target').add(new Option(`#${String(m.dex).padStart(3,'0')} ${m.name} · ${m.rarity}★`,m.dex)));if([...$('gacha-target').options].some(o=>o.value===previous))$('gacha-target').value=previous;sync();}
 function sync(){const any=$('gacha-target').value==='any5';$('gacha-shiny').disabled=any;if(any)$('gacha-shiny').checked=false;}
 $('gacha-banner').addEventListener('change',populate);$('gacha-target').addEventListener('change',sync);populate();
 const initial=new URLSearchParams(location.search);if(regions[Number(initial.get('gen'))-1]){$('gacha-banner').value=initial.get('gen');populate();}if(initial.has('dex')&&[...$('gacha-target').options].some(o=>o.value===initial.get('dex')))$('gacha-target').value=initial.get('dex');sync();
 const lookup=$('gacha-target-search'),results=$('gacha-target-results'),allTargets=G.DEX.filter(m=>G.SPRITE_META[m.dex]);
 function searchTargets(){const q=lookup.value.trim();results.replaceChildren();results.hidden=!q;if(!q)return;const matches=WikiGachaTargets.find(allTargets,q);if(!matches.length){results.textContent='No Pokémon match that name or dex number.';return;}for(const mon of matches){const button=document.createElement('button');button.type='button';button.textContent='#'+String(mon.dex).padStart(3,'0')+' '+mon.name+' · '+regions[mon.gen-1];button.addEventListener('click',()=>{$('gacha-banner').value=String(mon.gen);populate();$('gacha-target').value=String(mon.dex);sync();lookup.value='#'+String(mon.dex).padStart(3,'0')+' '+mon.name;results.hidden=true;$('gacha-target').focus();});results.append(button);}}
 lookup.addEventListener('input',searchTargets);lookup.addEventListener('keydown',e=>{if(e.key==='Escape')results.hidden=true;if(e.key==='ArrowDown'){const b=results.querySelector('button');if(b){e.preventDefault();b.focus();}}if(e.key==='Enter'&&!results.hidden){const b=results.querySelector('button');if(b){e.preventDefault();b.click();}}});
 $('gacha-banner').addEventListener('change',()=>{lookup.value='';results.hidden=true;});
 $('gacha-target').addEventListener('change',()=>{lookup.value='';results.hidden=true;});
 function render(e){e?.preventDefault();$('gacha-error').textContent='';if(!$('gacha-form').reportValidity())return;
  try{const normal=Number($('gacha-tickets').value),tens=Number($('gacha-ten-tickets').value),pulls=Math.floor(normal/10)*10+tens*10;if(pulls>20000)throw Error('Please use a budget of at most 20,000 pulls.');
   const options={gen:Number($('gacha-banner').value),target:$('gacha-target').value,shiny:$('gacha-shiny').checked,charm:$('gacha-charm').checked,pity:Number($('gacha-pity').value),pulls,hasShiny:dex=>!!G.SPRITE_META[dex]?.sh};
   const result=WikiGacha.calculate(game,options),pct=result.probability===0?'0%':result.probability===1?'100%':result.probability<.000001?'<0.0001%':result.probability>.999999?'>99.9999%':`${(result.probability*100).toFixed(2)}%`;
   $('gacha-chance').textContent=pct;$('gacha-budget').textContent=`Chance of at least one result in ${pulls.toLocaleString('en-GB')} pulls (${pulls/10} ten-pulls). ${normal%10} normal tickets left unspent.`;
   $('gacha-thresholds').replaceChildren(...[50,90,99].map(n=>{const p=document.createElement('p');p.textContent=`${n}% chance: ${result.impossible?'unavailable':result.thresholds[n]===null?'more than 20,000 pulls':result.thresholds[n].toLocaleString('en-GB')+' pulls'}`;return p;}));
   $('gacha-shiny-note').hidden=!options.shiny;$('gacha-impossible').hidden=!result.impossible;$('gacha-impossible').textContent=result.impossible?'This Pokémon has no shiny form in the current sprite catalogue.':'';
   const k=WikiGacha.kernel(game,options.gen,options.target,options.shiny,options.charm,options.hasShiny),base=k.normal.reduce((s,r)=>s+r.weight*r.hit,0);$('gacha-base').textContent=`Ordinary pull chance before guarantees: ${(base*100).toFixed(4)}%.`;
  }catch(error){$('gacha-error').textContent=error.message;}
 }
 $('gacha-form').addEventListener('submit',render);render();
})();
