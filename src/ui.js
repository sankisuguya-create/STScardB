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
      h('div', { class: 'nigates' }, Object.keys(S.nigate || {}).map(function (k) {
        return h('div', { class: 'chip nigate', title: '苦手意識' }, [h('span', { class: 'lbl', text: '苦手：' + D.CTX_LABEL[k] }), h('b', { text: String(S.nigate[k]) })]);
      })),
      h('div', { class: 'floor', text: (S.acts > 1 ? (S.act + 1) + 'そう目・' : '') + Math.min(S.row + 1, S.map.rows.length) + ' / ' + S.map.rows.length + ' だん' })
    ]);
  }

  var selSup = null;
  var lastDealKey = '', lastMoyaKey = '', lastClearKey = '';
  function sprite(key, form, cls) {
    var cv = document.createElement('canvas');
    cv.className = 'px ' + (cls || '');
    if (root.SST_SPRITES && SST_SPRITES.has(key)) SST_SPRITES.draw(cv, key, form || 0);
    return cv;
  }
  // アイテム：つけているもの（3つまで）。戦いごとに1回ずつ
  function itemSlots(inBattle) {
    var slots = [];
    for (var i = 0; i < D.SUPPORT_RULES.slots; i++) {
      (function (id) {
        if (!id) { slots.push(h('div', { class: 'item empty', title: 'あき' })); return; }
        var u = D.SUPPORTS[id], can = inBattle && E.canUseSupport(S, id);
        var used = inBattle && !can;
        slots.push(h('button', {
          class: 'item' + (selSup === id ? ' selected' : '') + (used ? ' used' : ''), disabled: !inBattle || used, 'aria-label': u.name,
          onclick: function () {
            if (selSup === id) { selSup = null; act(function () { E.useSupport(S, id); }); }
            else { selSup = id; sel = -1; render(); }
          }
        }, [sprite(id, 2), h('span', { class: 'iname', text: u.name })]));
      })(S.equip[i]);
    }
    var tip = selSup && inBattle ? h('div', { class: 'itemtip' }, [h('b', { text: D.SUPPORTS[selSup].name }), h('span', { text: D.SUPPORTS[selSup].note }), h('small', { text: 'もう一度 タップで 使う（この戦いで 1回）' })]) : null;
    return h('div', { class: 'items' }, slots.concat([tip]));
  }

  // --- タイトル ---
  function titleScreen(saved) {
    var fixed = Number(P.param('mode'));
    var modes = fixed ? [] : [
      h('button', { class: 'primary big', onclick: function () { start(1); } }, ['みじかく あそぶ', h('small', { text: '1そう（約15分）' })]),
      h('button', { class: 'secondary big', onclick: function () { start(3); } }, ['ながく あそぶ', h('small', { text: '3そう（約45分）' })])
    ];
    app.replaceChildren(h('main', { class: 'title' }, [
      h('h1', { text: D.TEXT.title }),
      h('p', { class: 'sub', text: '毎日の「こまった」に、どの手で こたえる？' }),
      saved ? h('button', { class: 'primary big', onclick: function () { S = saved; render(); }, text: 'つづきから' }) : null,
      fixed ? h('button', { class: saved ? 'secondary big' : 'primary big', onclick: function () { start(fixed); }, text: saved ? 'はじめから' : 'はじめる' }) : h('div', { class: 'two' }, modes)
    ]));
  }
  function start(mode) { heroScreen(mode === 3 ? 3 : 1); }
  function heroScreen(mode) {
    var cards = Object.keys(D.HEROES).map(function (id) {
      var H = D.HEROES[id];
      var stat = function (k) { var v = H.stats[k]; return h('span', { class: 'hs' + (v < 0 ? ' minus' : '') }, [D.STATS[k].name + ' ', h('b', { text: v >= 2 ? '◎' : v === 1 ? '○' : v === 0 ? '△' : '×（' + v + '）' })]); };
      return h('button', { class: 'herocard', onclick: function () {
        S = E.newRun((Date.now() ^ (Math.random() * 1e9)) >>> 0, mode, id);
        debriefPage = 0; save(); render();
      } }, [
        sprite('hero_' + H.look, 2, 'hpic'),
        h('b', { class: 'hname', text: H.name }),
        h('small', { text: H.note }),
        h('div', { class: 'hstats' }, ['think', 'act', 'relate'].map(stat).concat([h('span', { class: 'hs' }, ['心の余裕 ', h('b', { text: String(H.maxYoyu) })])])),
        H.message ? h('small', { class: 'hmsg', text: H.message }) : null,
        h('small', { class: 'hgood', text: 'とくいな場面：' + H.good }),
        h('small', { class: 'hbad', text: 'にがてな場面：' + H.bad }),
        h('small', { class: 'hcard', text: '★レア：' + (H.cards.filter(function (id) { return E.card(id).adv; }).map(cardName).join('') || 'なし（成長して 手に入れる）') })
      ]);
    });
    app.replaceChildren(h('main', { class: 'title heroes' }, [h('h2', { text: 'だれで ぼうけんする？' }), h('div', { class: 'herogrid' }, cards)]));
  }

  function hearts(n) {
    var out = [];
    for (var i = 0; i < D.MAP.hearts; i++) out.push(h('span', { class: 'heart' + (i < n ? '' : ' lost'), text: i < n ? '♥' : '♡' }));
    return h('span', { class: 'hearts', 'aria-label': 'ボスの ハート ' + n }, out);
  }
  function bossBanner() {
    var A = D.ACTS[S.act], B = D.ENEMIES[A.boss];
    return h('div', { class: 'bossbanner' }, [
      h('div', { class: 'bb-act', text: (S.acts > 1 ? (S.act + 1) + 'そう目「' + A.name + '」' : '「' + A.name + '」') + 'の ボス' }),
      h('div', { class: 'bb-name' }, [h('span', { text: B.scene }), hearts(S.hearts)]),
      h('div', { class: 'bb-hint', text: '★の ついた 課題を 乗りこえるたびに、ボスの ハートが へって 弱くなる' })
    ]);
  }

  // 戦いの前に、状きょうを 語る ページ
  function introScreen() {
    var en = S.battle.enemy, EN = D.ENEMIES[en.id];
    var kind = en.kind === 'boss' ? 'ボス' : en.kind === 'elite' ? '大きなかべ' : en.kind === 'danger' ? 'あぶない場面' : '課題';
    return h('main', { class: 'intro k-' + en.kind }, [
      h('div', { class: 'intro-kind', text: kind + '：' + EN.scene }),
      h('div', { class: 'intro-art' }, [sprite(SST_SPRITES.enemyKey(en.id, en.form), en.form, 'mon')]),
      h('p', { class: 'intro-text', text: EN.intro }),
      h('button', { class: 'primary big', onclick: function () { act(function () { E.beginBattle(S); }); }, text: '向き合う' })
    ]);
  }

  // 段が 変わるとき（3層モード）
  function actClearScreen() {
    var A = D.ACTS[S.act];
    return h('main', { class: 'title' }, [
      h('h1', { text: (S.act) + 'そう目 クリア！' }),
      h('p', { class: 'sub', text: '心の余裕が 全部 もどった。次は「' + A.name + '」' }),
      bossBanner(),
      h('button', { class: 'primary big', onclick: function () { act(function () { E.nextAct(S); }); }, text: '次の そうへ' })
    ]);
  }

  var NODE = {
    battle: { label: '課題', cls: 'n-battle' }, elite: { label: '大きなかべ', cls: 'n-elite' },
    event: { label: 'できごと', cls: 'n-event' }, rest: { label: 'ひと休み', cls: 'n-rest' }, boss: { label: 'ボス', cls: 'n-boss' }
  };

  // --- マップ（線で つながった 分かれ道） ---
  var MX = 150, MY = 46, MW = 4 * MX, MH = (D.MAP.rows + 1) * MY;
  function nodeXY(r, col) { return [col * MX + MX / 2, MH - (r + 0.5) * MY]; }
  function mapScreen() {
    var ok = E.reachable(S), m = S.map;
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + MW + ' ' + MH); svg.setAttribute('preserveAspectRatio', 'none'); svg.setAttribute('class', 'maplines');
    var bossR = m.rows.length - 1;
    function line(a, b, cls) {
      var l = document.createElementNS(ns, 'line');
      l.setAttribute('x1', a[0]); l.setAttribute('y1', a[1]); l.setAttribute('x2', b[0]); l.setAttribute('y2', b[1]);
      l.setAttribute('class', cls); svg.appendChild(l);
    }
    m.edges.forEach(function (e) {
      var cls = 'ml' + (e.r === S.row - 1 && e.from === S.pos ? ' next' : e.r < S.row - 1 ? ' past' : '');
      line(nodeXY(e.r, e.from), nodeXY(e.r + 1, e.to), cls);
    });
    m.rows[bossR - 1].forEach(function (n) { line(nodeXY(bossR - 1, n.col), nodeXY(bossR, 1.5), 'ml' + (S.row === bossR && S.pos === n.col ? ' next' : '')); });
    var nodes = [];
    m.rows.forEach(function (row, r) {
      row.forEach(function (n, i) {
        var xy = nodeXY(r, n.col), here = r === S.row && ok.indexOf(i) >= 0;
        var E0 = n.enemy && D.ENEMIES[n.enemy];
        var label = NODE[n.kind].label;
        var sub = E0 ? (E0.kind === 'danger' ? 'あぶない場面' : E0.scene) : '';
        nodes.push(h('button', {
          class: 'mnode ' + NODE[n.kind].cls + (here ? ' here' : '') + (r < S.row ? ' past' : '') + (n.related ? ' rel' : ''),
          style: 'left:' + (xy[0] / MW * 100) + '%;top:' + (xy[1] / MH * 100) + '%',
          disabled: !here,
          onclick: function () { act(function () { E.chooseNode(S, i); }); }
        }, [h('b', { text: (n.related ? '★' : '') + label }), sub ? h('small', { text: sub }) : null]));
      });
    });
    var notice = S.notice; S.notice = null;
    return h('main', { class: 'map' }, [
      bossBanner(),
      notice ? h('p', { class: 'praise', text: notice }) : null,
      h('div', { class: 'maprow2' }, [itemSlots(false), h('p', { class: 'hint', text: '光っている マスから 次に 行くところを えらぼう' })]),
      h('div', { class: 'mapbox', style: 'aspect-ratio:' + MW + ' / ' + MH }, [svg].concat(nodes))
    ]);
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
    if (c.growFail) effects.push(h('span', { class: 'fx reveal' }, ['失敗も 成長']));
    if (c.tame) effects.push(h('span', { class: 'fx reveal' }, ['いきおいを 0に']));
    if (c.organize2) effects.push(h('span', { class: 'fx reveal' }, ['整理 ×2']));
    if (c.clearPanicAll) effects.push(h('span', { class: 'fx reveal' }, ['パニックを ぜんぶ けす']));
    if (c.clearMoya) effects.push(h('span', { class: 'fx reveal' }, ['モヤモヤを けす']));
    if (c.organize) effects.push(h('span', { class: 'fx reveal' }, ['整理する']));
    if (c.escape) effects.push(h('span', { class: 'fx reveal' }, ['その場を はなれる']));
    if (c.distance) effects.push(h('span', { class: 'fx reveal' }, ['いきおいを おさめる']));
    if (c.trust > 0) effects.push(h('span', { class: 'fx trust' }, ['信頼 +' + c.trust]));
    if (c.trust < 0) effects.push(h('span', { class: 'fx bad' }, ['信頼 ' + c.trust]));
    if (c.curse) effects.push(h('span', { class: 'fx bad' }, ['モヤモヤが 入る']));
    var tags = [];
    if (p.weak) tags.push(h('span', { class: 'tag good', text: 'よく効く' }));
    if (p.resist) tags.push(h('span', { class: 'tag', text: '効きにくい' }));
    if (p.backfire) tags.push(h('span', { class: 'tag bad', text: 'あとで こじれる' }));
    var lock = opts.lock;
    return h('div', { class: 'card' + (c.adv ? ' rare' : '') + ' t-' + c.type + (opts.selected ? ' selected' : '') + (opts.disabled ? ' off' : '') + (opts.temp ? ' temp' : '') }, [
      h('div', { class: 'cost', text: c.unplayable ? '-' : String(c.cost) }),
      c.adv ? h('div', { class: 'rarebadge', text: '★レア ' + (D.RARE_LINE[c.type] || '') }) : h('div', { class: 'ctype', text: D.TYPE_LABEL[c.type] + (opts.temp ? '・この場' : '') }),
      h('div', { class: 'cname', text: c.name }),
      h('div', { class: 'cline', text: c.line }),
      h('div', { class: 'fxs' }, effects),
      (c.chance || (D.STATS[c.type] && S && S.stats[c.type] < 0)) ? h('div', { class: 'chance c-' + (c.chance || 'weak'), text: (D.STATS[c.type] && S && S.stats[c.type] < 0) ? '失敗するかも（にがて）' : D.CHANCE[c.chance].label }) : null,
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
    var b = S.battle, en = b.enemy, it = E.intent(S), EN = D.ENEMIES[en.id];
    var itText = it.t === 'stress' ? '心の余裕 −' + it.n : it.t === 'grow' ? '問題の いきおい +' + it.n : 'モヤモヤが まざる';
    var hpPct = Math.max(0, Math.round(en.hp / en.maxHp * 100));
    var bubble = h('section', { class: 'bubble k-' + en.kind }, [
      h('div', { class: 'ekind', text: (en.kind === 'boss' ? 'ボス' : en.kind === 'elite' ? '大きなかべ' : '課題') + '：' + EN.scene }),
      h('h2', { class: 'ename' }, [en.name, en.kind === 'boss' ? hearts(S.hearts) : null]),
      h('div', { class: 'meter hp' }, [
        h('span', { class: 'lbl', text: '問題の大きさ' }),
        h('div', { class: 'bar' }, [h('div', { class: 'fill', style: 'width:' + hpPct + '%' })]),
        h('b', { text: Math.max(0, en.hp) + '/' + en.maxHp })
      ]),
      h('div', { class: 'intent' }, [h('span', { class: 'lbl', text: 'つぎに 起きそうなこと' }), h('b', { text: it.say + '（' + itText + '）' })]),
      it.passIn ? h('div', { class: 'passin', text: 'あと ' + it.passIn + ' ターン たえれば、時間とともに 過ぎ去る' + (EN.pass.leave ? '（でも モヤモヤが のこる）' : '') }) : h('div', { class: 'passin no', text: 'これは 時間がたっても 過ぎ去らない' }),
      EN.anxiety ? h('div', { class: 'note', text: 'どきどきして 力が 出にくい。整えるカードを 使うと、そのターンは ふつうに 効く。' + (b.calm ? '（いま 整っている）' : '') }) : null
    ]);
    var monster = h('div', { class: 'monster f' + en.form }, [sprite(SST_SPRITES.enemyKey(en.id, en.form), en.form, 'mon')]);
    if (en.form === 2 && root.SST_ILLUST && SST_ILLUST.svg(en.id)) { monster.innerHTML = SST_ILLUST.svg(en.id); }
    var hero = h('div', { class: 'hero' + (b.guard ? ' shield' : '') }, [
      sprite('hero_' + (D.HEROES[S.hero] ? D.HEROES[S.hero].look : 'hayatsu'), 2, 'me'),
      h('div', { class: 'chip guard' + (b.guard ? ' on' : '') }, [h('span', { class: 'lbl', text: 'ゆとり' }), h('b', { text: String(b.guard) })])
    ]);
    var stage = h('section', { class: 'stage' }, [itemSlots(true), hero, bubble, monster]);
    var msgs = h('section', { class: 'msgs', 'aria-live': 'polite' }, b.msgs.slice(-3).map(function (m) { return h('p', { class: 'm-' + m.tag, text: m.text }); }));
    var energy = h('div', { class: 'orb', title: '元気' }, [h('b', { text: b.energy + '/' + D.PLAYER.energy }), h('small', { text: '元気' })]);
    var dealKey = S.floor + ':' + b.turn;
    var deal = dealKey !== lastDealKey; lastDealKey = dealKey;
    var n = b.hand.length, mid = (n - 1) / 2;
    var hand = h('section', { class: 'hand' }, b.hand.map(function (hc, i) {
      var c = E.card(hc.id), ok = E.canPlay(S, i);
      var el = cardView(c, { preview: c.unplayable ? {} : E.preview(S, i), selected: sel === i, disabled: !ok, temp: hc.temp, lock: lockText(c) });
      var d = i - mid;
      el.style.setProperty('--rot', (d * 2.2) + 'deg');
      el.style.setProperty('--lift', (Math.abs(d) * Math.abs(d) * 1.4) + 'px');
      if (deal) { el.classList.add('deal'); el.style.animationDelay = (i * 70) + 'ms'; }
      el.addEventListener('click', function () {
        selSup = null;
        if (!ok) { sel = i; render(); return; }
        if (sel === i) act(function () { E.playCard(S, i); });
        else { sel = i; render(); }
      });
      return el;
    }));
    var help = h('p', { class: 'hint', text: sel >= 0 && E.canPlay(S, sel) ? 'もう一度 タップで 使う' : sel >= 0 ? (E.card(b.hand[sel].id).unplayable ? 'モヤモヤは 使えない' : '元気が たりない／条件が たりない') : 'カードを タップして えらぶ' });
    var end = h('button', { class: 'primary endturn', onclick: function () { act(function () { E.endTurn(S); }); }, text: 'ターンを おわる' });
    var piles = h('div', { class: 'pile draw', text: '山札 ' + b.draw.length });
    var disc = h('div', { class: 'pile disc', text: 'すて札 ' + b.discard.length + (b.bench.length ? '／控え ' + b.bench.length : '') });
    var flyMsgs = b.msgs.filter(function (m) { return m.tag === 'curse' || m.tag === 'worry' || m.tag === 'inject'; });
    var moyaN = flyMsgs.length;
    var moyaKey = dealKey + ':' + b.msgs.length;
    var flies = [];
    if (moyaN && moyaKey !== lastMoyaKey) {
      for (var mi = 0; mi < moyaN; mi++) flies.push(h('div', { class: 'moyafly' + (flyMsgs[mi].tag === 'inject' ? ' inject' : ''), style: 'animation-delay:' + (mi * 180) + 'ms', text: flyMsgs[mi].card || 'モヤモヤ' }));
    }
    lastMoyaKey = moyaKey;
    var clears = b.msgs.some(function (m) { return m.tag === 'clear'; }) && moyaKey !== lastClearKey ? [h('div', { class: 'moyaclear', text: 'すっきり！' })] : [];
    if (clears.length) lastClearKey = moyaKey;
    return h('main', { class: 'battle' }, flies.concat(clears, [stage, h('div', { class: 'row' }, [energy, msgs, help, end]), h('div', { class: 'handrow' }, [piles, hand, disc])]));
  }

  // --- 報酬 ---
  function rewardScreen() {
    var r = S.reward;
    return h('main', { class: 'reward' }, [
      h('h2', { text: r.frozen ? '時間が すぎた…' : r.fled ? 'その場を はなれた' : r.escaped ? '安全な ところへ はなれた！' : r.passed ? '時間が たった' : '乗りこえた！' }),
      r.frozen ? h('p', { class: 'story', text: '動けないまま、時間が すぎた。「' + D.CTX_LABEL[r.frozen.ctx] + '」に 苦手意識が ついた（' + r.frozen.to + '）。この場面では ストレスが 少し ふえる。心の余裕は 1割まで もどった。' }) : null,
      r.fled ? h('p', { class: 'story', text: 'にげたので、問題は そのまま のこった（モヤモヤが デッキに 入った）。にげるのが いい場面と、そうでない場面が ある。' }) : null,
      r.escaped ? h('p', { class: 'praise', text: 'あぶない場面では、はなれる・にげる・大人を よぶ が いちばん。自分の 安全を 守れた。' }) : null,
      r.passed ? h('p', { class: 'story', text: r.passed + (r.leave ? '（モヤモヤが デッキに 入った）' : '') }) : null,
      h('p', { class: 'other', text: r.other }),
      r.support ? h('div', { class: 'supoffer' }, [
        sprite(r.support, 2, 'offer'),
        h('b', { text: 'アイテムが 見つかった：「' + D.SUPPORTS[r.support].name + '」' }),
        h('small', { text: D.SUPPORTS[r.support].note }),
        h('button', { class: 'secondary', onclick: function () { act(function () { E.takeSupport(S); }); }, text: '受け取る' }),
        S.equip.length >= D.SUPPORT_RULES.slots ? h('small', { text: 'いまは 3つ つけているので、持ち物に 入る（ひと休みで 入れかえられる）' }) : null
      ]) : null,
      r.choices.length ? h('p', { class: 'hint', text: 'これから 使える 選択肢を 1つ えらぼう' }) : null,
      h('div', { class: 'choices' }, r.choices.map(function (id) {
        var el = cardView(E.card(id), { lock: lockText(E.card(id)), showCtx: true });
        el.addEventListener('click', function () { act(function () { E.pickReward(S, id); }); });
        return el;
      })),
      h('button', { class: 'secondary', onclick: function () { act(function () { E.pickReward(S, null); }); }, text: r.choices.length ? '今回は えらばない' : '次へ' })
    ]);
  }

  // --- ひと休み ---
  function restScreen() {
    if (removing) {
      return h('main', { class: 'rest' }, [
        h('h2', { text: '自分を 見つめ直す：もう 使わない カードを 1まい えらぶ' }),
        h('div', { class: 'choices small' }, S.deck.map(function (id, i) {
          var el = cardView(E.card(id), { showCtx: true });
          el.addEventListener('click', function () { removing = false; act(function () { E.rest(S, 'remove', i); }); });
          return el;
        })),
        h('button', { class: 'secondary', onclick: function () { removing = false; render(); }, text: 'もどる' })
      ]);
    }
    var equipPanel = S.items.length > 1 ? h('div', { class: 'equip' }, [
      h('h3', { text: 'アイテムを 入れかえる（' + D.SUPPORT_RULES.slots + 'つまで つけられる）' }),
      h('div', { class: 'equiplist' }, S.items.map(function (id) {
        var on = S.equip.indexOf(id) >= 0, full = S.equip.length >= D.SUPPORT_RULES.slots;
        return h('button', {
          class: 'eq' + (on ? ' on' : ''), disabled: !on && full, 'aria-pressed': on ? 'true' : 'false',
          onclick: function () {
            var next = on ? S.equip.filter(function (x) { return x !== id; }) : S.equip.concat([id]);
            act(function () { E.setEquip(S, next); });
          }
        }, [sprite(id, 2), h('b', { text: D.SUPPORTS[id].name }), h('small', { text: on ? 'つけている' : (full ? 'いっぱい' : 'つける') })]);
      }))
    ]) : null;
    return h('main', { class: 'rest' }, [
      h('h2', { text: 'ひと休み' }),
      equipPanel,
      h('div', { class: 'two' }, [
        h('button', { class: 'primary big', onclick: function () { act(function () { E.rest(S, 'rest'); }); } }, ['休む', h('small', { text: '心の余裕を ' + Math.round(S.maxYoyu * D.RULES.restHeal) + ' 回ふく。「お家の人に そうだんする」カードが もらえる' })]),
        h('button', { class: 'secondary big', onclick: function () { removing = true; render(); } }, ['自分を 見つめ直す', h('small', { text: 'いらない くせを 1つ 卒業する' })])
      ])
    ]);
  }

  // --- できごと ---
  function eventScreen() {
    var ev = D.EVENTS[S.event.id], done = S.event.done;
    return h('main', { class: 'event' }, [
      ev.trouble ? h('div', { class: 'troublebadge', text: 'トラブル（さっきの 行動の あとで 起きた）' }) : null,
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
    if (why === 'escape') return 'あぶない場面から はなれた';
    if (!E.card(why)) return why;
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
    sm.escapes.filter(function (e) { return e.ok; }).forEach(function (e) {
      items.push(h('li', { class: 'unlock' }, [h('b', { text: '「' + D.ENEMIES[e.enemy].scene + '」から はなれて、安全を 守れた' }), h('span', { text: 'たたかうだけが 正解じゃない。場面に 合わせて えらべるのが 大事な力。' })]));
    });
    S.log.filter(function (e) { return e.k === 'choice' && D.EVENTS[e.id] && D.EVENTS[e.id].trouble && e.i === 0; }).forEach(function (e) {
      items.push(h('li', { class: 'unlock' }, [h('b', { text: 'トラブルの あと、正直に 話して やり直せた' }), h('span', { text: 'まちがえても、話して あやまれば やり直せる。それも 大事な力。' })]));
    });
    sm.nigate.forEach(function (e) {
      items.push(h('li', {}, [h('b', { text: '「' + D.CTX_LABEL[e.ctx] + '」が 苦手に なった（' + e.to + '）' }), h('span', { text: '心の余裕が なくなる前に、休む・きょりを おく・だれかに そうだん しよう。' })]));
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
    else if (S.phase === 'actclear') screen = actClearScreen();
    else if (S.phase === 'intro') screen = introScreen();
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
