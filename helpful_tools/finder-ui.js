'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const RealDate = window.Date;
  const name = id => id.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
  let matches = [];
  let chosenDay = '';
  const exclusions = G.createFamilyExclusions($('family-exclusions'), Object.keys(G.TM_MOVES).map(id => G.Moves.BY_ID[id].kind), () => renderMoves());
  const colours = { normal:'#b0a99f',fire:'#ff7b3d',water:'#4b9bff',grass:'#5fcb6a',electric:'#ffd33d',ice:'#7fe0e0',fighting:'#e0533d',poison:'#b45ec4',ground:'#d6b25c',flying:'#9bb8ff',psychic:'#ff5f9e',bug:'#a3c43d',rock:'#bfa96b',ghost:'#7a6bc4',dragon:'#8d7aff',dark:'#ae9586',steel:'#a8b8c4',fairy:'#ff9ed8' };
  const colour = (element, type) => element.style.setProperty('--type-color', colours[type] || colours.normal);
  function typeTag(type) {
    const tag = document.createElement('span'); tag.className = 'type'; tag.textContent = type; colour(tag, type); return tag;
  }
  function sprite(mon) {
    const area = document.createElement('div'); area.className = 'sprite-area';
    const animations = G.SPRITE_META?.[mon.dex]?.a;
    const animation = animations?.Idle ? 'Idle' : animations?.Walk ? 'Walk' : null;
    if (!animation) { area.textContent = 'Sprite unavailable'; return area; }
    const meta = animations[animation], scale = Math.min(2, 88 / meta.h, 160 / meta.w);
    const frame = document.createElement('span'); frame.className = 'sprite-frame';
    frame.style.width = `${meta.w * scale}px`; frame.style.height = `${meta.h * scale}px`;
    const image = document.createElement('img'); image.alt = `${mon.name} sprite`; image.loading = 'lazy'; image.decoding = 'async';
    image.style.width = `${meta.w * meta.n * scale}px`; image.style.height = `${meta.h * meta.r * scale}px`;
    image.src = `../assets/pokemon/${mon.dex}/${animation}.png`;
    image.addEventListener('error', () => { area.textContent = 'Sprite unavailable'; }, { once:true });
    frame.append(image); area.append(frame); return area;
  }
  function renderMoves() {
    const excluded = exclusions.values();
    const query = $('move-search').value.trim().toLowerCase().replace(/[-_]+/g, ' ');
    const type = $('move-type').value, category = $('move-category').value, style = $('move-style').value;
    const ids = Object.keys(G.TM_MOVES).sort().filter(id => {
      const move = G.Moves.BY_ID[id], cat = move.cat || 'status';
      const haystack = `${name(id)} ${move.type} ${cat} ${cat === 'status' ? 'buff' : ''}`.toLowerCase();
        return !excluded.has(move.kind) && (!type || move.type === type) && (!category || cat === category) && (!style || G.moveAttackStyle(move) === style) && query.split(/\s+/).every(term => haystack.includes(term));
    });
    $('move-count').textContent = `${ids.length} of ${Object.keys(G.TM_MOVES).length} TMs · Selected: ${name($('tm').value)}`;
    $('move-list').replaceChildren(...ids.map(id => {
      const move = G.Moves.BY_ID[id], button = document.createElement('button');
      button.type = 'button'; button.className = 'move-choice'; colour(button, move.type);
      button.setAttribute('aria-pressed', String(id === $('tm').value));
      button.append(document.createTextNode(name(id)));
      const detail = document.createElement('small'); detail.append(typeTag(move.type), document.createTextNode(` · ${move.cat || 'status / buff'}`)); button.append(detail);
      button.addEventListener('click', () => { $('tm').value = id; search(); }); return button;
    }));
    if (!ids.length) { const empty = document.createElement('p'); empty.textContent = 'No moves match. Clear the filters or try another search.'; $('move-list').append(empty); }
  }
  const today = () => {
    const p = {};
    for (const part of new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new RealDate())) p[part.type] = part.value;
    return `${p.year}-${p.month}-${p.day}`;
  };
  // Only this standalone page's clock is changed. No game save is loaded.
  window.Date = class extends RealDate {
    constructor(...args) { super(...(args.length ? args : [chosenDay ? `${chosenDay}T12:00:00Z` : RealDate.now()])); }
    static now() { return chosenDay ? +new RealDate(`${chosenDay}T12:00:00Z`) : RealDate.now(); }
  };

  function renderResults() {
    const query = $('filter').value.trim().toLowerCase().replace(/^#/, '');
    const visible = matches.filter(m => m.name.toLowerCase().includes(query) || String(m.dex).includes(query) || String(m.dex).padStart(4, '0').includes(query));
    $('count').textContent = `${visible.length} of ${matches.length} matching Pokémon`;
    const fragment = document.createDocumentFragment();
    for (const mon of visible) {
      const card = document.createElement('article'); card.className = 'pokemon';
      colour(card, mon.types[0]);
      const dex = document.createElement('div'); dex.className = 'dex'; dex.textContent = `#${String(mon.dex).padStart(4, '0')}`;
      const title = document.createElement('h3'); title.textContent = mon.name;
      const types = document.createElement('div'); types.className = 'types';
      for (const type of mon.types) types.append(typeTag(type));
      card.append(sprite(mon), dex, title, types); fragment.append(card);
    }
    $('results').replaceChildren(fragment);
    $('empty').classList.toggle('hidden', visible.length > 0);
    $('empty').textContent = matches.length ? 'No Pokémon match your filter.' : 'No partner can offer this TM on this date. Try another day.';
  }

  function search() {
    $('error').textContent = '';
    const date = $('date').value, instant = new RealDate(`${date}T12:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(+instant) || instant.toISOString().slice(0, 10) !== date) {
      $('error').textContent = 'Choose a valid date.'; return;
    }
    chosenDay = date;
    const id = $('tm').value;
    G.DB.save.partner = null;
    const base = G.Shop.dailyTms();
    matches = [];
    try {
      for (const mon of G.DEX) {
        G.DB.save.partner = mon.dex;
        if (G.Shop.dailyTms().includes(id)) matches.push(mon);
      }
    } finally { G.DB.save.partner = null; }
    $('stock').replaceChildren(...base.map((move, i) => {
      const chip = document.createElement('div'); chip.className = `chip${move === id ? ' selected' : ''}`;
      colour(chip, G.Moves.BY_ID[move].type);
      const slot = document.createElement('span'); slot.className = 'slot'; slot.textContent = `${i + 1}`;
      chip.append(slot, document.createTextNode(name(move)), typeTag(G.Moves.BY_ID[move].type)); return chip;
    }));
    $('result-title').textContent = `${name(id)} · ${date}`;
    const index = base.indexOf(id);
    $('explanation').textContent = index >= 0 && index < 7
      ? 'Already in the fixed daily stock. Every partner keeps this TM available for purchase.'
      : index === 7
        ? 'In base slot 8. These partners keep it available instead of replacing it.'
        : 'Set one of these Pokémon as your partner to make this TM appear in slot 8.';
    renderResults();
    renderMoves();
  }

  if (!G.Shop || !G.Mons || !G.DEX) { $('error').textContent = 'Game data could not load. Keep this page in helpful_tools inside the repository.'; return; }
  for (const id of Object.keys(G.TM_MOVES).sort()) { const option = document.createElement('option'); option.value = id; option.textContent = `${name(id)} · ${G.Moves.BY_ID[id].type}`; colour(option, G.Moves.BY_ID[id].type); option.style.color = colours[G.Moves.BY_ID[id].type]; $('tm').append(option); }
  for (const type of Object.keys(colours).sort()) { const option = document.createElement('option'); option.value = type; option.textContent = name(type); $('move-type').append(option); }
  $('move-search').addEventListener('input', renderMoves);
  $('move-type').addEventListener('change', renderMoves);
  $('move-category').addEventListener('change', renderMoves);
  $('move-style').addEventListener('change', renderMoves);
  $('clear-moves').addEventListener('click', () => { $('move-search').value = ''; $('move-type').value = ''; $('move-category').value = ''; $('move-style').value = ''; exclusions.clear(); renderMoves(); });
  $('tm').value = 'shadow-ball'; $('date').value = today();
  $('finder').addEventListener('submit', event => { event.preventDefault(); search(); });
  $('tm').addEventListener('change', search); $('date').addEventListener('change', search);
  $('filter').addEventListener('input', renderResults);
  $('today').addEventListener('click', () => { $('date').value = today(); search(); });
  for (const [id, delta] of [['previous', -1], ['next', 1]]) $(id).addEventListener('click', () => {
    const date = new RealDate(`${$('date').value}T12:00:00Z`);
    if (!Number.isFinite(+date)) return;
    date.setUTCDate(date.getUTCDate() + delta); $('date').value = date.toISOString().slice(0, 10); search();
  });
  search();
})();
