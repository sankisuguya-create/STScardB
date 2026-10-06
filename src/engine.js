// ゲームの規則。状態と操作から次の状態を作る。DOM・保存には触れない。
// 乱数は状態に持つ（同じシード・同じ操作なら同じ結果になる）。
(function (root) {
  'use strict';
  var D = (typeof module !== 'undefined' && module.exports) ? require('./data.js') : root.SST_DATA;

  var ENGINE_VER = 6;

  // --- 乱数 ---
  function rand(s) {
    s.rng = (s.rng + 0x6D2B79F5) | 0;
    var t = s.rng;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function pick(s, arr) { return arr[Math.floor(rand(s) * arr.length)]; }
  function shuffle(s, arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(rand(s) * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  function card(id) { return D.CARDS[id]; }
  function fits(id, ctx) { var c = D.CARDS[id]; return !c.ctx || !ctx || c.ctx.indexOf(ctx) >= 0; }
  function statOf(c) { return D.STATS[c.type] ? c.type : null; }

  function log(s, e) { e.floor = s.floor; s.log.push(e); }

  // --- 開始 ---
  function newRun(seed, mode, heroId) {
    var HERO = D.HEROES[heroId] || D.HEROES.hayatsu;
    var s = {
      hero: heroId && D.HEROES[heroId] ? heroId : 'hayatsu',
      ver: ENGINE_VER, seed: seed >>> 0, rng: seed >>> 0, mode: mode || 1,
      phase: 'map', act: 0, floor: 0, row: 0, pos: null, acts: (mode === 3 ? 3 : 1), hearts: D.MAP.hearts,
      yoyu: HERO.maxYoyu, maxYoyu: HERO.maxYoyu,
      trust: D.PLAYER.trustStart,
      stats: { think: HERO.stats.think, act: HERO.stats.act, relate: HERO.stats.relate },
      deck: D.STARTER.concat(HERO.cards || []), nigate: {}, items: D.SUPPORT_RULES.start.slice(), equip: D.SUPPORT_RULES.start.slice(),
      usedNormals: [], usedEvents: [], trouble: null,
      map: null, battle: null, reward: null, event: null,
      log: [], result: null
    };
    s.map = buildMap(s);
    log(s, { k: 'trust', d: 0, v: s.trust, why: 'start' });
    return s;
  }

  // 分かれ道のマップ：7段×4列。3本の道を下から上へ引き、通ったマスと線を使う。
  // マスの課題は はじめに 決めておく（マップで 名前が 見える）。課題の半分以上は ボスに 関連する課題
  function buildMap(s) {
    var M = D.MAP, act = D.ACTS[s.act], nodes = [], edges = {};
    for (var r = 0; r < M.rows; r++) nodes.push({});
    var starts = shuffle(s, [0, 1, 2, 3]).slice(0, M.paths);
    starts.forEach(function (c0) {
      var c = c0;
      for (var r = 0; r < M.rows; r++) {
        nodes[r][c] = nodes[r][c] || { col: c };
        if (r < M.rows - 1) {
          var opts = [c - 1, c, c + 1].filter(function (x) { return x >= 0 && x < M.cols; });
          var nc = pick(s, opts);
          edges[r + ':' + c + ':' + nc] = 1;
          c = nc;
        }
      }
    });
    var rows = nodes.map(function (o) { return Object.keys(o).map(Number).sort(function (a, b) { return a - b; }).map(function (c) { return o[c]; }); });
    // マスの種類
    rows.forEach(function (row, r) {
      row.forEach(function (n) {
        if (r === 0) n.kind = 'battle';
        else if (r === M.rows - 1) n.kind = 'rest';
        else {
          var x = rand(s);
          n.kind = x < .56 ? 'battle' : x < .78 ? 'event' : x < .86 ? 'rest' : (r >= 2 ? 'elite' : 'battle');
        }
      });
    });
    // 課題を わりあてる（関連する課題を 半分以上）
    var battles = [];
    rows.forEach(function (row) { row.forEach(function (n) { if (n.kind === 'battle') battles.push(n); }); });
    var order = shuffle(s, battles.slice());
    var needRelated = Math.ceil(order.length * M.relatedShare);
    order.forEach(function (n, i) {
      if (i < needRelated) { n.enemy = pick(s, act.related); n.related = true; }
      else if (rand(s) < D.RULES.dangerChance) n.enemy = pick(s, act.dangers);
      else n.enemy = pick(s, act.others);
    });
    rows.forEach(function (row) { row.forEach(function (n) { if (n.kind === 'elite') n.enemy = pick(s, act.elites); }); });
    var edgeList = Object.keys(edges).map(function (k) { var p = k.split(':').map(Number); return { r: p[0], from: p[1], to: p[2] }; });
    rows.push([{ col: 1.5, kind: 'boss', enemy: act.boss }]);
    return { rows: rows, edges: edgeList };
  }

  // いまの段で えらべる マス（前の段から 線で つながっているもの）
  function reachable(s) {
    var row = s.map.rows[s.row];
    if (!row) return [];
    if (s.row === 0 || row[0].kind === 'boss') return row.map(function (n, i) { return i; });
    var from = s.pos;
    return row.map(function (n, i) { return i; }).filter(function (i) {
      return s.map.edges.some(function (e) { return e.r === s.row - 1 && e.from === from && e.to === row[i].col; });
    });
  }

  // --- 条件 ---
  function meetsReq(s, c) {
    if (!c.req) return true;
    for (var k in c.req) {
      if (k === 'trust') { if (s.trust < c.req.trust) return false; }
      else if ((s.stats[k] || 0) < c.req[k]) return false;
    }
    return true;
  }
  function reqShort(s, c) {
    if (!c.req) return null;
    var out = [];
    for (var k in c.req) {
      var have = k === 'trust' ? s.trust : (s.stats[k] || 0);
      if (have < c.req[k]) out.push({ k: k, need: c.req[k] - have });
    }
    return out.length ? out : null;
  }

  function canPlay(s, i) {
    var b = s.battle; if (!b || s.phase !== 'battle') return false;
    var h = b.hand[i]; if (!h) return false;
    var c = card(h.id);
    if (c.unplayable) return false;
    if (c.cost > b.energy) return false;
    return meetsReq(s, c);
  }

  // --- マップ ---
  function chooseNode(s, i) {
    if (s.phase !== 'map') throw new Error('not map');
    if (reachable(s).indexOf(i) < 0) throw new Error('not reachable');
    var n = s.map.rows[s.row][i];
    s.floor++;
    s.pos = n.col;
    s.nodeRelated = !!n.related;
    if (n.kind === 'battle' || n.kind === 'elite' || n.kind === 'boss') { startBattle(s, n.enemy); s.phase = 'intro'; }
    else if (n.kind === 'event') startEvent(s);
    else if (n.kind === 'rest') { s.phase = 'rest'; }
    s.nodeKind = n.kind;
    return s;
  }

  function advance(s) {
    s.row++;
    s.phase = 'map';
    s.battle = null; s.reward = null; s.event = null;
    if (s.trouble) {
      var id = s.trouble; s.trouble = null;
      s.event = { id: id, done: null, interrupt: true };
      s.phase = 'event';
      log(s, { k: 'event', id: id, trouble: true });
    }
    return s;
  }

  // --- 戦い ---
  // ボスは、なくした ハートの数だけ 弱くなる
  function lostHearts(s) { return D.MAP.hearts - s.hearts; }
  function fragile(s) { var H = D.HEROES[s.hero]; return H && H.fragile; }
  // ピンチ（余裕が少ない）の時、回復が 弱まる
  function heal(s, n) {
    var f = fragile(s);
    if (f && s.yoyu < s.maxYoyu * f.pinch) n = Math.ceil(n * f.healMul);
    s.yoyu = Math.min(s.maxYoyu, s.yoyu + n);
  }
  function heroMod(s, E) { var H = D.HEROES[s.hero]; return (H && H.ctxMod && H.ctxMod[E.ctx]) || 1; }
  function bossHp(s, E) {
    var hp = E.hp * D.RULES.hpScale * heroMod(s, E);
    if (E.kind === 'boss') hp *= D.MAP.bossBase * (1 - D.MAP.heartHp * lostHearts(s));
    return Math.round(hp);
  }

  function startBattle(s, eid) {
    var E = D.ENEMIES[eid];
    var en = {
      id: eid, name: E.forms[0], form: 0, hp: bossHp(s, E), maxHp: bossHp(s, E), kind: E.kind, str: 0, mi: 0,
      revealed: false, weak: E.weak.slice(), resist: E.resist.slice(),
      backfire: (E.backfire || []).slice(), stressMul: 1, heroMul: heroMod(s, E), bossMul: E.kind === 'boss' ? 1 - D.MAP.heartStress * lostHearts(s) : 1
    };
    var bench = [], cards = [];
    s.deck.forEach(function (id) { (fits(id, E.ctx) ? cards : bench).push({ id: id }); });
    var draw = shuffle(s, cards);
    s.battle = {
      enemy: en, draw: draw, hand: [], discard: [], exhaust: [], bench: bench,
      energy: 0, guard: 0, turn: 0, calm: false,
      usage: { think: 0, act: 0, relate: 0 }, trustGained: 0, playedOk: {}, msgs: [], usedItems: {}, teacherCard: null
    };
    s.phase = 'battle';
    if (s.stats.think >= D.FORMS.organizeStat) { organize(s, true); }
    if (bench.length) msg(s, 'この場面に 合わないカード ' + bench.length + 'まいは 控えデッキへ。', 'bench');
    log(s, { k: 'battle', enemy: eid, kind: E.kind, bench: bench.length });
    startTurn(s, true);
  }

  // 手札は 5まい＋かしこさ まで。あふれた カードは すて札へ（カッとなる は 消える）
  function handLimit(s) { return D.PLAYER.hand + s.stats.think; }
  function addToHand(s, h) {
    var b = s.battle;
    if (b.hand.length < handLimit(s)) { b.hand.push(h); return true; }
    if (h.id === 'kattonaru' || h.id === 'panic') b.exhaust.push(h); else b.discard.push(h);
    msg(s, '手札が いっぱいで「' + card(h.id).name + '」は すて札へ。', 'bench');
    return false;
  }

  function drawCards(s, n) {
    var b = s.battle;
    for (var i = 0; i < n; i++) {
      if (!b.draw.length) {
        if (!b.discard.length) return;
        b.draw = shuffle(s, b.discard); b.discard = [];
      }
      addToHand(s, b.draw.pop());
    }
  }

  function startTurn(s, first) {
    var b = s.battle;
    b.turn++; b.energy = D.PLAYER.energy; b.guard = 0; b.calm = false;
    if (first && s.slump > 0) {
      for (var sp = 0; sp < fragile(s).slumpPanic; sp++) addToHand(s, { id: 'panic', temp: true });
      s.slump--;
      msg(s, 'この前の ことが 頭から はなれない…（落ちこみ：あと ' + s.slump + '回）', 'worry');
    }
    if (first && s.trust >= D.RULES.allyTrust) {
      b.guard += D.RULES.allyGuard;
      msg(s, '信頼が 高いので、友だちが そばにいてくれる（ゆとり +' + D.RULES.allyGuard + '）', 'ally');
      log(s, { k: 'ally' });
    }
    if (first) {
      D.ENEMIES[b.enemy.id].situ.forEach(function (id) { addToHand(s, { id: id, temp: true }); });
    }
    if (b.frozen) {
      b.hand.forEach(function (h) { if (!h.temp || h.id !== 'panic') b.discard.push(h); });
      b.hand = [{ id: 'ugokenai', temp: true }];
      b.energy = 0;
      msg(s, '心の余裕が なくなって、動けない…（このまま 時間が すぎるのを まつ）', 'stress');
      return;
    }
    var pn = b.hand.filter(function (x) { return x.id === 'panic' && !x.fresh; }).length;
    b.hand.forEach(function (x) { delete x.fresh; });
    if (pn) addToHand(s, { id: 'panic', temp: true });
    drawCards(s, Math.max(0, handLimit(s) - b.hand.length));
    if (s.yoyu < s.maxYoyu * (fragile(s) ? fragile(s).stressThreshold : D.RULES.stressThreshold)) {
      addToHand(s, { id: 'kattonaru', temp: true });
      msg(s, D.TEXT.stressIntrude, 'stress');
      log(s, { k: 'intrude' });
    }
  }

  function msg(s, text, tag) { if (s.battle) s.battle.msgs.push({ text: text, tag: tag || '' }); }

  function addTrust(s, d, why, fromCard) {
    if (d > 0 && fromCard) {
      var room = D.RULES.trustGainCapPerBattle - s.battle.trustGained;
      d = Math.min(d, Math.max(0, room));
      if (d <= 0) return 0;
      s.battle.trustGained += d;
    }
    var before = s.trust;
    s.trust = Math.max(0, Math.min(D.PLAYER.trustMax, s.trust + d));
    var real = s.trust - before;
    if (real !== 0) {
      log(s, { k: 'trust', d: real, v: s.trust, why: why });
      noteUnlocks(s, before, null);
    }
    return real;
  }

  // カードの使用条件が新たに満たされたら記録する
  function noteUnlocks(s, trustBefore, statsBefore) {
    var seen = {};
    s.deck.concat(D.REWARD_POOL).forEach(function (id) {
      if (seen[id]) return; seen[id] = 1;
      var c = card(id); if (!c.req) return;
      var prev = { trust: trustBefore == null ? s.trust : trustBefore, stats: statsBefore || s.stats };
      var was = meetsReqWith(prev, c), now = meetsReq(s, c);
      if (!was && now) log(s, { k: 'unlock', card: id });
    });
  }
  function meetsReqWith(p, c) {
    for (var k in c.req) {
      if (k === 'trust') { if (p.trust < c.req.trust) return false; }
      else if ((p.stats[k] || 0) < c.req[k]) return false;
    }
    return true;
  }

  // 状きょうを整理する：かいぶつ→現実＋オーラ→ふつうの現実。いきおいが弱まる
  function organize(s, fromStat) {
    var b = s.battle, en = b.enemy, E = D.ENEMIES[en.id];
    if (en.form >= 2) return;
    var from = en.name;
    en.form++;
    en.name = E.forms[en.form];
    en.str = Math.floor(en.str / 2);
    en.stressMul = D.FORMS.stressMul[en.form];
    if (en.form === 2) {
      en.revealed = true;
      if (E.view) {
        en.weak = E.view.weak.slice(); en.resist = E.view.resist.slice();
        en.backfire = E.view.backfire.slice(); en.stressMul *= E.view.stressMul;
      }
      log(s, { k: 'reveal', enemy: en.id, from: E.forms[0], to: en.name, truth: E.view ? E.view.truth : 'plain' });
    }
    msg(s, fromStat ? 'かしこさが 高いので、はじめから「' + en.name + '」に 見えている。' : '状きょうが 整理できた：「' + from + '」→「' + en.name + '」（いきおいが 弱まった）', 'reveal');
    log(s, { k: 'form', enemy: en.id, form: en.form, stat: !!fromStat });
  }

  function solveAmount(s, c) {
    var b = s.battle, en = b.enemy, st = statOf(c);
    var n = c.solve + (st ? s.stats[st] : 0);
    var m = 1;
    if (en.weak.indexOf(c.type) >= 0) m *= D.RULES.weak;
    if (en.resist.indexOf(c.type) >= 0) m *= D.RULES.resist;
    if (D.ENEMIES[en.id].anxiety && !b.calm) m *= D.RULES.anxiety;
    return Math.round(n * m);
  }

  // カードの効き方を画面に出すための見積もり（乱数は使わない）
  function preview(s, i) {
    var b = s.battle, h = b.hand[i], c = card(h.id), st = statOf(c), en = b.enemy;
    var p = {};
    if (c.solve) {
      p.solve = solveAmount(s, c);
      p.backfire = en.backfire.indexOf(c.type) >= 0;
    }
    if (c.guard) p.guard = c.guard + (st ? s.stats[st] : 0);
    p.weak = en.weak.indexOf(c.type) >= 0;
    p.resist = en.resist.indexOf(c.type) >= 0;
    return p;
  }

  function playCard(s, i) {
    if (!canPlay(s, i)) throw new Error('cannot play');
    var b = s.battle, h = b.hand.splice(i, 1)[0], c = card(h.id), st = statOf(c), en = b.enemy;
    b.energy -= c.cost;
    if (st) b.usage[st]++;
    if (c.type === 'calm') {
      b.calm = true;
      var pi = b.hand.findIndex(function (x) { return x.id === 'panic'; });
      if (pi >= 0) { b.exhaust.push(b.hand.splice(pi, 1)[0]); msg(s, '落ちついて、パニックが 1つ おさまった。', 'clear'); }
    }

    var ok = c.chance ? rand(s) < D.CHANCE[c.chance].p : true;
    var entry = { k: 'play', card: h.id, enemy: en.id, ok: ok, judge: c.judge, style: c.style, temp: !!h.temp, revealedBefore: en.revealed };

    if (c.trust) addTrust(s, c.trust, h.id, c.trust > 0);
    var tr = D.TROUBLE_OF[h.id];
    if (tr && (!s.trouble || D.TROUBLE_RANK.indexOf(tr) < D.TROUBLE_RANK.indexOf(s.trouble))) s.trouble = tr;

    if (ok) {
      if (c.organize) organize(s);
      if (c.clearMoya) clearMoya(s, true);
      if (c.organize2) { organize(s); organize(s); }
      if (c.formTo2) { while (en.form < 2) organize(s); }
      if (c.energy) { b.energy += c.energy; msg(s, '元気が +' + c.energy + '。', 'next'); }
      if (c.tame && en.str > 0) { en.str = 0; msg(s, 'ギャグで かわして、相手の いきおいが なくなった。', 'clear'); }
      if (c.clearPanicAll) {
        var np = 0;
        b.hand = b.hand.filter(function (x) { if (x.id === 'panic') { b.exhaust.push(x); np++; return false; } return true; });
        if (np) msg(s, 'パニックが ぜんぶ おさまった。', 'clear');
      }
      if (c.distance && !b.distanced) {
        b.distanced = true; en.str = 0; en.stressMul *= D.RULES.distanceMul;
        msg(s, 'きょりを おいた。問題の いきおいが おさまり、ストレスも 弱まった。', 'reveal');
      }
      if (c.solve) {
        var n = solveAmount(s, c);
        var bf = en.backfire.indexOf(c.type) >= 0;
        if (bf) n = Math.round(n * D.RULES.backfireSolve);
        en.hp -= n; entry.solve = n;
        if (bf) {
          en.str += D.RULES.backfireGrow;
          en.regrow = (en.regrow || 0) + Math.ceil(n * D.RULES.backfireRegrow);
          entry.backfire = D.RULES.backfireGrow;
          msg(s, '「' + c.name + '」で その場は おさまった。でも あとで こじれて、問題の いきおい +' + D.RULES.backfireGrow + '。', 'backfire');
        }
      }
      if (c.guard) b.guard += c.guard + (st ? s.stats[st] : 0);
      if (c.heal) heal(s, c.heal);
      if (c.draw) drawCards(s, c.draw);
      if (c.judge === 'impulse' && !entry.backfire) msg(s, '「' + c.name + '」で すっきりした。でも…', 'impulse');
    } else {
      var cause = D.TEXT.failCause[Math.floor(rand(s) * D.TEXT.failCause.length)];
      msg(s, '「' + c.name + '」は うまくいかなかった。' + cause + (st ? '（' + D.STATS[st].name + 'の けいけんには なった）' : ''), 'fail');
      if (c.growFail && st) { b.usage[st]++; msg(s, '失敗も 経験！（' + D.STATS[st].name + 'の けいけんが 2ばい）', 'next'); }
      if (c.guardFail) b.guard += c.guardFail;
      if (c.fail) {
        addToHand(s, { id: c.fail, temp: true });
        msg(s, '次の手：「' + card(c.fail).name + '」が 手札に 入った。', 'next');
        entry.next = c.fail;
      }
    }
    if (c.curse) {
      s.deck.push('moyamoya'); b.discard.push({ id: 'moyamoya' });
      msg(s, D.TEXT.curseGained, 'curse');
      log(s, { k: 'curse', why: h.id });
    }
    if (ok && h.temp && c.judge === 'good') b.playedOk[h.id] = 1;
    log(s, entry);

    if (h.temp || c.exhaust) b.exhaust.push(h); else b.discard.push(h);
    if (ok && c.escape) { escapeBattle(s); return s; }
    if (en.hp <= 0) winBattle(s);
    return s;
  }

  // 苦手意識：その場面では ストレスが ふえる
  function stressOf(s, mv) {
    var en = s.battle.enemy, ctx = D.ENEMIES[en.id].ctx;
    var ng = (s.nigate[ctx] || 0) * D.RULES.nigateStress;
    return Math.round((mv.n * D.RULES.stressScale + en.str + ng) * en.stressMul * (en.bossMul || 1) * (en.heroMul || 1));
  }
  // 心の余裕は0より下がらない。下がった分は「動けない」中の つらさとして数える
  function hurt(s, dmg) {
    var b = s.battle;
    if (b) b.taken = (b.taken || 0) + dmg;
    if (dmg > s.yoyu) {
      if (b) b.deficit = (b.deficit || 0) + (dmg - s.yoyu);
      s.yoyu = 0;
    } else s.yoyu -= dmg;
    if (s.yoyu <= 0 && b && !b.frozen) {
      b.frozen = true; b.frozenLeft = D.RULES.frozenTurns;
      log(s, { k: 'frozen', enemy: b.enemy.id });
    }
  }

  function enemyAct(s) {
    var b = s.battle, en = b.enemy, E = D.ENEMIES[en.id];
    if (en.regrow && en.hp > 0) {
      en.hp = Math.min(en.maxHp, en.hp + en.regrow);
      msg(s, 'こじれて、問題が また ' + en.regrow + ' 大きくなった。', 'backfire');
      en.regrow = 0;
    }
    var mv = E.moves[en.mi % E.moves.length];
    en.mi++;
    if (mv.t === 'stress') {
      var n = stressOf(s, mv);
      var blocked = Math.min(b.guard, n);
      var dmg = n - blocked;
      hurt(s, dmg);
      msg(s, mv.say + '（心の余裕 −' + dmg + (blocked ? '、ゆとりで ' + blocked + ' うけとめた' : '') + '）', 'hit');
    } else if (mv.t === 'grow') {
      en.str += mv.n;
      msg(s, mv.say + '（問題の いきおい +' + mv.n + '）', 'grow');
    } else if (mv.t === 'inject') {
      addToHand(s, { id: mv.card, temp: true, fresh: true });
      msg(s, mv.say, 'inject');
      b.msgs[b.msgs.length - 1].card = card(mv.card).name;
    } else if (mv.t === 'worry') {
      b.discard.push({ id: 'moyamoya', temp: true });
      msg(s, mv.say + '（この戦いの間 モヤモヤが まざる）', 'worry');
    }
  }

  // 次に起きそうなこと（意図の表示）
  function intent(s) {
    var b = s.battle, en = b.enemy, E = D.ENEMIES[en.id];
    var mv = E.moves[en.mi % E.moves.length];
    var o = { t: mv.t, say: mv.say };
    if (mv.t === 'stress') o.n = stressOf(s, mv);
    if (mv.t === 'grow') o.n = mv.n;
    if (E.pass) o.passIn = E.pass.turns - b.turn + 1;
    return o;
  }

  function endTurn(s) {
    if (s.phase !== 'battle') throw new Error('not battle');
    var b = s.battle;
    b.msgs = [];
    var moya = 0, keep = [], panics = 0;
    b.hand.forEach(function (h) {
      if (h.id === 'moyamoya') moya++;
      if (h.id === 'panic' && fragile(s)) panics++;
      if (card(h.id).retain) { keep.push(h); return; }
      if (h.id === 'kattonaru') b.exhaust.push(h); else b.discard.push(h);
    });
    b.hand = keep;
    if (panics) {
      hurt(s, panics * fragile(s).panicDrain);
      msg(s, 'パニックで 心の余裕 −' + panics * fragile(s).panicDrain, 'worry');
    }
    if (moya) {
      var md = moya * D.RULES.moyaDrain * (fragile(s) ? fragile(s).moyaMul : 1);
      hurt(s, md);
      msg(s, 'モヤモヤが 気になって 心の余裕 −' + md, 'curse');
    }
    var wasFrozen = b.frozen;
    enemyAct(s);
    if (wasFrozen) {
      b.frozenLeft--;
      if (b.frozenLeft <= 0) { endFrozen(s); return s; }
    }
    var ps = D.ENEMIES[b.enemy.id].pass;
    if (ps && b.turn >= ps.turns) { if (b.frozen) endFrozen(s); else winBattle(s, true); return s; }
    startTurn(s, false);
    return s;
  }

  // 動けないまま 時間が すぎた：苦手意識が つき、心の余裕は 1割まで もどる
  function endFrozen(s) {
    var b = s.battle, en = b.enemy, E = D.ENEMIES[en.id];
    var lv = Math.max(1, Math.ceil((b.deficit || 0) / D.RULES.nigatePer)) * (fragile(s) ? fragile(s).nigateMul : 1);
    s.nigate[E.ctx] = (s.nigate[E.ctx] || 0) + lv;
    s.yoyu = Math.max(1, Math.round(s.maxYoyu * (fragile(s) ? fragile(s).frozenRecover : D.RULES.frozenRecover)));
    log(s, { k: 'nigate', ctx: E.ctx, add: lv, to: s.nigate[E.ctx], enemy: en.id });
    if (fragile(s)) { s.slump = fragile(s).slumpBattles; log(s, { k: 'slump' }); }
    log(s, { k: 'win', enemy: en.id, other: E.other, revealed: en.revealed, frozen: true });
    if (en.kind === 'boss') { endRun(s, false); return; }
    s.phase = 'reward';
    s.reward = { choices: [], other: E.other, support: null, frozen: { ctx: E.ctx, add: lv, to: s.nigate[E.ctx] } };
  }

  // にげる：あぶない場面なら 正解（ふつうに 乗りこえた あつかい）。ふつうの課題では 問題が のこる
  function escapeBattle(s) {
    var b = s.battle, en = b.enemy, E = D.ENEMIES[en.id];
    log(s, { k: 'escape', enemy: en.id, ok: !!E.escapeOk });
    if (E.escapeOk) {
      addTrust(s, 1, 'escape', false);
      winBattle(s, false, true);
      return;
    }
    s.deck.push('moyamoya'); log(s, { k: 'curse', why: 'flee:' + en.id });
    log(s, { k: 'win', enemy: en.id, other: E.other, revealed: en.revealed, fled: true });
    if (en.kind === 'boss') { endRun(s, false); return; }
    s.phase = 'reward';
    s.reward = { choices: [], other: E.other, support: null, fled: true };
  }

  function winBattle(s, passed, escaped) {
    var b = s.battle, en = b.enemy, E = D.ENEMIES[en.id];
    log(s, { k: 'win', enemy: en.id, other: E.other, revealed: en.revealed, passed: !!passed, escaped: !!escaped, turns: b.turn, taken: b.taken || 0 });
    if (passed && E.pass.leave) { s.deck.push('moyamoya'); log(s, { k: 'curse', why: 'pass:' + en.id }); }
    var statsBefore = { think: s.stats.think, act: s.stats.act, relate: s.stats.relate };
    Object.keys(D.STATS).forEach(function (st) {
      if (b.usage[st] >= D.RULES.growthUses && s.stats[st] < D.PLAYER.statMax) {
        s.stats[st]++;
        log(s, { k: 'grow', stat: st, to: s.stats[st], uses: b.usage[st], why: 'use' });
      }
    });
    if (en.kind === 'elite') {
      var top = Object.keys(D.STATS).sort(function (a, c) { return b.usage[c] - b.usage[a]; })[0];
      if (b.usage[top] > 0 && s.stats[top] < D.PLAYER.statMax) {
        s.stats[top]++;
        log(s, { k: 'grow', stat: top, to: s.stats[top], uses: b.usage[top], why: 'elite' });
      }
    }
    noteUnlocks(s, s.trust, statsBefore);
    if (s.nodeRelated && !passed && s.hearts > 0) {
      s.hearts--;
      log(s, { k: 'heart', left: s.hearts, enemy: en.id });
    }
    if (en.kind === 'boss') { bossDown(s); return; }
    s.phase = 'reward';
    if (passed) {
      s.reward = { choices: [], other: E.other, support: null, passed: E.pass.say, leave: !!E.pass.leave };
      return;
    }
    var sup = null;
    var unowned = Object.keys(D.SUPPORTS).filter(function (k) { return s.items.indexOf(k) < 0; });
    if (unowned.length && (en.kind === 'elite' || rand(s) < D.SUPPORT_RULES.rewardChance)) sup = pick(s, unowned);
    s.reward = { choices: rewardChoices(s), other: E.other, support: sup, escaped: !!escaped };
  }

  // 報酬：その課題の 場面で 使える カードだけを 出す。レアは 条件を 満たし、運が よい時だけ（大きなかべは 出やすい）
  function rewardChoices(s) {
    var b = s.battle, ctx = D.ENEMIES[b.enemy.id].ctx;
    var want = s.trust >= D.RULES.highTrust ? D.RULES.rewardChoicesHighTrust : D.RULES.rewardChoices;
    var situ = shuffle(s, Object.keys(b.playedOk)).slice(0, 2);
    if (b.teacherCard && situ.indexOf(b.teacherCard) < 0) situ = [b.teacherCard].concat(situ).slice(0, 2);
    var pool = shuffle(s, D.REWARD_POOL.filter(function (id) { return situ.indexOf(id) < 0 && fits(id, ctx); }));
    var out = situ.concat(pool).slice(0, want);
    var chance = (b.enemy.kind === 'elite' ? D.RULES.rareChanceElite : D.RULES.rareChance)[s.act] || 0;
    var adv = shuffle(s, D.ADVANCED.filter(function (id) { var c = card(id); return !c.signature && meetsReq(s, c) && s.deck.indexOf(id) < 0 && fits(id, ctx); }));
    if (adv.length && rand(s) < chance) { if (out.length >= want) out[out.length - 1] = adv[0]; else out.push(adv[0]); }
    return out;
  }

  function gainSupport(s, id, why) {
    if (s.items.indexOf(id) >= 0) return false;
    s.items.push(id);
    if (s.equip.length < D.SUPPORT_RULES.slots) s.equip.push(id);
    log(s, { k: 'support', id: id, why: why });
    return true;
  }

  function takeSupport(s) {
    if (s.phase !== 'reward' || !s.reward.support) throw new Error('no support');
    gainSupport(s, s.reward.support, 'reward'); s.reward.support = null;
    return s;
  }

  function canUseSupport(s, id) {
    return s.phase === 'battle' && s.equip.indexOf(id) >= 0 && !s.battle.usedItems[id];
  }

  function useSupport(s, id) {
    if (!canUseSupport(s, id)) throw new Error('cannot use item');
    var u = D.SUPPORTS[id], b = s.battle, en = b.enemy, E = D.ENEMIES[en.id];
    b.usedItems[id] = 1;
    msg(s, '「' + u.name + '」', 'ally');
    if (u.heal) heal(s, u.heal);
    if (id === 'teacher') {
      var tc = D.TEACHER_CARDS[E.ctx];
      addToHand(s, { id: tc, temp: true }); b.teacherCard = tc;
      msg(s, '先生の すすめ：「' + card(tc).name + '」が 手札に 入った。', 'next');
      organize(s);
    }
    if (id === 'friend') {
      var fc = rand(s) < D.SUPPORT_RULES.junkChance ? 'junk_advice' : pick(s, D.FRIEND_CARDS);
      s.deck.push(fc); addToHand(s, { id: fc });
      log(s, { k: 'gain', card: fc, why: 'friend' });
      msg(s, '友だちの アドバイス：「' + card(fc).name + '」' + (fc === 'junk_advice' ? '（あまり 役に立たなかった…）' : ''), fc === 'junk_advice' ? 'fail' : 'next');
    }
    if (u.clearMoya) clearMoya(s, false);
    if (u.purgeMoya) purgeOne(s);
    log(s, { k: 'useSupport', id: id, enemy: en.id });
    return s;
  }

  // 手札の モヤモヤを すてる（purge なら 1まい デッキからも けす）
  function clearMoya(s, purge) {
    var b = s.battle, n = 0;
    b.hand = b.hand.filter(function (h) { if (h.id === 'moyamoya') { b.discard.push(h); n++; return false; } return true; });
    if (n) msg(s, 'モヤモヤが ' + n + 'まい 気にならなくなった。', 'clear');
    if (purge) purgeOne(s);
  }
  function purgeOne(s) {
    var i = s.deck.indexOf('moyamoya');
    if (i < 0) return;
    s.deck.splice(i, 1);
    var b = s.battle;
    var piles = [b.discard, b.draw, b.hand];
    for (var p = 0; p < piles.length; p++) {
      var j = piles[p].findIndex(function (h) { return h.id === 'moyamoya' && !h.temp; });
      if (j >= 0) { piles[p].splice(j, 1); break; }
    }
    msg(s, 'モヤモヤを 1まい デッキから けした。', 'clear');
    log(s, { k: 'purge' });
  }

  // ひと休みで、つけるアイテムを えらび直す
  function setEquip(s, ids) {
    if (s.phase !== 'rest') throw new Error('not rest');
    if (ids.length > D.SUPPORT_RULES.slots) throw new Error('too many');
    ids.forEach(function (id) { if (s.items.indexOf(id) < 0) throw new Error('not owned'); });
    s.equip = ids.slice();
    return s;
  }

  function pickReward(s, id) {
    if (s.phase !== 'reward') throw new Error('not reward');
    if (id) {
      if (s.reward.choices.indexOf(id) < 0) throw new Error('bad reward');
      s.deck.push(id);
      log(s, { k: 'gain', card: id, why: 'reward' });
    } else log(s, { k: 'skip' });
    return advance(s);
  }

  // --- ひと休み ---
  function rest(s, choice, deckIdx) {
    if (s.phase !== 'rest') throw new Error('not rest');
    if (choice === 'rest') {
      var before = s.yoyu;
      s.deck.push('consult_family'); log(s, { k: 'gain', card: 'consult_family', why: 'rest' });
      heal(s, Math.round(s.maxYoyu * D.RULES.restHeal));
      log(s, { k: 'rest', d: s.yoyu - before });
    } else if (choice === 'remove') {
      var id = s.deck[deckIdx];
      if (!id) throw new Error('bad card');
      s.deck.splice(deckIdx, 1);
      log(s, { k: 'remove', card: id });
    } else throw new Error('bad choice');
    return advance(s);
  }

  // --- できごと ---
  function startEvent(s) {
    var act = D.ACTS[s.act];
    var id;
    if (s.trust <= D.RULES.lowTrust && s.usedEvents.indexOf('second_chance') < 0) id = 'second_chance';
    else {
      var pool = act.events.filter(function (e) { return s.usedEvents.indexOf(e) < 0; });
      id = pick(s, pool.length ? pool : act.events);
    }
    s.usedEvents.push(id);
    s.event = { id: id, done: null };
    s.phase = 'event';
    log(s, { k: 'event', id: id });
  }

  function optionOpen(s, o) {
    if (!o.req) return true;
    if (o.req.trust != null && s.trust < o.req.trust) return false;
    return true;
  }

  function chooseEvent(s, i) {
    if (s.phase !== 'event' || s.event.done) throw new Error('not event');
    var o = D.EVENTS[s.event.id].options[i];
    if (!o || !optionOpen(s, o)) throw new Error('bad option');
    var e = o.effects;
    if (e.trust) addTrust(s, e.trust, 'event:' + s.event.id, false);
    if (e.yoyu) s.yoyu = Math.max(1, Math.min(s.maxYoyu, s.yoyu + e.yoyu));
    if (e.addCard) { s.deck.push(e.addCard); log(s, { k: 'gain', card: e.addCard, why: 'event' }); }
    if (e.support) gainSupport(s, e.support, 'event');
    if (e.curse) { s.deck.push('moyamoya'); log(s, { k: 'curse', why: 'event:' + s.event.id }); }
    s.event.done = i;
    log(s, { k: 'choice', id: s.event.id, i: i });
    return s;
  }
  function leaveEvent(s) {
    if (s.phase !== 'event' || s.event.done == null) throw new Error('event not done');
    if (s.event.interrupt) { s.phase = 'map'; s.event = null; return s; }
    return advance(s);
  }

  // ボスを たおした：次の層へ。さいごの層なら おわり
  function bossDown(s) {
    if (s.act < s.acts - 1) {
      s.act++; s.row = 0; s.pos = null; s.hearts = D.MAP.hearts;
      s.yoyu = s.maxYoyu;
      s.map = buildMap(s);
      s.phase = 'actclear';
      s.battle = null;
      log(s, { k: 'act', act: s.act });
      return;
    }
    endRun(s, true);
  }
  // 状きょうの 説明を 読んでから 戦いに 入る
  function beginBattle(s) {
    if (s.phase !== 'intro') throw new Error('not intro');
    s.phase = 'battle';
    return s;
  }
  function nextAct(s) {
    if (s.phase !== 'actclear') throw new Error('not actclear');
    s.phase = 'map';
    return s;
  }

  function endRun(s, won) {
    s.phase = 'end';
    s.result = { won: won, floor: s.floor };
    log(s, { k: 'end', won: won });
  }

  // --- 不変条件（検査用） ---
  function checkInvariants(s) {
    var errs = [];
    if (s.yoyu < 0 || s.yoyu > s.maxYoyu) errs.push('yoyu range');
    if (s.trust < 0 || s.trust > D.PLAYER.trustMax) errs.push('trust range');
    Object.keys(s.stats).forEach(function (k) { if (s.stats[k] < 0 || s.stats[k] > D.PLAYER.statMax) errs.push('stat range ' + k); });
    if (s.battle && s.phase === 'battle') {
      var b = s.battle;
      var piles = b.draw.concat(b.hand, b.discard, b.exhaust, b.bench).filter(function (h) { return !h.temp; });
      var exhaustedPerm = b.exhaust.filter(function (h) { return !h.temp; }).length;
      if (piles.length !== s.deck.length) errs.push('card count ' + piles.length + '!=' + s.deck.length + ' (exhaust ' + exhaustedPerm + ')');
    }
    return errs;
  }

  // --- 振り返り ---
  function summary(s) {
    var L = s.log;
    var plays = L.filter(function (e) { return e.k === 'play'; });
    var grid = { goodOk: [], goodNg: [], impOk: [], impNg: [] };
    plays.forEach(function (p) {
      if (p.judge === 'good') (p.ok ? grid.goodOk : grid.goodNg).push(p);
      else if (p.judge === 'impulse') (p.ok ? grid.impOk : grid.impNg).push(p);
    });
    var trustLine = L.filter(function (e) { return e.k === 'trust'; });
    var recovered = [];
    var dipped = false;
    trustLine.forEach(function (e) { if (e.d < 0) dipped = true; else if (e.d > 0 && dipped) { recovered.push(e); dipped = false; } });
    var grows = L.filter(function (e) { return e.k === 'grow'; }).map(function (g) {
      var used = {};
      plays.filter(function (p) { return p.floor === g.floor && statOf(card(p.card)) === g.stat; })
        .forEach(function (p) { used[p.card] = (used[p.card] || 0) + 1; });
      return { stat: g.stat, to: g.to, uses: g.uses, why: g.why, cards: used };
    });
    var seen = {};
    var discovered = [];
    plays.forEach(function (p) { if (p.temp && !seen[p.card] && p.judge === 'good') { seen[p.card] = 1; discovered.push({ card: p.card, enemy: p.enemy }); } });
    return {
      won: s.result && s.result.won, floor: s.floor,
      stats: s.stats, trust: s.trust, trustStart: D.PLAYER.trustStart,
      trustLine: trustLine, recovered: recovered,
      grows: grows,
      unlocks: L.filter(function (e) { return e.k === 'unlock'; }).map(function (e) { return e.card; }),
      gained: L.filter(function (e) { return e.k === 'gain'; }),
      removed: L.filter(function (e) { return e.k === 'remove'; }),
      discovered: discovered,
      reveals: L.filter(function (e) { return e.k === 'reveal'; }),
      supportUses: L.filter(function (e) { return e.k === 'useSupport'; }),
      escapes: L.filter(function (e) { return e.k === 'escape'; }),
      nigate: L.filter(function (e) { return e.k === 'nigate'; }),
      others: L.filter(function (e) { return e.k === 'win'; }),
      grid: grid,
      goodCount: plays.filter(function (p) { return p.judge === 'good'; }).length,
      impulseCount: plays.filter(function (p) { return p.judge === 'impulse'; }).length
    };
  }

  var API = {
    ENGINE_VER: ENGINE_VER, newRun: newRun, chooseNode: chooseNode, playCard: playCard, endTurn: endTurn, useSupport: useSupport, reachable: reachable, beginBattle: beginBattle, handLimit: handLimit, nextAct: nextAct, canUseSupport: canUseSupport, setEquip: setEquip, takeSupport: takeSupport,
    pickReward: pickReward, rest: rest, chooseEvent: chooseEvent, leaveEvent: leaveEvent,
    canPlay: canPlay, meetsReq: meetsReq, reqShort: reqShort, preview: preview, intent: intent,
    optionOpen: optionOpen, summary: summary, checkInvariants: checkInvariants, card: card, fits: fits, data: D
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.SST_ENGINE = API;
})(this);
