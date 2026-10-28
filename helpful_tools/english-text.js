'use strict';
// English additions for Helpful Tools. Game data and mechanics stay unchanged.
(() => {
  const text={
    '+15 % de daño a los Pokémon de tipo Siniestro.':'+15% damage against Dark-type Pokémon.',
    '+40 % de daño de tipo Agua y recibe la mitad de daño de Fuego.':'+40% Water-type damage and takes half damage from Fire-type attacks.'
  };
  for(const [type,spanish] of Object.entries(G.U.TYPE_NAME)){
    const english=type[0].toUpperCase()+type.slice(1);
    text[`+8 % de daño con movimientos de tipo ${spanish}.`]=`+8% damage with ${english}-type moves.`;
    text[`+20 % de daño con movimientos de tipo ${spanish}.`]=`+20% damage with ${english}-type moves.`;
    text[`+35 % de daño de tipo ${spanish} con poca vida (menos de 1/3).`]=`+35% ${english}-type damage while below one-third HP.`;
    text[`Los ataques de tipo ${spanish} no le hacen daño: le curan un poco.`]=`${english}-type attacks deal no damage to this Pokémon and heal it slightly instead.`;
  }
  Object.assign(window.WIKI_EN||(window.WIKI_EN={}),text);
})();
