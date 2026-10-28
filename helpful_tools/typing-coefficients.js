'use strict';
// Use species probabilities and complete defending type arrays, not independent type averages.
G.TypingCoefficient=(()=>{
  const weights=G.TypingPopulation.weights;
  const total=weights.reduce((sum,[,weight])=>sum+weight,0);
  const probabilities=weights.map(([dex,weight])=>({dex,probability:weight/total}));
  const coefficients={},outcomes={},frequencies={};
  let dualTypeShare=0;
  for(const {dex,probability} of probabilities){
    const types=G.DEX_BY[dex].types;
    if(types.length>1)dualTypeShare+=probability;
    for(const type of types)frequencies[type]=(frequencies[type]||0)+probability;
  }
  for(const type of Object.keys(G.Types.CHART)){
    let coefficient=0,superEffective=0,resisted=0,neutral=0;
    for(const {dex,probability} of probabilities){
      const multiplier=G.Types.mult(type,G.DEX_BY[dex].types);
      coefficient+=probability*multiplier;
      if(multiplier>1+1e-9)superEffective+=probability;
      else if(multiplier<1-1e-9)resisted+=probability;
      else neutral+=probability;
    }
    coefficients[type]=coefficient;outcomes[type]={superEffective,resisted,neutral};
  }
  return {coefficients,outcomes,frequencies,dualTypeShare,probabilities,total};
})();
