// バランス・シミュレータ。3つの方針で通しプレイさせ、合格基準を確かめる。
// node tests/sim.cjs [回数]
'use strict';
const E = require('../src/engine.js');
const D = E.data;

const POLICIES = {
  // 向社会的：よい選択を先に、衝動は使わない
  prosocial: { order: ['good', 'neutral'], reward: (c) => c.judge === 'good', rest: 'remove-impulse', event: 0 },
  // 衝動：衝動を先に、あとは手当たりしだい
  impulse: { order: ['impulse', 'neutral', 'good'], reward: (c) => c.type === 'act', rest: 'rest', event: 2 },
  // がまん：がまん・受け身を先に。関わるカードは使わない
  passive: { order: ['passive', 'neutral'], reward: (c) => c.type === 'calm', rest: 'rest', event: 2 },
  // 適応：ふだんは向社会的、あぶない場面では はなれる・にげる、からかいでは きっぱり／先生
  // 自力：向社会的だが 助けを もとめない（相談カード・アイテムを 使わない）
  selfreliant: { order: ['good', 'neutral'], reward: (c) => c.judge === 'good' && !c.help, rest: 'remove-impulse', event: 0, noHelp: true },
  adaptive: { order: ['good', 'neutral'], reward: (c) => c.judge === 'good', rest: 'remove-impulse', event: 0, adaptive: true }
};

function rank(c, pol, s) {
  const kind = c.style === 'passive' && c.judge !== 'good' ? 'passive' : c.judge;
  let r = pol.order.indexOf(kind);
  if (pol === POLICIES.passive && c.type === 'relate') r = -1;
  const danger = D.ENEMIES[s.battle.enemy.id].kind === 'danger';
  if (c.escape && !(pol.adaptive && danger)) r = -1;
  if (c.escape && pol.adaptive && danger) return 1000;
  if (c.distance && !pol.adaptive) r = -1;
  if (c.help && pol.noHelp) r = -1;
  if (r < 0) return -1;
  // 同じ順位の中では、見方を変えるカード・効く種類を先に
  let bonus = 0;
  const p = E.preview(s, s.battle.hand.findIndex((h) => E.card(h.id) === c));
  if (c.organize && s.battle.enemy.form < 2) bonus += 3;
  if (p.weak) bonus += 2;
  if (p.backfire && pol !== POLICIES.impulse) bonus -= 5;
  if (c.type === 'calm' && D.ENEMIES[s.battle.enemy.id].anxiety && !s.battle.calm) bonus += 4;
  if (c.type === 'calm' && s.battle.hand.some((h) => h.id === 'panic')) bonus += 6;
  return (10 - r) * 10 + bonus;
}

function useSupports(s) {
  // 先生は最初のターンに、ほかは余裕が減ったら使う
  const b = s.battle;
  const want = (id) => {
    if (id === 'teacher') return true;
    if (id === 'friend') return s.yoyu < s.maxYoyu * 0.6;
    if (id === 'family') return s.yoyu < s.maxYoyu * 0.5;
    if (id === 'book') return b.hand.some((h) => h.id === 'moyamoya') || s.yoyu < s.maxYoyu * 0.4;
    return false;
  };
  for (const id of s.equip) if (s.phase === 'battle' && E.canUseSupport(s, id) && want(id)) E.useSupport(s, id);
}

function playTurn(s, pol) {
  if (!pol.noHelp) useSupports(s);
  for (let guard = 0; guard < 30 && s.phase === 'battle'; guard++) {
    let best = -1, bestScore = -1;
    s.battle.hand.forEach((h, i) => {
      if (!E.canPlay(s, i)) return;
      const sc = rank(E.card(h.id), pol, s);
      if (sc > bestScore) { bestScore = sc; best = i; }
    });
    if (best < 0) break;
    E.playCard(s, best);
    const errs = E.checkInvariants(s);
    if (errs.length) throw new Error('invariant: ' + errs.join(','));
  }
  if (s.phase === 'battle') E.endTurn(s);
}

function runOne(seed, polName, mode, hero) {
  const pol = POLICIES[polName];
  const s = E.newRun(seed, mode || 1, hero || 'hayatsu');
  let steps = 0;
  while (s.phase !== 'end' && steps++ < 6000) {
    if (s.phase === 'intro') E.beginBattle(s);
    else if (s.phase === 'actclear') E.nextAct(s);
    else if (s.phase === 'map') {
      const ok = E.reachable(s);
      let rt = process.env.ROUTE;
      if (rt === 'smart') rt = (s.maxYoyu - s.yoyu) / s.maxYoyu > D.PLAYER.overStress ? 'easy' : 'hard';
      const want = s.row === 0 && rt ? ok.find((i) => s.map.rows[0][i].route === rt) : undefined;
      E.chooseNode(s, want !== undefined ? want : ok[(seed + s.row) % ok.length]);
    } else if (s.phase === 'battle') playTurn(s, pol);
    else if (s.phase === 'reward') {
      if (s.reward.support) E.takeSupport(s);
      const c = s.reward.choices.find((id) => E.card(id).adv && pol.reward(E.card(id))) || s.reward.choices.find((id) => pol.reward(E.card(id)));
      E.pickReward(s, c || null);
    } else if (s.phase === 'rest') {
      E.setEquip(s, s.items.slice(0, D.SUPPORT_RULES.slots));
      const idx = s.deck.findIndex((id) => E.card(id).judge === 'impulse' || id === 'moyamoya');
      if (pol.rest === 'remove-impulse' && idx >= 0 && s.yoyu > s.maxYoyu * 0.4) E.rest(s, 'remove', idx);
      else E.rest(s, 'rest');
    } else if (s.phase === 'event') {
      const opts = D.EVENTS[s.event.id].options;
      let i = Math.min(D.EVENTS[s.event.id].trouble ? (pol.event ? 1 : 0) : pol.event, opts.length - 1);
      while (i > 0 && !E.optionOpen(s, opts[i])) i--;
      E.chooseEvent(s, i); E.leaveEvent(s);
    }
  }
  return s;
}

function stats(n) {
  const out = {};
  for (const name of Object.keys(POLICIES)) {
    let taken = 0, turns = 0, battles = 0, wins = 0, goodTry = 0, goodFail = 0, impTry = 0, impOk = 0, floors = 0, grows = 0, trust = 0, stuck = 0;
    for (let i = 0; i < n; i++) {
      const s = runOne(1000 + i * 7919, name, +(process.env.ACTS||1), ['hanoko', 'tario', 'musuhi', 'hayatsu'][i % 4]);
      if (s.result && s.result.won) wins++;
      floors += s.floor;
      stuck += E.summary(s).stuck;
      trust += s.trust;
      for (const e of s.log) {
        if (e.k === 'win' && e.turns) { battles++; turns += e.turns; taken += e.taken || 0; }
        if (e.k === 'play' && e.judge === 'good' && E.card(e.card).chance) { goodTry++; if (!e.ok) goodFail++; }
        if (e.k === 'play' && e.judge === 'impulse') { impTry++; if (e.ok) impOk++; }
        if (e.k === 'grow') grows++;
      }
    }
    out[name] = {
      win: wins / n, stuck: +(stuck / n).toFixed(2), turns: +(turns / Math.max(1, battles)).toFixed(2), hurt: +(taken / Math.max(1, battles)).toFixed(1), hurtPerTurn: +(taken / Math.max(1, turns)).toFixed(2), avgFloor: floors / n, avgTrust: trust / n, growsPerRun: grows / n,
      goodFailRate: goodTry ? goodFail / goodTry : null,
      impulseOkRate: impTry ? impOk / impTry : null
    };
  }
  return out;
}

// 合格基準（docs/design.md §5）
function verdict(r) {
  const checks = [
    ['勝率 適応 > 向社会的', r.adaptive.win > r.prosocial.win],
    ['勝率 向社会的 > 衝動', r.prosocial.win > r.impulse.win],
    ['勝率 衝動 > がまん', r.impulse.win > r.passive.win],
    ['向社会的なら 勝てる（勝率 ≥ 85%）', r.prosocial.win >= 0.85],
    ['衝動は 勝ちにくい（ボス突破が 向社会的より 25点以上 低く、動けない回数が 2倍以上）', r.prosocial.win - r.impulse.win >= 0.25 && r.impulse.stuck >= 2 * r.prosocial.stuck],
    ['1バトルが短い（平均 3ターン以下）', r.prosocial.turns <= 3 && r.adaptive.turns <= 3],
    ['まちがった戦法は 追いこまれる（1ターンの ダメージが 適応の 1.7倍以上）', r.impulse.hurtPerTurn >= 1.7 * r.adaptive.hurtPerTurn && r.passive.hurtPerTurn >= 1.7 * r.adaptive.hurtPerTurn],
    ['よい選択の失敗率 20〜35%', r.prosocial.goodFailRate >= 0.2 && r.prosocial.goodFailRate <= 0.35],
    ['衝動の その場の成功率 ≥ 60%', r.impulse.impulseOkRate >= 0.6]
  ];
  return checks;
}

module.exports = { runOne, stats, verdict, POLICIES };

if (require.main === module) {
  const n = Number(process.argv[2] || 1000);
  const r = stats(n);
  console.table(r);
  let fail = 0;
  for (const [name, ok] of verdict(r)) { console.log((ok ? 'OK  ' : 'NG  ') + name); if (!ok) fail++; }
  process.exit(fail ? 1 : 0);
}
