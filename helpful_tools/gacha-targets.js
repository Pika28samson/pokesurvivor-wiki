'use strict';
(function(root){
 const normal=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
 function find(mons,query,limit=12){const q=normal(query);if(!q)return [];const number=/^\d+$/.test(q)?Number(q):null;return mons.filter(m=>number!==null?m.dex===number:normal(m.name).includes(q)).sort((a,b)=>Number(normal(b.name)===q)-Number(normal(a.name)===q)||a.name.localeCompare(b.name)).slice(0,limit);}
 root.WikiGachaTargets={find};
})(typeof window==='undefined'?globalThis:window);
