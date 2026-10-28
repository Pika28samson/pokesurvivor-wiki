const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGame, findPartners } = require('./find_tm.cjs');

test('known fallback choices on 2026-10-24', () => {
  const game = loadGame('2026-10-24');
  for (const [name, dex] of [['Draining Kiss', 25], ['Dragon Claw', 6], ['Shadow Ball', 133], ['Rock Tomb', 448]]) {
    const result = findPartners(game, name);
    assert.equal(result.inBase, false);
    assert.ok(result.partners.some(mon => mon.dex === dex));
    assert.ok(!result.partners.some(mon => mon.dex === 129));
  }
});

test('first seven stay available to all; base slot eight can be replaced', () => {
  const game = loadGame('2026-10-24');
  const result = findPartners(game, 'Hyper Voice');
  assert.equal(result.inBase, true);
  assert.equal(result.partners.length, game.DEX.length);
  const eighth = findPartners(game, 'Substitute');
  assert.ok(eighth.partners.some(mon => mon.dex === 129));
  assert.ok(!eighth.partners.some(mon => mon.dex === 25));
});

test('date changes selection and repeated searches are deterministic', () => {
  const game = loadGame('2026-10-24');
  const first = findPartners(game, 'shadow_ball');
  assert.deepEqual(findPartners(game, 'SHADOW BALL'), first);
  assert.notDeepEqual(findPartners(loadGame('2026-10-25'), 'shadow-ball').base, first.base);
  assert.equal(game.DB.save.partner, null);
});

test('rejects unknown TMs and invalid dates', () => {
  assert.throws(() => loadGame('2026-02-30'), /valid/);
  assert.throws(() => loadGame('24-10-2026'), /valid/);
  assert.throws(() => findPartners(loadGame('2026-10-24'), 'not a move'), /Unknown TM/);
});
