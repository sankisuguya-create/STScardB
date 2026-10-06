// engine の検査：node --test tests/
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const E = require('../src/engine.js');
const D = E.data;
const { runOne, stats, verdict } = require('./sim.cjs');
// マスを えらぶと 状きょうの 説明（intro）を はさむ。検査では すぐ 戦いに 入る
const _choose = E.chooseNode;
E.chooseNode = (s, i) => { _choose(s, i); if (s.phase === 'intro') E.beginBattle(s); return s; };

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
  Object.values(D.CARDS).filter((c) => c.type === 'calm' && !c.adv).forEach((c) => assert.ok(!c.req, c.name));
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
  s.trust = 2;
  s.phase = 'map'; s.row = 1; s.pos = null;
  s.map.rows[1] = [{ col: 0, kind: 'event' }]; s.map.edges.push({ r: 0, from: null, to: 0 });
  E.chooseNode(s, 0);
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
    const s = E.newRun(seed, 1, 'tario');
    E.chooseNode(s, 0);
    if (s.battle.enemy.id !== 'dunno') continue;
    E.useSupport(s, 'teacher');
    assert.ok(!E.canUseSupport(s, 'teacher'));
    assert.ok(s.battle.hand.concat(s.battle.discard).some((h) => h.id === 'ask_teacher'));
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
  const s = E.newRun(11, 1, 'tario');
  E.chooseNode(s, 0);
  const en = s.battle.enemy, E0 = D.ENEMIES[en.id];
  assert.strictEqual(en.form, 0); assert.strictEqual(en.name, E0.forms[0]);
  s.battle.hand.push({ id: 'sort_out', temp: true }); s.battle.energy = 3;
  E.playCard(s, s.battle.hand.length - 1);
  assert.strictEqual(en.form, 1); assert.ok(en.stressMul < 1);
  const s2 = E.newRun(11, 1, 'tario'); s2.stats.think = 2;
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


test('あぶない場面：にげると 乗りこえた あつかい（報酬あり・信頼+1）', () => {
  for (let seed = 1; seed < 400; seed++) {
    const s = E.newRun(seed, 1);
    E.chooseNode(s, 0);
    if (D.ENEMIES[s.battle.enemy.id].kind !== 'danger') continue;
    const t0 = s.trust;
    const i = s.battle.hand.findIndex((h) => h.id === 'run_now');
    E.playCard(s, i);
    if (s.phase !== 'reward') continue;
    assert.ok(s.reward.escaped);
    assert.ok(s.reward.choices.length > 0);
    assert.ok(s.trust >= t0 + 1);
    return;
  }
  assert.fail('あぶない場面が出なかった');
});

test('ふつうの課題で にげると 問題が のこる（モヤモヤ・報酬なし）', () => {
  for (let seed = 1; seed < 400; seed++) {
    const s = E.newRun(seed, 1);
    E.chooseNode(s, 0);
    if (D.ENEMIES[s.battle.enemy.id].kind === 'danger') continue;
    s.battle.hand.push({ id: 'run_now', temp: true });
    const n = s.deck.filter((x) => x === 'moyamoya').length;
    E.playCard(s, s.battle.hand.length - 1);
    if (s.phase !== 'reward') continue;
    assert.ok(s.reward.fled);
    assert.strictEqual(s.reward.choices.length, 0);
    assert.strictEqual(s.deck.filter((x) => x === 'moyamoya').length, n + 1);
    return;
  }
  assert.fail();
});

test('心の余裕が0：ゲームは終わらず「動けない」になり、終わると 苦手意識がつき 余裕は1割', () => {
  for (let seed = 1; seed < 400; seed++) {
    const s = E.newRun(seed, 1, 'tario');
    E.chooseNode(s, 0);
    const E0 = D.ENEMIES[s.battle.enemy.id];
    if (E0.kind !== 'danger') continue;
    s.yoyu = 1;
    for (let k = 0; k < 4 && !s.battle.frozen; k++) E.endTurn(s);
    assert.notStrictEqual(s.phase, 'end');
    assert.ok(s.battle.frozen);
    assert.deepStrictEqual(s.battle.hand.map((h) => h.id), ['ugokenai']);
    for (let k = 0; k < 5 && s.phase === 'battle'; k++) E.endTurn(s);
    assert.strictEqual(s.phase, 'reward');
    assert.ok(s.reward.frozen);
    assert.ok(s.nigate[E0.ctx] >= 1);
    assert.strictEqual(s.yoyu, Math.round(s.maxYoyu * D.RULES.frozenRecover));
    return;
  }
  assert.fail();
});

test('きょりを おく：いきおいを0にし、ストレスを弱める', () => {
  const s = E.newRun(21, 1);
  E.chooseNode(s, 0);
  s.battle.enemy.str = 5;
  const before = s.battle.enemy.stressMul;
  s.battle.hand.push({ id: 'keep_distance', temp: true }); s.battle.energy = 3;
  E.playCard(s, s.battle.hand.length - 1);
  assert.strictEqual(s.battle.enemy.str, 0);
  assert.ok(s.battle.enemy.stressMul < before);
});

test('信頼の理由（why）は すべて振り返りで 文に できる', () => {
  for (const pol of ['prosocial', 'impulse', 'adaptive']) for (let i = 0; i < 100; i++) {
    const s = runOne(i * 13 + 5, pol);
    s.log.filter((e) => e.k === 'trust').forEach((e) => {
      assert.ok(e.why === 'start' || e.why === 'escape' || e.why.startsWith('event:') || D.CARDS[e.why], e.why);
    });
  }
});

test('マップ：7段＋ボス、線で つながった マスしか えらべない、課題の半分以上が ボスに 関連', () => {
  for (let seed = 1; seed < 50; seed++) {
    const s = E.newRun(seed, 1);
    assert.strictEqual(s.map.rows.length, D.MAP.rows + 1);
    const battles = s.map.rows.flat().filter((n) => n.kind === 'battle');
    assert.ok(battles.filter((n) => n.related).length >= battles.length / 2);
    battles.forEach((n) => assert.ok(D.ENEMIES[n.enemy]));
    E.chooseNode(s, E.reachable(s)[0]);
    s.phase = 'map'; s.battle = null; s.row = 1;
    const ok = E.reachable(s);
    assert.ok(ok.length >= 1);
    s.map.rows[1].forEach((n, i) => { if (!ok.includes(i)) assert.throws(() => E.chooseNode(s, i)); });
  }
});

test('関連する課題を 乗りこえると ボスの ハートが へり、ボスが 弱くなる', () => {
  const s = E.newRun(7, 1);
  const i = s.map.rows[0].findIndex((n) => n.related);
  if (i < 0) return;
  E.chooseNode(s, i);
  s.battle.enemy.hp = 0; s.battle.hand.push({ id: 'try_it', temp: true }); s.battle.energy = 3;
  E.playCard(s, s.battle.hand.length - 1);
  assert.strictEqual(s.hearts, D.MAP.hearts - 1);
  const s2 = E.newRun(7, 1); s2.hearts = 0; s2.phase = 'map'; s2.row = D.MAP.rows;
  E.chooseNode(s2, 0);
  const full = Math.round(D.ENEMIES[D.ACTS[0].boss].hp * D.RULES.hpScale);
  assert.ok(s2.battle.enemy.maxHp < full);
});

test('3層モード：ボスを たおすと 次の層へ。3つ目の ボスで おわる', () => {
  const s = runOne(3, 'adaptive', 3);
  assert.strictEqual(s.phase, 'end');
  assert.ok(s.log.some((e) => e.k === 'act'));
});

test('休むと「お家の人に そうだんする」が デッキに 入る', () => {
  const s = E.newRun(3, 1); s.phase = 'rest';
  E.rest(s, 'rest');
  assert.ok(s.deck.includes('consult_family'));
});

test('手札は 5まい＋かしこさ まで。あふれた カードは すて札へ', () => {
  for (let seed = 1; seed < 60; seed++) {
    const s = E.newRun(seed, 1);
    s.stats.think = seed % 3;
    E.chooseNode(s, E.reachable(s)[0]);
    if (s.phase !== 'battle') continue;
    const lim = 5 + s.stats.think;
    assert.ok(s.battle.hand.length <= lim);
    for (let k = 0; k < 4 && s.phase === 'battle'; k++) { E.endTurn(s); if (s.phase === 'battle') assert.ok(s.battle.hand.length <= lim); }
  }
  const s = E.newRun(2, 1); s.stats.think = 0; E.chooseNode(s, E.reachable(s)[0]);
  while (s.battle.hand.length < 5) s.battle.hand.push({ id: 'endure', temp: true });
  const d = s.battle.discard.length;
  s.battle.energy = 3; s.battle.hand.push({ id: 'write_plan', temp: true });
  s.battle.hand.splice(0, 1);
  E.playCard(s, s.battle.hand.length - 1);
  assert.ok(s.battle.hand.length <= 5);
});

test('パニック：効果のない 使えないカード。整えるカードで 1まい 消える', () => {
  const s = E.newRun(4, 1); E.chooseNode(s, E.reachable(s)[0]);
  if (s.phase !== 'battle') return;
  s.battle.hand = [{ id: 'panic', temp: true }, { id: 'panic', temp: true }];
  assert.ok(!E.canPlay(s, 0));
  s.battle.hand.push({ id: 'breathe', temp: true }); s.battle.energy = 3;
  E.playCard(s, s.battle.hand.length - 1);
  assert.strictEqual(s.battle.hand.filter((h) => h.id === 'panic').length, 1);
});

test('問題行動を えらぶと、次に 道と関係なく トラブルが 起き、そのあと 同じ段の マップに もどる', () => {
  for (let seed = 1; seed < 200; seed++) {
    const s = E.newRun(seed, 1); E.chooseNode(s, E.reachable(s)[0]);
    if (s.phase !== 'battle' || D.ENEMIES[s.battle.enemy.id].kind === 'danger') continue;
    s.battle.hand.push({ id: 'tataku', temp: true });
    E.playCard(s, s.battle.hand.length - 1);
    s.battle && (s.battle.enemy.hp = 0);
    if (s.phase === 'battle') { s.battle.hand.push({ id: 'try_it', temp: true }); s.battle.energy = 3; E.playCard(s, s.battle.hand.length - 1); }
    if (s.phase !== 'reward') continue;
    E.pickReward(s, null);
    assert.strictEqual(s.phase, 'event');
    assert.strictEqual(s.event.id, 'trouble_hit');
    const row = s.row;
    E.chooseEvent(s, 0); E.leaveEvent(s);
    assert.strictEqual(s.phase, 'map'); assert.strictEqual(s.row, row);
    assert.ok(s.deck.includes('apologize'));
    return;
  }
  assert.fail();
});

test('すべての課題に 状きょうの 説明が ある。マスを えらぶと 説明の 画面になる', () => {
  Object.entries(D.ENEMIES).forEach(([k, e]) => assert.ok(e.intro && e.intro.length > 10, k));
  const s = E.newRun(1, 1);
  _choose(s, E.reachable(s)[0]);
  assert.strictEqual(s.phase, 'intro');
  E.beginBattle(s);
  assert.strictEqual(s.phase, 'battle');
});

test('主人公4人：はじめの成長と 心の余裕が ちがう。ハヤツは 打たれ弱い', () => {
  const h = E.newRun(1, 1, 'hanoko'), y = E.newRun(1, 1, 'hayatsu');
  assert.strictEqual(h.stats.think, 2); assert.strictEqual(h.stats.act, 0);
  assert.deepStrictEqual(y.stats, { think: 2, act: 2, relate: 2 });
  assert.ok(h.deck.includes('write_plan'));
  assert.ok(h.deck.includes('analyse'));
  Object.values(D.HEROES).forEach((H) => H.cards.forEach((id) => { const c = D.CARDS[id]; if (c.req) Object.keys(c.req).forEach((k) => { if (k !== 'trust') assert.ok(H.stats[k] >= c.req[k], H.name + ':' + id); }); }));
});

test('上級カードは、成長が 条件に 届くまで 報酬に 出ない', () => {
  for (let seed = 1; seed < 80; seed++) {
    const s = E.newRun(seed, 1, 'hayatsu'); s.stats = { think: 0, act: 0, relate: 0 };
    E.chooseNode(s, E.reachable(s)[0]);
    if (s.phase !== 'battle') continue;
    s.battle.enemy.hp = 0; s.battle.hand.push({ id: 'endure', temp: true }); s.battle.energy = 3;
    s.battle.hand.push({ id: 'try_it', temp: true }); E.playCard(s, s.battle.hand.length - 1);
    if (s.phase === 'reward') s.reward.choices.forEach((id) => assert.ok(!D.CARDS[id].adv, id));
  }
  let seen = false;
  for (let i = 0; i < 200 && !seen; i++) {
    const t = E.newRun(i + 3, 1, 'hayatsu'); t.stats = { think: 5, act: 5, relate: 5 }; t.trust = 8; t.act = 1; t.map = t.map;
    E.chooseNode(t, E.reachable(t)[0]);
    if (t.phase !== 'battle') continue;
    t.battle.enemy.hp = 0; t.battle.hand.push({ id: 'try_it', temp: true }); t.battle.energy = 3; E.playCard(t, t.battle.hand.length - 1);
    if (t.phase === 'reward' && t.reward.choices.some((id) => D.CARDS[id].adv)) seen = true;
  }
  assert.ok(seen);
});

test('デッキの カードの 場面は、どれも 実在する 場面', () => {
  const ctxs = new Set(Object.values(D.ENEMIES).map((e) => e.ctx));
  Object.entries(D.CARDS).forEach(([k, c]) => (c.ctx || []).forEach((x) => assert.ok(ctxs.has(x), k + ':' + x)));
});

test('ハヤツ：ピンチの時は 回復が 半分、モヤモヤの 減りが 2倍', () => {
  const s = E.newRun(1, 1, 'hayatsu'); s.phase = 'rest'; s.yoyu = 10;
  E.rest(s, 'rest');
  assert.strictEqual(s.yoyu, 10 + Math.ceil(Math.round(s.maxYoyu * D.RULES.restHeal) * 0.5));
  const t = E.newRun(1, 1, 'hayatsu'); E.chooseNode(t, E.reachable(t)[0]);
  if (t.phase !== 'battle') return;
  t.yoyu = 40; t.battle.guard = 999; t.battle.hand = [{ id: 'moyamoya' }]; t.deck.push('moyamoya');
  const y0 = t.yoyu; E.endTurn(t);
  assert.ok(y0 - t.yoyu >= D.RULES.moyaDrain * 2);
});

test('報酬の カードは、その課題の 場面で 使えるものだけ', () => {
  for (let seed = 1; seed < 120; seed++) {
    const s = E.newRun(seed, 1, 'tario'); E.chooseNode(s, E.reachable(s)[0]);
    if (s.phase !== 'battle') continue;
    const ctx = D.ENEMIES[s.battle.enemy.id].ctx;
    s.battle.enemy.hp = 0; s.battle.hand.push({ id: 'endure', temp: true }); s.battle.energy = 3;
    E.playCard(s, s.battle.hand.length - 1);
    if (s.phase !== 'reward') continue;
    s.reward.choices.forEach((id) => assert.ok(E.fits(id, ctx), id + ' @' + ctx));
  }
});

test('レアは 1層では ほとんど 出ず、2層から 出はじめる', () => {
  assert.ok(D.RULES.rareChance[0] < 0.1 && D.RULES.rareChance[1] >= 0.3);
  assert.ok(D.ADVANCED.length >= 18);
});
