#!/usr/bin/env node
'use strict';

// Run the actual game rules in an isolated context; never read a player save.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const readline = require('node:readline/promises');
const ROOT = path.resolve(__dirname, '..');

function madridToday() {
  const parts = {};
  for (const p of new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date())) parts[p.type] = p.value;
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function loadGame(date = madridToday()) {
  const instant = new Date(`${date}T12:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(+instant) ||
      instant.toISOString().slice(0, 10) !== date) {
    throw new Error('Date must be a valid YYYY-MM-DD date.');
  }
  class ShopDate extends Date {
    constructor(...args) { super(...(args.length ? args : [+instant])); }
    static now() { return +instant; }
  }
  const context = vm.createContext({ G: { DB: { save: { partner: null, ptm: {} } } }, Date: ShopDate });
  for (const file of ['data/pokedex.js', 'data/moves.js', 'data/tms.js', 'systems/mons.js', 'data/shop.js']) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', file), 'utf8'), context, { filename: file });
  }
  return context.G;
}

const normalise = text => text.trim().toLowerCase().replace(/[\s_]+/g, '-');
const display = id => id.split('-').map(word => word[0].toUpperCase() + word.slice(1)).join(' ');

function findPartners(game, input) {
  const id = normalise(input);
  if (!Object.hasOwn(game.TM_MOVES, id)) throw new Error(`Unknown TM: ${input}. Use --list to see valid names.`);
  const save = game.DB.save;
  const previous = save.partner;
  try {
    save.partner = null;
    const base = Array.from(game.Shop.dailyTms());
    const partners = game.DEX.filter(mon => {
      save.partner = mon.dex;
      return game.Shop.dailyTms().includes(id);
    });
    return { id, base, partners, inBase: base.includes(id) };
  } finally { save.partner = previous; }
}

async function main(args) {
  let date = madridToday(), list = false;
  const words = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--date') {
      if (!args[i + 1]) throw new Error('--date requires YYYY-MM-DD.');
      date = args[++i];
    } else if (args[i] === '--list') list = true;
    else if (args[i] === '--help' || args[i] === '-h') {
      console.log('Usage: node helpful_tools/find_tm.cjs [TM name] [--date YYYY-MM-DD] [--list]\nWithout a name, prompts for a TM. Default date: today in Europe/Madrid.');
      return;
    } else if (args[i].startsWith('--')) throw new Error(`Unknown option: ${args[i]}`);
    else words.push(args[i]);
  }
  const game = loadGame(date);
  if (list) {
    console.log(Object.keys(game.TM_MOVES).sort().map(display).join('\n'));
    return;
  }
  let input = words.join(' ');
  if (!input) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    try { input = await rl.question('TM name (e.g. Shadow Ball): '); }
    finally { rl.close(); }
  }
  const result = findPartners(game, input);
  console.log(`\n${display(result.id)} | ${date} (Europe/Madrid)`);
  console.log('Assumption: no Pokemon has learned any TMs.');
  console.log(`Base shop: ${result.base.map(display).join(', ')}`);
  console.log(result.inBase
    ? '\nIn the daily base shop. Partners below keep it available (base slot 8 can be replaced). Buying does not require the partner to learn it.'
    : '\nPartners that replace slot 8 with this TM:');
  console.log(`Matches: ${result.partners.length}\n`);
  for (const mon of result.partners) console.log(`#${String(mon.dex).padStart(4, '0')}  ${mon.name}`);
  if (!result.partners.length) console.log('No partner can make this TM appear on this date. Try another date.');
}

module.exports = { madridToday, loadGame, findPartners };
if (require.main === module) main(process.argv.slice(2)).catch(error => {
  console.error(`Error: ${error.message}`);
  process.exitCode = 1;
});
