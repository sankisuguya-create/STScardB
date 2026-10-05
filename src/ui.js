// 画面。状態は engine が持ち、ここは描画と操作の受け渡しだけをする。
(function (root) {
  'use strict';
  var E = root.SST_ENGINE, D = E.data, P = root.SST_PLATFORM;
  var S = null;          // ゲームの状態
  var sel = -1;          // 選んでいる手札
  var removing = false;  // ひと休みで手放すカードを選んでいる
  var debriefPage = 0;
  var app;

  function h(tag, attrs, kids) {
    var el = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      if (k === 'class') el.className = attrs[k];
      else if (k === 'text') el.textContent = attrs[k];
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] != null && attrs[k] !== false) el.setAttribute(k, attrs[k]);
    }
    (kids || []).forEach(function (c) { if (c != null) el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return el;
  }

  function save() { if (S && S.phase !== 'battle') P.save(S); }

  function act(fn) {
    try { fn(); } catch (e) { console.error(e); }
    sel = -1;
    save();
    render();
  }

  // --- 上の帯 ---
  function topBar() {
    var pct = Math.round(S.yoyu / S.maxYoyu * 100);
    var low = S.yoyu < S.maxYoyu * D.RULES.stressThreshold;
    return h('header', { class: 'top' }, [
      h('div', { class: 'meter' + (low ? ' low' : '') }, [
        h('span', { class: 'lbl', text: '心の余裕' }),
        h('div', { class: 'bar' }, [h('div', { class: 'fill', style: 'width:' + pct + '%' })]),
        h('b', { text: S.yoyu + '/' + S.maxYoyu })
      ]),
      h('div', { class: 'chip trust', title: '信頼' }, [h('span', { class: 'lbl', text: '信頼' }), h('b', { text: String(S.trust) })]),
      h('div', { class: 'stats' }, Object.keys(D.STATS).map(function (k) {
        return h('div', { class: 'chip st-' + k }, [h('span', { class: 'lbl', text: D.STATS[k].name }), h('b', { text: String(S.stats[k]) })]);
      })),
      h('div', { class: 'floor', text: (S.row + 1) + ' / ' + S.map.length + ' だん' })
    ]);
  }

  var selSup = -1;
  function supportsRow(inBattle) {
    var slots = [];
    for (var i = 0; i < D.SUPPORT_RULES.slots; i++) {
      (function (i) {
        var id = S.supports[i];
        if (!id) { slots.push(h('div', { class: 'sup empty', text: 'あき' })); return; }
        var u = D.SUPPORTS[id];
        slots.push(h('button', {
          class: 'sup' + (selSup === i ? ' selected' : ''), disabled: !inBattle,
          onclick: function () {
            if (selSup === i) { selSup = -1; act(function () { E.useSupport(S, i); }); }
            else { selSup = i; sel = -1; render(); }
          }
        }, [h('b', { text: u.name }), selSup === i ? h('small', { text: u.note + '（もう一度 タップで 使う）' }) : null]));
      })(i);
    }
    return h('div', { class: 'sups' }, [h('span', { class: 'lbl', text: '支え' })].concat(slots));
  }

  // --- タイトル ---
  function titleScreen(saved) {
    app.replaceChildren(h('main', { class: 'title' }, [
      h('h1', { text: D.TEXT.title }),
      h('p', { class: 'sub', text: '毎日の「こまった」に、どの手で こたえる？' }),
      saved ? h('button', { class: 'primary big', onclick: function () { S = saved; render(); }, text: 'つづきから' }) : null,
      h('button', { class: saved ? 'secondary big' : 'primary big', onclick: start, text: saved ? 'はじめから' : 'はじめる' })
    ]));
  }
  function start() {
    var mode = Number(P.param('mode')) || 1;
    S = E.newRun((Date.now() ^ (Math.random() * 1e9)) >>> 0, mode);
    debriefPage = 0;
    save(); render();
  }

  var NODE = {
    battle: { label: '課題', cls: 'n-battle' }, elite: { label: '大きなかべ', cls: 'n-elite' },
    event: { label: 'できごと', cls: 'n-event' }, rest: { label: 'ひと休み', cls: 'n-rest' }, boss: { label: 'ボス', cls: 'n-boss' }
  };

  // --- マップ ---
  function mapScreen() {
    var rows = S.map.map(function (row, r) {
      return h('div', { class: 'maprow' + (r === S.row ? ' now' : r < S.row ? ' past' : '') }, [
        h('span', { class: 'rownum', text: r === S.map.length - 1 ? 'さいご' : (r + 1) + 'だん目' })
      ].concat(row.map(function (k, c) {
        var n = NODE[k];
        return h('button', {
          class: 'node ' + n.cls, disabled: r !== S.row,
          onclick: function () { act(function () { E.chooseNode(S, c); }); }
        }, [n.label]);
      })));
    }).reverse();
    var notice = S.notice; S.notice = null;
    return h('main', { class: 'map' }, [notice ? h('p', { class: 'praise', text: notice }) : null, supportsRow(false), h('p', { class: 'hint', text: '次に 行くところを えらぼう' })].concat(rows));
  }

  // --- 戦い ---
  function cardView(c, opts) {
    opts = opts || {};
    var effects = [];
    var p = opts.preview || {};
    if (c.solve) effects.push(h('span', { class: 'fx solve' }, ['解決 ' + (p.solve != null ? p.solve : c.solve)]));
    if (c.guard) effects.push(h('span', { class: 'fx guard' }, ['ゆとり ' + (p.guard != null ? p.guard : c.guard)]));
    if (c.heal) effects.push(h('span', { class: 'fx heal' }, ['余裕 +' + c.heal]));
    if (c.draw) effects.push(h('span', { class: 'fx' }, ['1まい 引く']));
    if (c.reveal) effects.push(h('span', { class: 'fx reveal' }, ['見方を 変える']));
    if (c.trust > 0) effects.push(h('span', { class: 'fx trust' }, ['信頼 +' + c.trust]));
    if (c.trust < 0) effects.push(h('span', { class: 'fx bad' }, ['信頼 ' + c.trust]));
    if (c.curse) effects.push(h('span', { class: 'fx bad' }, ['モヤモヤが 入る']));
    var tags = [];
    if (p.weak) tags.push(h('span', { class: 'tag good', text: 'よく効く' }));
    if (p.resist) tags.push(h('span', { class: 'tag', text: '効きにくい' }));
    if (p.backfire) tags.push(h('span', { class: 'tag bad', text: 'あとで こじれる' }));
    var lock = opts.lock;
    return h('div', { class: 'card t-' + c.type + (opts.selected ? ' selected' : '') + (opts.disabled ? ' off' : '') + (opts.temp ? ' temp' : '') }, [
      h('div', { class: 'cost', text: c.unplayable ? '-' : String(c.cost) }),
      h('div', { class: 'ctype', text: D.TYPE_LABEL[c.type] + (opts.temp ? '・この場' : '') }),
      h('div', { class: 'cname', text: c.name }),
      h('div', { class: 'cline', text: c.line }),
      h('div', { class: 'fxs' }, effects),
      c.chance ? h('div', { class: 'chance c-' + c.chance, text: D.CHANCE[c.chance].label }) : null,
      tags.length ? h('div', { class: 'tags' }, tags) : null,
      lock ? h('div', { class: 'lock', text: lock }) : null,
      c.ctx && opts.showCtx ? h('div', { class: 'ctx', text: '使える場面：' + c.ctx.map(function (k) { return D.CTX_LABEL[k]; }).join('・') }) : null
    ]);
  }

  function lockText(c) {
    var short = E.reqShort(S, c);
    if (!short) return null;
    return 'あと ' + short.map(function (x) { return (x.k === 'trust' ? '信頼' : D.STATS[x.k].name) + x.need; }).join('・');
  }

  function battleScreen() {
    var b = S.battle, en = b.enemy, it = E.intent(S);
    var itText = it.t === 'stress' ? '心の余裕 −' + it.n : it.t === 'grow' ? '問題の いきおい +' + it.n : 'モヤモヤが まざる';
    var hpPct = Math.max(0, Math.round(en.hp / en.maxHp * 100));
    var enemy = h('section', { class: 'enemy k-' + en.kind }, [
      h('div', { class: 'ekind', text: en.kind === 'boss' ? 'ボス' : en.kind === 'elite' ? '大きなかべ' : '課題' }),
      h('h2', { class: 'ename' + (en.revealed ? '' : ' unsure'), text: en.name }),
      !en.revealed ? h('div', { class: 'unsure-note', text: 'ほんとうに そう？（「見方を 変える」カードで たしかめられる）' }) : null,
      h('div', { class: 'meter hp' }, [
        h('span', { class: 'lbl', text: '問題の大きさ' }),
        h('div', { class: 'bar' }, [h('div', { class: 'fill', style: 'width:' + hpPct + '%' })]),
        h('b', { text: Math.max(0, en.hp) + '/' + en.maxHp })
      ]),
      h('div', { class: 'intent' }, [h('span', { class: 'lbl', text: 'つぎに 起きそうなこと' }), h('b', { text: it.say + '（' + itText + '）' })]),
      D.ENEMIES[en.id].anxiety ? h('div', { class: 'note', text: 'どきどきして 力が 出にくい。整えるカードを 使うと、そのターンは ふつうに 効く。' + (b.calm ? '（いま 整っている）' : '') }) : null
    ]);
    var me = h('section', { class: 'me' }, [
      h('div', { class: 'chip energy' }, [h('span', { class: 'lbl', text: '元気' }), h('b', { text: b.energy + '/' + D.PLAYER.energy })]),
      h('div', { class: 'chip guard' }, [h('span', { class: 'lbl', text: 'ゆとり' }), h('b', { text: String(b.guard) })]),
      h('div', { class: 'piles', text: '山札 ' + b.draw.length + '・すて札 ' + b.discard.length })
    ]);
    var msgs = h('section', { class: 'msgs', 'aria-live': 'polite' }, b.msgs.slice(-4).map(function (m) { return h('p', { class: 'm-' + m.tag, text: m.text }); }));
    var hand = h('section', { class: 'hand' }, b.hand.map(function (hc, i) {
      var c = E.card(hc.id), ok = E.canPlay(S, i);
      var el = cardView(c, { preview: c.unplayable ? {} : E.preview(S, i), selected: sel === i, disabled: !ok, temp: hc.temp, lock: lockText(c) });
      el.addEventListener('click', function () {
        selSup = -1;
        if (!ok) { sel = i; render(); return; }
        if (sel === i) act(function () { E.playCard(S, i); });
        else { sel = i; render(); }
      });
      return el;
    }));
    var help = h('p', { class: 'hint', text: sel >= 0 && E.canPlay(S, sel) ? 'もう一度 タップで 使う' : sel >= 0 ? (E.card(b.hand[sel].id).unplayable ? 'モヤモヤは 使えない' : '元気が たりない／条件が たりない') : 'カードを タップして えらぶ' });
    var end = h('button', { class: 'primary endturn', onclick: function () { act(function () { E.endTurn(S); }); }, text: 'ターンを おわる' });
    return h('main', { class: 'battle' }, [enemy, msgs, h('div', { class: 'row' }, [me, supportsRow(true), help, end]), hand]);
  }

  // --- 報酬 ---
  function rewardScreen() {
    var r = S.reward;
    return h('main', { class: 'reward' }, [
      h('h2', { text: '乗りこえた！' }),
      h('p', { class: 'other', text: r.other }),
      r.support ? h('div', { class: 'supoffer' }, [
        h('b', { text: '支えが 見つかった：「' + D.SUPPORTS[r.support].name + '」' }),
        h('small', { text: D.SUPPORTS[r.support].note }),
        S.supports.length < D.SUPPORT_RULES.slots
          ? h('button', { class: 'secondary', onclick: function () { act(function () { E.takeSupport(S); }); }, text: '受け取る' })
          : h('small', { text: '支えが いっぱいで 持てない（' + D.SUPPORT_RULES.slots + 'つまで）' })
      ]) : null,
      h('p', { class: 'hint', text: 'これから 使える 選択肢を 1つ えらぼう' }),
      h('div', { class: 'choices' }, r.choices.map(function (id) {
        var el = cardView(E.card(id), { lock: lockText(E.card(id)), showCtx: true });
        el.addEventListener('click', function () { act(function () { E.pickReward(S, id); }); });
        return el;
      })),
      h('button', { class: 'secondary', onclick: function () { act(function () { E.pickReward(S, null); }); }, text: '今回は えらばない' })
    ]);
  }

  // --- ひと休み ---
  function restScreen() {
    if (removing) {
      return h('main', { class: 'rest' }, [
        h('h2', { text: '手放す（卒業する）カードを えらぶ' }),
        h('div', { class: 'choices small' }, S.deck.map(function (id, i) {
          var el = cardView(E.card(id), { showCtx: true });
          el.addEventListener('click', function () { removing = false; act(function () { E.rest(S, 'remove', i); }); });
          return el;
        })),
        h('button', { class: 'secondary', onclick: function () { removing = false; render(); }, text: 'もどる' })
      ]);
    }
    return h('main', { class: 'rest' }, [
      h('h2', { text: 'ひと休み' }),
      h('div', { class: 'two' }, [
        h('button', { class: 'primary big', onclick: function () { act(function () { E.rest(S, 'rest'); }); } }, ['休む', h('small', { text: '心の余裕を ' + Math.round(S.maxYoyu * D.RULES.restHeal) + ' 回ふく' })]),
        h('button', { class: 'secondary big', onclick: function () { removing = true; render(); } }, ['手放す', h('small', { text: 'いらない くせを 1つ 卒業する' })])
      ])
    ]);
  }

  // --- できごと ---
  function eventScreen() {
    var ev = D.EVENTS[S.event.id], done = S.event.done;
    return h('main', { class: 'event' }, [
      h('h2', { text: ev.title }),
      h('p', { class: 'story', text: ev.text }),
      done == null
        ? h('div', { class: 'opts' }, ev.options.map(function (o, i) {
          var open = E.optionOpen(S, o);
          return h('button', { class: 'opt', disabled: !open, onclick: function () { act(function () { E.chooseEvent(S, i); }); } },
            [o.label, !open ? h('small', { text: '（信頼が ' + o.req.trust + ' 以上で えらべる）' }) : null]);
        }))
        : h('div', {}, [
          h('p', { class: 'result', text: ev.options[done].result }),
          h('button', { class: 'primary', onclick: function () { act(function () { E.leaveEvent(S); }); }, text: '次へ' })
        ])
    ]);
  }

  // --- 振り返り ---
  function cardName(id) { var n = E.card(id).name; return n.charAt(0) === '「' ? n : '「' + n + '」'; }
  function whyText(why) {
    if (why === 'start') return 'スタート';
    if (why.indexOf('event:') === 0) return 'できごと「' + D.EVENTS[why.slice(6)].title + '」で えらんだこと';
    return cardName(why) + 'を 使った';
  }

  function trustChart(line) {
    var W = 520, H = 120, pad = 16, n = line.length;
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); svg.setAttribute('class', 'trustchart');
    var pts = line.map(function (e, i) {
      var x = pad + (n > 1 ? i * (W - 2 * pad) / (n - 1) : 0);
      var y = H - pad - e.v / D.PLAYER.trustMax * (H - 2 * pad);
      return [x, y, e];
    });
    var pl = document.createElementNS(ns, 'polyline');
    pl.setAttribute('points', pts.map(function (p) { return p[0] + ',' + p[1]; }).join(' '));
    pl.setAttribute('class', 'tline'); svg.appendChild(pl);
    pts.forEach(function (p) {
      var c = document.createElementNS(ns, 'circle');
      c.setAttribute('cx', p[0]); c.setAttribute('cy', p[1]); c.setAttribute('r', 5);
      c.setAttribute('class', p[2].d > 0 ? 'up' : p[2].d < 0 ? 'down' : 'flat');
      svg.appendChild(c);
    });
    return svg;
  }

  function debriefGrow(sm) {
    var items = [];
    sm.grows.forEach(function (g) {
      var used = Object.keys(g.cards).map(function (id) { return cardName(id) + 'を ' + g.cards[id] + '回'; }).join('、');
      items.push(h('li', { class: 'grow' }, [
        h('b', { text: D.STATS[g.stat].name + ' ' + (g.to - 1) + ' → ' + g.to }),
        h('span', { text: g.why === 'elite' ? '大きなかべを 乗りこえて、いちばん 使った力が のびた。' : (used || D.STATS[g.stat].verb + 'カードを ' + g.uses + '回') + ' 使ったから。' })
      ]));
    });
    if (sm.supportUses.length) {
      var names = {};
      sm.supportUses.forEach(function (e) { names[D.SUPPORTS[e.id].name] = 1; });
      items.push(h('li', { class: 'unlock' }, [h('b', { text: 'こまったとき、' + Object.keys(names).map(function (n) { return '「' + n + '」'; }).join('・') + 'に たよれた' }), h('span', { text: 'たよれる人や ものを 使えるのも、大事な力。' })]));
    }
    sm.unlocks.forEach(function (id) {
      items.push(h('li', { class: 'unlock' }, [h('b', { text: cardName(id) + 'が 使えるようになった' }), h('span', { text: '育った力と 信頼で、できることが ふえた。' })]));
    });
    var trustUps = sm.trustLine.filter(function (e) { return e.d > 0; });
    var trustBox = h('div', { class: 'trustbox' }, [
      h('h3', { text: '信頼 ' + sm.trustStart + ' → ' + sm.trust }),
      trustChart(sm.trustLine),
      h('ul', {}, groupUps(trustUps).map(function (g) { return h('li', { text: '+' + g.d + '：' + whyText(g.why) + (g.n > 1 ? '（' + g.n + '回）' : '') }); })),
      sm.recovered.length ? h('p', { class: 'praise', text: '信頼が 下がったあと、自分の行動で 取りもどした。それは とても 大事な力。' }) : null
    ]);
    var cards = [];
    sm.gained.forEach(function (g) { cards.push(h('li', { text: cardName(g.card) + 'を 手に入れた（選択肢が ふえた）' })); });
    sm.removed.forEach(function (g) { cards.push(h('li', { class: 'grad', text: cardName(g.card) + 'を 卒業した' })); });
    var fallback = null;
    if (!items.length && !trustUps.length && !cards.length) {
      var most = mostUsed();
      fallback = h('p', { class: 'praise', text: '今回は ' + (most ? cardName(most) + 'で たくさん 乗りこえた。' : 'さいごまで あきらめずに 考えた。') + '次は「わからないと言う」や「いっしょにやろう」も ためせるよ。' });
    }
    return [
      h('h2', { text: 'そだったもの' }),
      h('ul', { class: 'growlist' }, items),
      fallback,
      trustBox,
      cards.length ? h('div', {}, [h('h3', { text: '選択肢' }), h('ul', {}, cards)]) : null
    ];
  }
  function groupUps(ups) {
    var by = {}, order = [];
    ups.forEach(function (e) {
      if (!by[e.why]) { by[e.why] = { why: e.why, d: 0, n: 0 }; order.push(e.why); }
      by[e.why].d += e.d; by[e.why].n++;
    });
    return order.map(function (k) { return by[k]; });
  }
  function mostUsed() {
    var cnt = {};
    S.log.forEach(function (e) { if (e.k === 'play') cnt[e.card] = (cnt[e.card] || 0) + 1; });
    var best = null;
    Object.keys(cnt).forEach(function (k) { if (!best || cnt[k] > cnt[best]) best = k; });
    return best;
  }

  function debriefView(sm) {
    return [
      h('h2', { text: '見方が 変わった・見つけた' }),
      sm.reveals.length ? h('ul', { class: 'reveals' }, sm.reveals.map(function (r) {
        return h('li', {}, [h('s', { text: r.from }), ' → ', h('b', { text: r.to }),
          h('small', { text: r.truth === 'hostile' ? '（たしかめたら、ほんとうに いやなことだった。だから 先生に つたえるのが 大事）' : '（たしかめたら、わざとじゃなかった）' })]);
      })) : h('p', { text: '今回は「見方を 変える」カードを 使わなかった。次は「相手の ようすを見る」を ためしてみよう。' }),
      h('h3', { text: 'この場面で、こんな 選択肢が あった' }),
      h('ul', {}, sm.discovered.map(function (d) { return h('li', { text: D.ENEMIES[d.enemy].scene + '：' + cardName(d.card) }); })),
      h('h3', { text: '相手から 見ると' }),
      h('ul', { class: 'others' }, sm.others.map(function (o) { return h('li', { text: o.other }); }))
    ];
  }

  function debriefGrid(sm) {
    function cell(cls, title, sub, list) {
      var ex = list[0];
      return h('div', { class: 'cell ' + cls }, [
        h('b', { text: title }), h('small', { text: sub }),
        h('div', { class: 'num', text: list.length + '回' }),
        ex ? h('p', { text: '例：' + cardName(ex.card) }) : null
      ]);
    }
    var g = sm.grid;
    return [
      h('h2', { text: '選び方と 結果' }),
      h('div', { class: 'grid4' }, [
        h('div', {}), h('div', { class: 'gh', text: 'うまくいった' }), h('div', { class: 'gh', text: 'うまくいかなかった' }),
        h('div', { class: 'gh side', text: 'よい選び方' }),
        cell('g-ok', 'よかった', '', g.goodOk),
        cell('g-ng', 'ナイストライ', '選び方は よかった。こういう日も ある', g.goodNg),
        h('div', { class: 'gh side', text: 'しょうどう' }),
        cell('i-ok', 'ラッキー（でもモヤモヤ）', 'その場は おさまったけど…', g.impOk),
        cell('i-ng', 'うまくいかなかった', '', g.impNg)
      ]),
      h('p', { class: 'hint', text: '結果だけで、選び方の よしあしは きまらない。ほんとうの 生活なら、どれを えらぶ？' })
    ];
  }

  function endScreen() {
    var sm = E.summary(S);
    var pages = [debriefGrow, debriefView, debriefGrid];
    var body = pages[debriefPage](sm);
    var nav = h('div', { class: 'nav' }, [
      debriefPage > 0 ? h('button', { class: 'secondary', onclick: function () { debriefPage--; render(); }, text: 'もどる' }) : h('span'),
      h('span', { class: 'dots', text: (debriefPage + 1) + ' / ' + pages.length }),
      debriefPage < pages.length - 1
        ? h('button', { class: 'primary', onclick: function () { debriefPage++; render(); }, text: '次へ' })
        : h('button', { class: 'primary', onclick: function () { P.clear(); start(); }, text: 'もう一回' })
    ]);
    return h('main', { class: 'end' }, [
      h('p', { class: 'verdict ' + (sm.won ? 'won' : 'lost'), text: sm.won ? D.TEXT.win : D.TEXT.lose })
    ].concat(body, [nav]));
  }

  function render() {
    if (!S) return;
    var screen;
    if (S.phase === 'map') screen = mapScreen();
    else if (S.phase === 'battle') screen = battleScreen();
    else if (S.phase === 'reward') screen = rewardScreen();
    else if (S.phase === 'rest') screen = restScreen();
    else if (S.phase === 'event') screen = eventScreen();
    else screen = endScreen();
    app.replaceChildren(topBar(), screen);
    app.setAttribute('data-phase', S.phase);
  }

  function boot() {
    app = document.getElementById('app');
    P.load(function (saved) {
      if (saved && saved.ver === E.ENGINE_VER && saved.phase !== 'end') titleScreen(saved);
      else titleScreen(null);
    });
  }

  root.SST_UI = { boot: boot, _state: function () { return S; } };
})(this);
