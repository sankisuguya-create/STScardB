// engine の検査：node --test tests/
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const E = require('../src/engine.js');
const D = E.data;
const { runOne, stats, verdict } = require('./sim.cjs');

test('全カード・全課題の参照が正しい', () => {
  const ids = Object.keys(D.CARDS);
  D.STARTER.concat(D.REWARD_POOL).forEach((id) => assert.ok(D.CARDS[id], id));
  Object.entries(D.ENEMIES).forEach(([eid, en]) => en.situ.forEach((id) => assert.ok(D.CARDS[id], eid + ':' + id)));
  ids.forEach((id) => { const c = D.CARDS[id]; if (c.fail) assert.ok(D.CARDS[c.fail], id + '.fail'); });
  Object.values(D.EVENTS).forEach((ev) => ev.options.forEach((o) => { if (o.effects.addCard) assert.ok(D.CARDS[o.effects.addCard]); }));
});

test('相談・謝罪・整えるカードには使用条件がない', () => {
  ['consult', 'tell_teacher', 'ask_teacher', 'apologize', 'firm_reply', 'tell_hurt', 'breathe', 'name_feeling', 'breathe_first', 'say_dunno']
    .forEach((id) => assert.ok(!D.CARDS[id].req, id));
  Object.values(D.CARDS).filter((c) => c.type === 'calm').forEach((c) => assert.ok(!c.req, c.name));
});

test('衝動カードは成長の経験にならず、必ずモヤモヤが入る', () => {
  Object.values(D.CARDS).filter((c) => c.judge === 'impulse').forEach((c) => {
    assert.ok(!D.STATS[c.type], c.name);
    assert.ok(c.curse, c.name);
  });
});

test('同じシード・同じ方針なら同じ結果になる', () => {
  const a = runOne(42, 'prosocial'), b = runOne(42, 'prosocial');
  assert.deepStrictEqual(a.log, b.log);
});

test('通しプレイ中、不変条件が守られる（各方針200回）', () => {
  for (const pol of ['prosocial', 'impulse', 'passive']) {
    for (let i = 0; i < 200; i++) {
      const s = runOne(i * 31 + 7, pol);
      assert.strictEqual(s.phase, 'end');
      assert.deepStrictEqual(E.checkInvariants(s), []);
    }
  }
});

test('失敗したら「次の手」が手札に入り、経験は数える', () => {
  let found = false;
  for (let seed = 1; seed < 400 && !found; seed++) {
    const s = E.newRun(seed, 1);
    E.chooseNode(s, 0);
    const i = s.battle.hand.findIndex((h) => D.CARDS[h.id].fail);
    if (i < 0) continue;
    const id = s.battle.hand[i].id, st = D.CARDS[id].type;
    const before = s.battle.usage[st];
    E.playCard(s, i);
    const last = s.log.filter((e) => e.k === 'play').pop();
    if (!last.ok) {
      found = true;
      assert.ok(s.battle.hand.some((h) => h.id === D.CARDS[id].fail));
      assert.strictEqual(s.battle.usage[st], before + 1);
    }
  }
  assert.ok(found, '失敗の例が見つからない');
});

test('見方カードで課題の名前と相性が変わる', () => {
  for (let seed = 1; seed < 200; seed++) {
    const s = E.newRun(seed, 1);
    E.chooseNode(s, 0);
    if (s.battle.enemy.id !== 'bumped') continue;
    for (let k = 0; k < 2; k++) { s.battle.hand.push({ id: 'watch_them', temp: true }); s.battle.energy = 3; E.playCard(s, s.battle.hand.length - 1); }
    assert.strictEqual(s.battle.enemy.name, D.ENEMIES.bumped.forms[2]);
    assert.ok(s.battle.enemy.backfire.includes('impulse'));
    return;
  }
  assert.fail('bumped が出なかった');
});

test('信頼3以下ならやり直しのできごとが出る', () => {
  const s = E.newRun(5, 1);
  s.trust = 2; s.row = 1;
  E.chooseNode(s, 1);
  assert.strictEqual(s.event.id, 'second_chance');
});

test('合格基準（各方針1000回）', () => {
  const r = stats(1000);
  for (const [name, ok] of verdict(r)) assert.ok(ok, name + ' ' + JSON.stringify(r));
});

test('場面に合わないカードは、その戦いの山札・手札に出ない', () => {
  for (let seed = 1; seed < 300; seed++) {
    const s = E.newRun(seed, 1);
    E.chooseNode(s, 0);
    const ctx = D.ENEMIES[s.battle.enemy.id].ctx;
    const live = s.battle.draw.concat(s.battle.hand).filter((h) => !h.temp);
    live.forEach((h) => assert.ok(E.fits(h.id, ctx), h.id + ' @' + ctx));
    if (s.battle.enemy.id === 'bumped') { assert.ok(s.battle.bench.some((h) => h.id === 'try_it')); return; }
  }
  assert.fail('bumped が出なかった');
});

test('アイテム：戦いごとに1回、なくならない。先生は場面のカードをくれ、報酬にも出る', () => {
  for (let seed = 1; seed < 300; seed++) {
    const s = E.newRun(seed, 1);
    E.chooseNode(s, 0);
    if (s.battle.enemy.id !== 'dunno') continue;
    E.useSupport(s, 'teacher');
    assert.ok(!E.canUseSupport(s, 'teacher'));
    assert.ok(s.battle.hand.some((h) => h.id === 'ask_teacher'));
    assert.strictEqual(s.battle.enemy.form, 1);
    assert.deepStrictEqual(s.equip, ['teacher']);
    s.battle.enemy.hp = 0; s.battle.hand.push({ id: 'try_it', temp: true }); s.battle.energy = 3;
    E.playCard(s, s.battle.hand.length - 1);
    assert.strictEqual(s.phase, 'reward');
    assert.ok(s.reward.choices.includes('ask_teacher'));
    E.pickReward(s, null);
    E.chooseNode(s, 0);
    if (s.phase === 'battle') assert.ok(E.canUseSupport(s, 'teacher'));
    return;
  }
  assert.fail('dunno が出なかった');
});

test('整理するカードで 姿が3段階 現実に近づき、いきおいが弱まる。かしこさ2なら 1段階目から', () => {
  const s = E.newRun(11, 1);
  E.chooseNode(s, 0);
  const en = s.battle.enemy, E0 = D.ENEMIES[en.id];
  assert.strictEqual(en.form, 0); assert.strictEqual(en.name, E0.forms[0]);
  s.battle.hand.push({ id: 'sort_out', temp: true }); s.battle.energy = 3;
  E.playCard(s, s.battle.hand.length - 1);
  assert.strictEqual(en.form, 1); assert.ok(en.stressMul < 1);
  const s2 = E.newRun(11, 1); s2.stats.think = 2;
  E.chooseNode(s2, 0);
  assert.strictEqual(s2.battle.enemy.form, 1);
});

test('ひと休みで アイテムを入れかえられる（3つまで・持っているものだけ）', () => {
  const s = E.newRun(3, 1);
  s.items = ['teacher', 'friend', 'family', 'book'];
  s.phase = 'rest';
  E.setEquip(s, ['friend', 'family', 'book']);
  assert.deepStrictEqual(s.equip, ['friend', 'family', 'book']);
  assert.throws(() => E.setEquip(s, ['teacher', 'friend', 'family', 'book']));
  s.items = ['teacher'];
  assert.throws(() => E.setEquip(s, ['friend']));
});

test('時間で過ぎ去る課題：ターン数を乗りこえると終わり、報酬はない。からかいは過ぎ去らない', () => {
  assert.ok(!D.ENEMIES.teased.pass && !D.ENEMIES.presentation.pass);
  for (let seed = 1; seed < 300; seed++) {
    const s = E.newRun(seed, 1);
    E.chooseNode(s, 0);
    if (s.battle.enemy.id !== 'bumped') continue;
    s.yoyu = 999; s.maxYoyu = 999;
    for (let i = 0; i < 3 && s.phase === 'battle'; i++) E.endTurn(s);
    assert.strictEqual(s.phase, 'reward');
    assert.strictEqual(s.reward.choices.length, 0);
    assert.ok(s.reward.passed);
    return;
  }
  assert.fail('bumped が出なかった');
});
