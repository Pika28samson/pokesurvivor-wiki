'use strict';
// Pure probability model; consumes the pinned game's own rates and banner pools.
(function(root){
 function near(game,rarity,gen){for(const d of [0,-1,1,-2,2,-3,3,-4,4]){const r=rarity+d;if(r<1||r>5)continue;const list=game.pool(r,gen);if(list.length)return {rarity:r,list};}throw Error('This banner has no Pokémon.');}
 function kernel(game,gen,target,shiny,charm,hasShiny){
  const hit=(rarity,list)=>{if(target==='any5')return rarity===5?1:0;const mon=list.find(m=>String(m.dex)===String(target));return mon?(shiny?(hasShiny(mon.dex)?(charm?game.SHINY_RATE_IRIS:game.SHINY_RATE):0):1)/list.length:0;};
  const make=min=>{const rates=game.RATES.filter(([r])=>r>=min),total=rates.reduce((s,[,w])=>s+w,0);return rates.map(([r,w])=>{const p=near(game,r,gen);return {rarity:p.rarity,weight:w/total,hit:hit(p.rarity,p.list)};});};
  const p=near(game,5,gen);return {normal:make(1),guaranteed:make(4),pity:[{rarity:p.rarity,weight:1,hit:hit(p.rarity,p.list)}]};
 }
 function calculate(game,{gen=1,target='any5',shiny=false,charm=false,pity=0,pulls=100,limit=20000,hasShiny=()=>true}={}){
  if(!Number.isInteger(pity)||pity<0||pity>=game.PITY_5)throw Error('Pity must be an integer from 0 to 69.');
  if(!Number.isInteger(pulls)||pulls<0||pulls%10||pulls>20000)throw Error('Use 0–20,000 pulls in complete groups of ten.');
  if(target!=='any5'&&!game.pool(1,gen).concat(...[2,3,4,5].map(r=>game.pool(r,gen))).some(m=>String(m.dex)===String(target)))throw Error('Choose a Pokémon from this banner.');
  const k=kernel(game,gen,target,shiny,charm,hasShiny),size=game.PITY_5;
  if(![...k.normal,...k.guaranteed,...k.pity].some(x=>x.hit>0))return {probability:0,thresholds:{50:null,90:null,99:null},limit,impossible:true};
  let state=new Float64Array(size*2);state[pity*2]=1;let probability=pulls===0?0:null;const thresholds={50:null,90:null,99:null};
  for(let draw=1;draw<=Math.max(pulls,limit);draw++){
   const next=new Float64Array(size*2),last=draw%10===0;
   for(let p=0;p<size;p++)for(let high=0;high<2;high++){const mass=state[p*2+high];if(!mass)continue;const rolls=p+1>=size?k.pity:last&&!high?k.guaranteed:k.normal;
    for(const r of rolls){const np=r.rarity===5?0:p+1,nh=last?0:high||r.rarity>=4?1:0;next[np*2+nh]+=mass*r.weight*(1-r.hit);}
   }
   state=next;
   if(last){const chance=Math.max(0,Math.min(1,1-state.reduce((a,b)=>a+b,0)));if(draw===pulls)probability=chance;for(const n of [50,90,99])if(thresholds[n]===null&&chance>=n/100)thresholds[n]=draw;if(draw>=pulls&&thresholds[99]!==null)break;}
  }
  return {probability,thresholds,limit,impossible:false};
 }
 root.WikiGacha={calculate,kernel,near};
})(typeof window==='undefined'?globalThis:window);
