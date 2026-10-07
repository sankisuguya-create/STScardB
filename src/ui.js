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

  function save() { if (S && !S.tutorial && S.phase !== 'battle') P.save(S); }

  function act(fn) {
    try { fn(); } catch (e) { console.error(e); }
    sel = -1;
    save();
    render();
  }

  // --- 上の帯 ---
  function topBar() {
    var stress = S.maxYoyu - S.yoyu;
    var pct = Math.round(stress / S.maxYoyu * 100);
    var low = S.yoyu < S.maxYoyu * D.RULES.stressThreshold;
    return h('header', { class: 'top' }, [
      h('div', { class: 'meter' + (low ? ' low' : '') }, [
        h('span', { class: 'lbl', text: 'ストレス' }),
        h('div', { class: 'bar' }, [h('div', { class: 'fill', style: 'width:' + pct + '%' })]),
        h('b', { text: stress + '/' + S.maxYoyu })
      ]),
      h('button', { class: 'chip trust', title: STAT_HELP.trust, onclick: function () { statHelp = 'trust'; render(); } }, [statIcon('trust'), h('b', { text: String(S.trust) })]),
      h('div', { class: 'stats' }, Object.keys(D.STATS).map(function (k) {
        return h('button', { class: 'chip st-' + k, title: STAT_HELP[k], onclick: function () { statHelp = k; render(); } }, [statIcon(k), h('b', { text: String(S.stats[k]) })]);
      })),
      h('div', { class: 'nigates' }, Object.keys(S.nigate || {}).map(function (k) {
        return h('div', { class: 'chip nigate', title: '苦手意識' }, [h('span', { class: 'lbl', text: '苦手：' + D.CTX_LABEL[k] }), h('b', { text: String(S.nigate[k]) })]);
      })),
      S.tutorial ? h('div', { class: 'floor', text: 'れんしゅう' }) : h('div', { class: 'floor', text: (S.acts > 1 ? (S.act + 1) + 'そう目・' : '') + Math.min(S.row + 1, S.map.rows.length) + ' / ' + S.map.rows.length + ' だん' })
    ]);
  }

  var selSup = null;
  // 能力の アイコン：かしこさ＝デフォルメの 脳、行動＝💪、なかま力＝「友」、信頼＝中央に 向かう 3つの 👍
  var BRAIN_SVG = '<svg viewBox="0 0 32 32" width="22" height="22" aria-hidden="true">' +
    '<path d="M16 5c-2-2-6-2-7.5 0.5C5.5 5.5 3.5 8 4.5 11 2.5 12.5 2.5 16 4.5 17.5 3.5 20.5 6 23.5 9 23c1 2.5 4.5 3.5 7 1.5 2.5 2 6 1 7-1.5 3 .5 5.5-2.5 4.5-5.5 2-1.5 2-5 0-6.5 1-3-1-5.5-4-5.5C22 3 18 3 16 5z" fill="#ff9fb8" stroke="#12172a" stroke-width="1.6" stroke-linejoin="round"/>' +
    '<path d="M16 6v18M9 10c2 1 2 3 0 4M23 10c-2 1-2 3 0 4M8 18c2-1 4 0 4 2M24 18c-2-1-4 0-4 2" fill="none" stroke="#d4567a" stroke-width="1.4" stroke-linecap="round"/>' +
    '<circle cx="12.5" cy="15" r="1.3" fill="#12172a"/><circle cx="19.5" cy="15" r="1.3" fill="#12172a"/>' +
    '<path d="M14.5 18.2q1.5 1.2 3 0" fill="none" stroke="#12172a" stroke-width="1.2" stroke-linecap="round"/></svg>';
  // 信頼：まん中の 人に、左右から 👍 が 向けられている
  // 👍：にぎった 4本の 指（ふし）と、上に 立てた 親指。左がわの 手は 右（まん中）を 向く
  function thumb(x, y, flip, sleeve, s) {
    s = s || 1;
    var o = '#12172a', skin = '#f2a477', w = (0.7 / s).toFixed(2);
    return '<g transform="translate(' + x + ' ' + y + ') scale(' + (flip ? -s : s) + ' ' + s + ')">' +
      '<rect x="-7.5" y="0" width="3.6" height="6.4" rx=".8" fill="' + sleeve + '" stroke="' + o + '" stroke-width="' + w + '"/>' +
      // 親指（ななめに 立つ、先が まるい）
      '<path d="M-3.6 1.2C-3.6-1-3-3.4-1.6-4.6C-.6-5.4.5-4.8.3-3.6L-.2-.6Z" fill="' + skin + '" stroke="' + o + '" stroke-width="' + w + '" stroke-linejoin="round"/>' +
      // にぎった 手（こぶし）
      '<path d="M-4.2 0H2.2Q3.6 0 3.6 1.3V5.6Q3.6 7 2.2 7H-4.2Z" fill="' + skin + '" stroke="' + o + '" stroke-width="' + w + '" stroke-linejoin="round"/>' +
      // 4本の 指の さかい目
      '<path d="M.6 1.75H3.6M.6 3.5H3.6M.6 5.25H3.6" stroke="' + o + '" stroke-width="' + (0.55 / s).toFixed(2) + '" stroke-linecap="round"/>' +
      '</g>';
  }
  var TRUST_SVG = '<svg viewBox="0 0 32 32" width="26" height="26" aria-hidden="true">' +
    '<path d="M10 31Q10 22.5 16 22.5Q22 22.5 22 31Z" fill="#12172a"/><circle cx="16" cy="16" r="4.4" fill="#12172a"/>' +
    '<path d="M16 9l-1.3-1.2a.9.9 0 0 1 1.3-1.2.9.9 0 0 1 1.3 1.2Z" fill="#ef5a7a"/>' +
    thumb(7, 10, false, '#4c6ef5', 1.05) + thumb(25, 17, true, '#2f9e44', 1.05) + '</svg>';
  function statIcon(k) {
    var name = k === 'trust' ? '信頼' : D.STATS[k].name;
    if (k === 'think') { var sp = h('span', { class: 'ico ico-brain', role: 'img', 'aria-label': name }); sp.innerHTML = BRAIN_SVG; return sp; }
    if (k === 'act') return h('span', { class: 'ico', role: 'img', 'aria-label': name, text: '💪' });
    if (k === 'relate') return h('span', { class: 'ico ico-tomo', role: 'img', 'aria-label': name, text: '友' });
    var tr = h('span', { class: 'ico ico-trust', role: 'img', 'aria-label': name }); tr.innerHTML = TRUST_SVG; return tr;
  }
  var STAT_HELP = {
    trust: '信頼（0〜10）：まわりの 人からの 信頼。よい関わりで 上がり（1回の 戦いで +2まで）、衝動的な 行動や ふうんな できごとで 下がる。7以上：戦いの はじめに 友だちが そばに いて 心の準備 +6。8以上：報酬の カードが 1まい ふえる。3以下：やり直しの チャンスが 来る。',
    think: 'かしこさ：「考える」カードの 効き目に たされる。手札の 上限は 5＋かしこさ。2以上で 戦いの はじめに 問題の 正体が 1だん 見える。マイナスだと 考えるカードが 失敗しやすい（−1ごとに 20%）。',
    act: '行動：「動く」カードの 効き目に たされる。マイナスだと 動くカードが 失敗しやすい（−1ごとに 20%）。',
    relate: 'なかま力：「関わる」カードの 効き目に たされる。マイナスだと 関わるカードが 失敗しやすい（−1ごとに 20%）。',
    grow: 'のび方：1回の 戦いで 同じ 系統の カードを 3回（成長の 道では 2回）使うと +1。大きなかべを こえると、いちばん 使った 系統が +1。下がる ことは ない。'
  };
  var statHelp = null, lastOverKey = '', infoOpen = false, discarding = false, recalling = false, lastDealKey = '', lastMoyaKey = '', lastClearKey = '', lastPlay = null, shownPlay = null, lastHitKey = '';
  // ストレスの 割合で 主人公の 見た目を かえる
  function heroMood() {
    if (!S) return 0;
    if (S.battle && S.battle.frozen) return 4;
    var r = (S.maxYoyu - S.yoyu) / S.maxYoyu;
    return r >= 0.85 ? 3 : r >= 0.65 ? 2 : r >= 0.4 ? 1 : 0;
  }
  function sprite(key, form, cls, mood) {
    var cv = document.createElement('canvas');
    if (/^hero_/.test(key) && root.SST_HEROES) { cv.className = 'px hero64 ' + (cls || ''); SST_HEROES.draw(cv, key.slice(5), mood || 0); return cv; }
    cv.className = 'px ' + (cls || '') + (key === 'teacher' || key === 'friend' || key === 'family' ? ' silhouette' : '');
    if (root.SST_SPRITES && SST_SPRITES.has(key)) SST_SPRITES.draw(cv, key, form || 0, mood || 0);
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
          class: 'item' + (selSup === id ? ' selected' : '') + (used ? ' used' : ''), title: used && D.SUPPORTS[id].term === 'long' && D.ENEMIES[S.battle.enemy.id].term === 'short' ? 'すぐに 来る 課題では 使えない' : null, disabled: !inBattle || used, 'aria-label': u.name,
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
  var pending = null;
  function beginRun() {
    S = E.newRun((Date.now() ^ (Math.random() * 1e9)) >>> 0, pending.mode, pending.hero);
    debriefPage = 0; save(); render();
  }
  var RULES = [
    { t: 'ゲームの 目的', b: ['毎日の「こまった」（課題）に、カード＝自分に できる 行動で こたえて、さいごの ボスまで たどりつこう。', 'ストレスが いっぱいに なると 動けなく なる。ストレスを ためすぎない ように しよう。', 'うまく いかなくても だいじょうぶ。いろいろな 選び方を ためして、どれが 自分にも まわりにも よいか 考えよう。'] },
    { t: 'バトルの ルール', b: ['課題の「問題の大きさ」を 0に すると、乗りこえ！', 'カードを 使うには「元気」が いる。元気は 毎ターン 3 もどる。', 'ターンを おわると、課題が ストレスを ふやしてくる。「心の準備」の 分は 受けとめられる。', '赤い「しょうどう」カードは すぐ 効くけど、あとで モヤモヤや トラブルに なる。', '相談する・はなれる・時間を かける も、大切な 選び方。場面に 合った カードを えらぼう。'] },
    { t: 'すすみ方', b: ['マップで 道を えらんで 進む。課題・できごと・ひと休み が ある。', '★の 課題を 乗りこえると、ボスが 弱くなる。', '乗りこえると、新しい カード（選択肢）や 成長が 手に入る。', 'さいごに ふり返りで、自分の 選び方を 見なおそう。'] }
  ];
  function rulesScreen(page) {
    var R = RULES[page];
    app.replaceChildren(h('main', { class: 'title rules' }, [
      h('div', { class: 'dots', text: 'せつめい ' + (page + 1) + ' / ' + RULES.length }),
      h('h2', { text: R.t }),
      h('ul', { class: 'rulelist' }, R.b.map(function (x) { return h('li', { text: x }); })),
      h('div', { class: 'two' }, [
        h('button', { class: 'secondary', onclick: beginRun, text: 'せつめいを とばす' }),
        page < RULES.length - 1
          ? h('button', { class: 'primary', onclick: function () { rulesScreen(page + 1); }, text: '次へ' })
          : h('button', { class: 'primary', onclick: startTutorial, text: 'れんしゅう バトルへ' })
      ])
    ]));
  }
  function startTutorial() {
    S = E.newTutorial(1234, pending.hero);
    sel = -1; render();
  }
  // れんしゅう中の ガイド
  function coach() {
    if (!S || !S.tutorial || S.phase !== 'battle') return null;
    var b = S.battle, any = b.hand.some(function (x, i) { return E.canPlay(S, i); });
    var text;
    if (b.turn === 1 && sel < 0 && any) text = '① 下の カードを 1まい タップして えらぼう。カードには「何をするか」と「効き目」が 書いてあるよ。';
    else if (sel >= 0 && E.canPlay(S, sel)) text = '② えらんだ カードを もう一度 タップすると 使えるよ。「解決」は 問題を 小さくし、「心の準備」は ストレスを 受けとめる。';
    else if (!any || b.energy === 0) text = '③ 元気（黄色の 丸）が なくなったら「ターンを おわる」を おそう。課題が ストレスを ふやしてくる（上の 帯）。';
    else text = '「よく効く」と 書いた カードは、この 課題に とくに 効くよ。問題の大きさを 0に しよう！';
    return h('div', { class: 'coach' }, [h('b', { text: 'れんしゅう' }), h('span', { text: text }), h('button', { class: 'secondary small', onclick: beginRun, text: 'とばして 本番へ' })]);
  }
  function tutorialDoneScreen() {
    return h('main', { class: 'title' }, [
      h('h1', { text: 'れんしゅう クリア！' }),
      h('p', { class: 'sub', text: 'カードを えらんで、もう一度 タップで 使う。元気が なくなったら ターンを おわる。これで じゅんび OK！' }),
      h('button', { class: 'primary big', onclick: beginRun, text: 'ぼうけんを はじめる' })
    ]);
  }

  function heroScreen(mode) {
    var cards = Object.keys(D.HEROES).map(function (id) {
      var H = D.HEROES[id];
      var stat = function (k) { var v = H.stats[k]; return h('span', { class: 'hs' + (v < 0 ? ' minus' : '') }, [D.STATS[k].name + ' ', h('b', { text: v >= 2 ? '◎' : v === 1 ? '○' : v === 0 ? '△' : '×（' + v + '）' })]); };
      return h('button', { class: 'herocard', onclick: function () {
        pending = { mode: mode, hero: id };
        rulesScreen(0);
      } }, [
        sprite('hero_' + H.look, 2, 'hpic'),
        h('b', { class: 'hname', text: H.name }),
        h('small', { text: H.note }),
        h('div', { class: 'hstats' }, ['think', 'act', 'relate'].map(stat).concat([h('span', { class: 'hs' }, ['ストレスの 上限 ', h('b', { text: String(H.maxYoyu + D.PLAYER.stressStart) })])])),
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
    var kind = EN.selfFail ? '自分の しっぱい' : EN.trouble ? 'トラブル' : en.kind === 'boss' ? 'ボス' : en.kind === 'elite' ? '大きなかべ' : en.kind === 'danger' ? 'あぶない場面' : '課題';
    return h('main', { class: 'intro k-' + en.kind }, [
      EN.selfFail ? h('div', { class: 'troublebadge', text: '自分の しっぱい：自分が してしまった ことに 向き合う' }) : null,
      EN.trouble ? h('div', { class: 'troublebadge', text: 'トラブル：これまでの 衝動的な 行動が 原因で 起きた（衝動カードを 使うほど ？マスで 出やすくなる）' }) : null,
      h('div', { class: 'intro-kind', text: kind + '：' + EN.scene }),
      h('div', { class: 'intro-art' }, [sprite(SST_SPRITES.enemyKey(EN.art || en.id, en.form), en.form, 'mon')]),
      h('p', { class: 'intro-text', text: EN.intro }),
      h('button', { class: 'primary big', onclick: function () { act(function () { E.beginBattle(S); }); }, text: '向き合う' })
    ]);
  }

  // 段が 変わるとき（3層モード）
  // 層クリア：何が 良かったか 振り返る
  function reviewPanel() {
    var r = S.actReview;
    if (!r) return null;
    if (r.taken) return h('p', { class: 'praise', text: r.taken === 'card' ? 'うまく いった やり方を、自分の ものに した。' : r.taken === 'stat' ? D.STATS[r.stat].name + 'が のびた。' : 'アイテム「' + D.SUPPORTS[r.item].name + '」を 手に入れた。' });
    var cards = r.cards.map(function (id, i) {
      var el = cardView(E.card(id), {});
      el.addEventListener('click', function () { act(function () { E.takeReview(S, 'card', id); }); });
      return h('div', { class: 'recall' }, [h('small', { class: 'recallsrc', text: r.counts[i] ? 'この そうで ' + r.counts[i] + '回 うまく いった' : 'こんな やり方も ある' }), el]);
    });
    return h('section', { class: 'review' }, [
      h('h2', { text: '何が 良かったか 振り返ろう…' }),
      r.chain ? h('p', { class: 'praise', text: '自分の 悪かった 所に 気づいて、仲直り できた。なかま力 +1、信頼 +2。人の 話を 聞く・間に 入る やり方も 見えてきた。' }) : null,
      h('p', { class: 'hint', text: '1つ えらぶ' }),
      h('div', { class: 'choices' }, cards),
      h('div', { class: 'two' }, [
        r.stat ? h('button', { class: 'secondary big', onclick: function () { act(function () { E.takeReview(S, 'stat'); }); } }, [D.STATS[r.stat].name + ' +1', h('small', { text: 'この そうで いちばん 使った 力（' + r.statUses + '回）を のばす' })]) : null,
        r.item ? h('button', { class: 'secondary big', onclick: function () { act(function () { E.takeReview(S, 'item'); }); } }, ['「' + D.SUPPORTS[r.item].name + '」', h('small', { text: 'たよれる ものを 1つ 手に入れる。' + D.SUPPORTS[r.item].note })]) : null
      ])
    ]);
  }

  function actClearScreen() {
    var A = D.ACTS[S.act];
    return h('main', { class: 'title actclear' }, [
      h('h1', { text: S.actLost ? (S.act) + 'そう目 おわり' : (S.act) + 'そう目 クリア！' }),
      S.actLost ? h('p', { class: 'story', text: 'ボスは 乗りこえられなかった。でも 毎日は 続く。' }) : null,
      h('p', { class: 'sub', text: 'ストレスは そのまま 次の そうへ。ストレスが 多い ときは、楽な 道で 休むのも 一つの 手。次は「' + A.name + '」' }),
      reviewPanel(),
      bossBanner(),
      h('button', { class: 'primary big', disabled: !!(S.actReview && !S.actReview.taken), onclick: function () { act(function () { E.nextAct(S); }); }, text: S.actReview && !S.actReview.taken ? '上から 1つ えらぼう' : '次の そうへ' })
    ]);
  }

  var NODE = {
    battle: { label: '課題に 向き合う', cls: 'n-battle' }, elite: { label: '大きなかべ', cls: 'n-elite' },
    mystery: { label: '？', cls: 'n-mystery' }, slack: { label: 'ゴロゴロ', cls: 'n-slack' },
    event: { label: 'できごと', cls: 'n-event' }, rest: { label: 'ひと休み', cls: 'n-rest' }, boss: { label: 'ボス', cls: 'n-boss' }
  };

  // --- マップ（線で つながった 分かれ道） ---
  var MX = 200, MY = 42, MW = D.MAP.cols * MX, MH = (D.MAP.rows + 1) * MY;
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
        }, [h('b', { text: (n.related ? '★' : '') + label }), sub && n.kind !== 'mystery' ? h('small', { text: sub }) : null]));
      });
    });
    var notice = S.notice; S.notice = null;
    return h('main', { class: 'map' }, [
      bossBanner(),
      notice ? h('p', { class: 'praise', text: notice }) : null,
      h('div', { class: 'maprow2' }, [itemSlots(false), h('p', { class: 'hint', text: '光っている マスから 次に 行くところを えらぼう' })]),
      h('div', { class: 'mapbox', style: 'aspect-ratio:' + MW + ' / ' + MH }, [svg].concat(nodes)),
      (S.slack ? h('p', { class: 'slacknote', text: 'ゴロゴロ ' + S.slack + '回：ボスが ' + Math.round(D.MAP.slackBoss * S.slack * 100) + '% 大きく なっている' }) : null)
    ]);
  }

  // --- 戦い ---
  function cardView(c, opts) {
    opts = opts || {};
    var effects = [];
    var p = opts.preview || {};
    if (c.solve) effects.push(h('span', { class: 'fx solve' }, ['解決 ' + (p.solve != null ? p.solve : c.solve)]));
    if (c.guard) effects.push(h('span', { class: 'fx guard' }, ['心の準備 ' + (p.guard != null ? p.guard : c.guard)]));
    if (c.heal) effects.push(h('span', { class: 'fx heal' }, ['ストレス −' + c.heal]));
    if (c.draw) effects.push(h('span', { class: 'fx' }, ['1まい 引く']));
    if (c.growFail) effects.push(h('span', { class: 'fx reveal' }, ['失敗も 成長']));
    if (c.tame) effects.push(h('span', { class: 'fx reveal' }, ['いきおいを 0に']));
    if (c.organize2) effects.push(h('span', { class: 'fx reveal' }, ['整理 ×2']));
    if (c.clearPanicAll) effects.push(h('span', { class: 'fx reveal' }, ['パニックを ぜんぶ けす']));
    if (c.clearMoya) effects.push(h('span', { class: 'fx reveal' }, ['モヤモヤを けす']));
    if (c.term === 'long') effects.push(h('span', { class: 'fx term' }, ['時間を かけて']));
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
    ]);
  }

  // そのカードが 使える 課題（対応表 src/fit.js から）
  function scenesOf(c) {
    if (!D.FIT) return null;
    var id = Object.keys(D.CARDS).filter(function (k) { return D.CARDS[k] === c; })[0];
    var names = Object.keys(D.FIT).filter(function (eid) { return D.FIT[eid][id] && D.ENEMIES[eid]; }).map(function (eid) { return D.ENEMIES[eid].scene; });
    return h('div', { class: 'ctx', text: names.length ? '使える場面：' + names.join('・') : '使える場面：なし' });
  }

  function lockText(c) {
    var short = E.reqShort(S, c);
    if (!short) return null;
    return 'あと ' + short.map(function (x) { return (x.k === 'trust' ? '信頼' : D.STATS[x.k].name) + x.need; }).join('・');
  }

  function battleScreen() {
    var b = S.battle, en = b.enemy, it = E.intent(S), EN = D.ENEMIES[en.id];
    var itText = it.t === 'stress' ? 'ストレス +' + it.n : it.t === 'grow' ? '問題の いきおい +' + it.n : 'モヤモヤが まざる';
    var hpPct = Math.max(0, Math.round(en.hp / en.maxHp * 100));
    var bubble = h('section', { class: 'bubble k-' + en.kind }, [
      h('div', { class: 'ekind', text: (EN.selfFail ? '自分の しっぱい' : EN.trouble ? 'トラブル' : en.kind === 'boss' ? 'ボス' : en.kind === 'elite' ? '大きなかべ' : '課題') + '：' + EN.scene }),
      h('h2', { class: 'ename' }, [en.name, en.kind === 'boss' ? hearts(S.hearts) : null]),
      h('div', { class: 'meter hp' }, [
        h('span', { class: 'lbl', text: '問題の大きさ' }),
        h('div', { class: 'bar' }, [h('div', { class: 'fill', style: 'width:' + hpPct + '%' })]),
        h('b', { text: Math.max(0, en.hp) + '/' + en.maxHp })
      ]),
      h('div', { class: 'intent' }, [h('span', { class: 'lbl', text: 'つぎ' }), h('b', { text: itText })]),
      h('div', { class: 'etags' }, [
        EN.solo ? h('span', { class: 'etag', text: '個人課題' }) : null,
        EN.term === 'short' ? h('span', { class: 'etag', text: 'すぐ来る' }) : null,
        it.passIn ? h('span', { class: 'etag pass', text: 'あと' + it.passIn + 'ターンで 過ぎ去る' }) : null,
        EN.anxiety ? h('span', { class: 'etag', text: b.calm ? 'どきどき（整った）' : 'どきどき' }) : null,
        h('button', { class: 'einfo', 'aria-label': 'くわしく', onclick: function () { infoOpen = true; render(); }, text: '？ くわしく' })
      ])
    ]);
    var monster = h('div', { class: 'monster f' + en.form }, [sprite(SST_SPRITES.enemyKey(EN.art || en.id, en.form), en.form, 'mon')]);
    if (en.form === 2 && root.SST_ILLUST && SST_ILLUST.svg(EN.art || en.id)) { monster.innerHTML = SST_ILLUST.svg(EN.art || en.id); }
    var hero = h('div', { class: 'hero' + (b.guard ? ' shield' : '') }, [
      sprite('hero_' + (D.HEROES[S.hero] ? D.HEROES[S.hero].look : 'hayatsu'), 2, 'me mood' + heroMood(), heroMood()),
      [null, 'あせ…', 'つらい…', 'もう 限界…', '動けない'][heroMood()] ? h('div', { class: 'moodlabel', text: [null, 'あせ…', 'つらい…', 'もう 限界…', '動けない'][heroMood()] }) : null,
      h('div', { class: 'chip guard' + (b.guard ? ' on' : '') }, [h('span', { class: 'lbl', text: '心の準備' }), h('b', { text: String(b.guard) })])
    ]);
    var fx = [];
    if (lastPlay && lastPlay !== shownPlay) {
      shownPlay = lastPlay;
      var pp = (S.popups || []).filter(function (p) { return p.k === 'play'; }).pop();
      var dealt = pp ? pp.solve : 0;
      if (dealt) {
        fx.push(h('div', { class: 'numpop solve', text: '−' + dealt }));
        monster.classList.add('hit');
        monster.appendChild(h('div', { class: 'slash' }));
        for (var sp = 0; sp < 6; sp++) monster.appendChild(h('i', { class: 'spark', style: '--a:' + (sp * 60 + 15) + 'deg' }));
        var bfill = bubble.querySelector('.meter.hp .bar');
        if (bfill && pp.hpMax) bfill.insertBefore(h('div', { class: 'ghost', style: '--w0:' + Math.round(pp.hpFrom / pp.hpMax * 100) + '%;--w1:' + Math.round(pp.hpTo / pp.hpMax * 100) + '%' }), bfill.firstChild);
        bubble.classList.add('dmg');
      } else if (pp && !pp.ok) monster.classList.add('miss');
      if (lastPlay.guard) fx.push(h('div', { class: 'numpop guard', text: '心の準備 +' + lastPlay.guard }));
    }
    var hk = b.lastHit ? (S.floor + ':' + b.lastHit.turn) : '';
    var hitNow = b.lastHit && hk !== lastHitKey && b.lastHit.turn === b.turn - 1;
    if (hitNow) {
      lastHitKey = hk;
      if (b.lastHit.dmg > 0) { fx.push(h('div', { class: 'hurtflash' })); fx.push(h('div', { class: 'numpop stress', text: 'ストレス +' + b.lastHit.dmg })); hero.classList.add('hurt'); }
      if (b.lastHit.blocked) fx.push(h('div', { class: 'numpop block', text: '心の準備で ' + b.lastHit.blocked + ' 受けとめた' }));
    }
    var stage = h('section', { class: 'stage' }, [itemSlots(true), hero, bubble, monster].concat(fx));
    var msgs = h('section', { class: 'msgs', 'aria-live': 'polite' }, b.msgs.filter(function (m) { return !m.play && m.tag !== 'bench'; }).slice(-1).map(function (m) { return h('p', { class: 'm-' + m.tag, text: m.text }); }));
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
        if (sel === i) { var pv = E.preview(S, i); lastPlay = { name: c.name, solve: pv.solve, guard: pv.guard, type: c.type, key: Date.now() }; dropPopups('play'); act(function () { E.playCard(S, i); }); }
        else { sel = i; render(); }
      });
      return el;
    }));
    var help = h('p', { class: 'hint', text: sel >= 0 && E.canPlay(S, sel) ? 'もう一度 タップで 使う' : sel >= 0 ? (E.card(b.hand[sel].id).unplayable ? 'モヤモヤは 使えない' : '元気が たりない／条件が たりない') : 'カードを タップして えらぶ' });
    var end = h('button', { class: 'primary endturn', onclick: function () {
      if (discarding) return;
      // 手札が すて札へ 飛んでいく
      var pile = document.querySelector('.pile.disc'), cards = document.querySelectorAll('.hand .card');
      if (!pile || !cards.length || matchMedia('(prefers-reduced-motion: reduce)').matches) { act(function () { E.endTurn(S); }); return; }
      var pr = pile.getBoundingClientRect();
      discarding = true;
      cards.forEach(function (el, i) {
        var r = el.getBoundingClientRect();
        el.style.setProperty('--dx', (pr.left + pr.width / 2 - (r.left + r.width / 2)) + 'px');
        el.style.setProperty('--dy', (pr.top + pr.height / 2 - (r.top + r.height / 2)) + 'px');
        el.style.animationDelay = (i * 40) + 'ms';
        el.classList.remove('deal'); el.classList.add('discard');
      });
      pile.classList.add('gulp');
      setTimeout(function () { discarding = false; act(function () { E.endTurn(S); }); }, 420 + cards.length * 40);
    }, text: 'ターンを おわる' });
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
    var overs = b.msgs.filter(function (m) { return m.tag === 'bench' && m.text.indexOf('手札が いっぱい') === 0; });
    if (overs.length && moyaKey !== lastOverKey) {
      overs.forEach(function (m, oi) { flies.push(h('div', { class: 'discfly', style: 'animation-delay:' + (oi * 150) + 'ms', text: m.text.replace(/^手札が いっぱいで「(.*)」は すて札へ。$/, '$1') })); });
    }
    lastOverKey = moyaKey;
    var clears = b.msgs.some(function (m) { return m.tag === 'clear'; }) && moyaKey !== lastClearKey ? [h('div', { class: 'moyaclear', text: 'すっきり！' })] : [];
    if (clears.length) lastClearKey = moyaKey;
    return h('main', { class: 'battle' }, flies.concat(clears, [stage, h('div', { class: 'row' }, [energy, msgs, help, end]), h('div', { class: 'handrow' }, [piles, hand, disc])]));
  }

  // --- 報酬 ---
  function rewardScreen() {
    var r = S.reward;
    var lastPop = (S.popups || []).filter(function (p) { return p.k === 'play'; }).pop();
    return h('main', { class: 'reward' }, [
      lastPop && !(S.popups || []).some(function (p) { return p.k === 'heart'; }) ? playPopView(lastPop, true) : null,
      h('h2', { text: r.frozen ? '時間が すぎた…' : r.fled ? 'その場を はなれた' : r.escaped ? '安全な ところへ はなれた！' : r.passed ? '時間が たった' : '乗りこえた！' }),
      r.frozen ? h('p', { class: 'story', text: '動けないまま、時間が すぎた。「' + D.CTX_LABEL[r.frozen.ctx] + '」に 苦手意識が ついた（' + r.frozen.to + '）。この場面では ストレスが 少し ふえる。ストレスは 9割まで さがった。' }) : null,
      r.fled ? h('p', { class: 'story', text: 'にげたので、問題は そのまま のこった（モヤモヤが デッキに 入った）。にげるのが いい場面と、そうでない場面が ある。' }) : null,
      r.escaped ? h('p', { class: 'praise', text: 'あぶない場面では、はなれる・にげる・大人を よぶ が いちばん。自分の 安全を 守れた。' }) : null,
      r.passed ? h('p', { class: 'story', text: r.passed + (r.leave ? '（ストレスが 多すぎて、モヤモヤが デッキに 入った）' : '') }) : null,
      r.endured ? h('p', { class: 'praise', text: '心の準備で たえきった。気もちを 落ちつけて やりすごせたので、モヤモヤは のこらなかった。' }) : null,
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
    if (recalling) {
      var rc = E.recallChoices(S);
      return h('main', { class: 'rest' }, [
        h('h2', { text: '一日を 思い出す' }),
        h('p', { class: 'story', text: 'ねる前に、今日 あったことを 思い出してみた。あの時、こうも できたかも…' }),
        h('div', { class: 'choices' }, rc.map(function (id) {
          var src = (S.seen || []).filter(function (eid) { return (D.ENEMIES[eid].situ || []).indexOf(id) >= 0; }).pop();
          var el = cardView(E.card(id), { showCtx: true });
          var wrap = h('div', { class: 'recall' }, [h('small', { class: 'recallsrc', text: src ? '「' + D.ENEMIES[src].scene + '」の 時を 思い出して' : '' }), el]);
          el.addEventListener('click', function () { recalling = false; act(function () { E.rest(S, 'recall', id); }); });
          return wrap;
        })),
        h('button', { class: 'secondary', onclick: function () { recalling = false; render(); }, text: 'もどる' })
      ]);
    }
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
        h('button', { class: 'primary big', onclick: function () { act(function () { E.rest(S, 'rest'); }); } }, ['家で ゆっくり 休む', h('small', { text: '家族と すごして、ストレスを ' + Math.round(S.maxYoyu * D.RULES.restHeal) + ' へらす。「お家の人に そうだんする」カードが もらえる' })]),
        h('button', { class: 'secondary big', disabled: !E.recallChoices(S).length, onclick: function () { recalling = true; render(); } }, ['一日を 思い出す', h('small', { text: E.recallChoices(S).length ? 'あったことや まわりの 人の ふるまいから、自分の 新しい 選択肢を 考える（カードを 1まい もらう）' : '思い出せる ことが まだ ない' })]),
        h('button', { class: 'secondary big', onclick: function () { removing = true; render(); } }, ['自分を 見つめ直す', h('small', { text: 'いらない くせを 1つ 卒業する' })])
      ])
    ]);
  }

  // --- できごと ---
  // できごとで 何が 変わったか
  function changeChips(c) {
    if (!c) return null;
    var out = [];
    if (c.stress < 0) out.push(h('span', { class: 'fx heal', text: 'ストレス ' + c.stress }));
    if (c.stress > 0) out.push(h('span', { class: 'fx bad', text: 'ストレス +' + c.stress }));
    if (c.trust > 0) out.push(h('span', { class: 'fx trust', text: '信頼 +' + c.trust }));
    if (c.trust < 0) out.push(h('span', { class: 'fx bad', text: '信頼 ' + c.trust }));
    if (c.card) out.push(h('span', { class: 'fx guard', text: 'カード「' + E.card(c.card).name.replace(/^「|」$/g, '') + '」を 手に入れた' }));
    if (c.support) out.push(h('span', { class: 'fx guard', text: 'アイテム「' + D.SUPPORTS[c.support].name + '」を 手に入れた' }));
    if (c.evolved) out.push(h('span', { class: 'fx evo', text: c.evolved.from ? '「' + E.card(c.evolved.from).name + '」が「' + E.card(c.evolved.to).name + '」に しんか！' : 'カード「' + E.card(c.evolved.to).name + '」を 手に入れた' }));
    if (c.curse) out.push(h('span', { class: 'fx bad', text: 'モヤモヤが デッキに 入った' }));
    if (c.slack) out.push(h('span', { class: 'fx bad', text: 'ボスが 少し 大きくなった' }));
    if (!out.length) out.push(h('span', { class: 'fx', text: '変化なし' }));
    return h('div', { class: 'changes' }, [h('b', { text: 'かわったこと' }), h('div', { class: 'fxs' }, out)]);
  }

  function eventScreen() {
    var ev = D.EVENTS[S.event.id], done = S.event.done;
    return h('main', { class: 'event' }, [
      ev.trouble ? h('div', { class: 'troublebadge', text: 'トラブル（さっきの 行動の あとで 起きた）' }) : null,
      ev.unlucky ? h('div', { class: 'troublebadge unlucky', text: 'ふうん：自分の せいでは ないのに、信頼が 下がって しまう できごと' }) : null,
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
          changeChips(S.event.changes),
          S.event.changes && S.event.changes.evolved ? h('div', { class: 'choices evo' }, [cardView(E.card(S.event.changes.evolved.to), { showCtx: true })]) : null,
          h('button', { class: 'primary', onclick: function () { act(function () { E.leaveEvent(S); }); }, text: '次へ' })
        ])
    ]);
  }

  // --- 振り返り ---
  function cardName(id) { var n = E.card(id).name; return n.charAt(0) === '「' ? n : '「' + n + '」'; }
  function whyText(why) {
    if (why === 'start') return 'スタート';
    if (why === 'escape') return 'あぶない場面から はなれた';
    if (why === 'review') return 'そうの おわりに 振り返った';
    if (why === 'recall') return '一日を 思い出した';
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
      items.push(h('li', {}, [h('b', { text: '「' + D.CTX_LABEL[e.ctx] + '」が 苦手に なった（' + e.to + '）' }), h('span', { text: 'ストレスが いっぱいに なる前に、休む・きょりを おく・だれかに そうだん しよう。' })]));
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
      h('p', { class: 'verdict won', text: D.TEXT.win }),
      h('p', { class: 'sub', text: '乗りこえた 課題 ' + sm.overcame + '／動けなかった ' + sm.stuck + '／ボス ' + sm.bossBeaten + ' / ' + sm.acts })
    ].concat(body, [nav]));
  }

  // --- ポップアップ（カードの 結果・ボスが 小さくなる） ---
  var popTimer = null, popTimerKey = null;
  function dropPopups(kind) { S.popups = (S.popups || []).filter(function (p) { return kind ? p.k !== kind : false; }); }
  function playPopView(p, inline) {
    var chips = [];
    if (p.solve) chips.push(h('span', { class: 'fx solve', text: '問題 −' + p.solve }));
    if (p.guard > 0) chips.push(h('span', { class: 'fx guard', text: '心の準備 +' + p.guard }));
    if (p.heal > 0) chips.push(h('span', { class: 'fx heal', text: 'ストレス −' + p.heal }));
    return h('div', { class: 'playpop tone-' + p.tone + (inline ? ' inline' : ''), role: 'status' }, [
      h('div', { class: 'pphead' }, [h('b', { text: '「' + p.name + '」' }), h('span', { class: 'ppres', text: !p.ok ? 'うまく いかなかった' : p.tone === 'bad' ? 'その場は…' : 'うまく いった' })]),
      h('p', { class: 'pptext', text: p.text }),
      chips.length ? h('div', { class: 'fxs' }, chips) : null,
      p.notes && p.notes.length ? h('div', { class: 'ppnotes' }, p.notes.slice(-2).map(function (n) { return h('small', { text: n }); })) : null,
      inline ? null : h('small', { class: 'pptap', text: 'タップで とじる' })
    ]);
  }
  function popupLayer() {
    var ps = S.popups || [];
    if (statHelp) {
      var key2 = statHelp;
      return h('div', { class: 'popwrap modal', onclick: function (e) { if (e.target === e.currentTarget) { statHelp = null; render(); } } }, [h('div', { class: 'heartpop infopop' }, [
        h('div', { class: 'hpttl', text: key2 === 'trust' ? '信頼 ' + S.trust : D.STATS[key2].name + ' ' + S.stats[key2] }),
        h('p', { class: 'story', text: STAT_HELP[key2] }),
        key2 !== 'trust' ? h('p', { class: 'story', text: STAT_HELP.grow }) : null,
        h('button', { class: 'primary', onclick: function () { statHelp = null; render(); }, text: 'とじる' })
      ])]);
    }
    if (infoOpen && S.phase === 'battle') {
      var b2 = S.battle, en2 = b2.enemy, EN2 = D.ENEMIES[en2.id], it2 = E.intent(S);
      var lines = [it2.say + '（' + (it2.t === 'stress' ? 'ストレス +' + it2.n : it2.t === 'grow' ? '問題の いきおい +' + it2.n : 'モヤモヤが まざる') + '）'];
      if (EN2.solo) lines.push('個人課題：自分の 力で とりくむ。相談・協力の カードと アイテムは 使えない。');
      if (EN2.term === 'short') lines.push('すぐに 来る 課題：「時間を かけて」の カード・相談アイテムは 使えない。');
      lines.push(it2.passIn ? 'あと ' + it2.passIn + ' ターン たえれば、時間とともに 過ぎ去る' + (EN2.pass.leave ? '（ストレスが 多いと モヤモヤが のこる）。' : '。') : 'これは 時間が たっても 過ぎ去らない。');
      if (EN2.anxiety) lines.push('どきどきして 力が 出にくい。整えるカードを 使うと、そのターンは ふつうに 効く。');
      if (b2.bench.length) lines.push('この場面に 合わない カード ' + b2.bench.length + 'まいは 控えに 入っている。');
      return h('div', { class: 'popwrap modal', onclick: function (e) { if (e.target === e.currentTarget) { infoOpen = false; render(); } } }, [h('div', { class: 'heartpop infopop' }, [
        h('div', { class: 'hpttl', text: EN2.scene }),
        h('p', { class: 'story', text: EN2.intro }),
        h('ul', { class: 'infolist' }, lines.map(function (l) { return h('li', { text: l }); })),
        h('button', { class: 'primary', onclick: function () { infoOpen = false; render(); }, text: 'とじる' })
      ])]);
    }
    if (!ps.length) return null;
    var warn = ps.filter(function (p) { return p.k === 'warn'; })[0];
    if (warn) {
      return h('div', { class: 'popwrap modal' }, [h('div', { class: 'heartpop warnpop' }, [
        h('div', { class: 'hpttl', text: 'ストレスが 多すぎる！' }),
        h('div', { class: 'popstage' }, [sprite('hero_' + (D.HEROES[S.hero] ? D.HEROES[S.hero].look : 'hayatsu'), 2, 'popboss still', 3)]),
        h('p', { class: 'story', text: 'ストレスが 6わりを こえた。何を しても うまく いかない ことが ふえる。8わりを こえると、パニックで 手が つかなくなる。' }),
        h('p', { class: 'story', text: '休み時間（？マス）や ひと休みで、心を 休めよう。' }),
        h('button', { class: 'primary', onclick: function () { S.popups = S.popups.filter(function (p) { return p !== warn; }); save(); render(); }, text: 'わかった' })
      ])]);
    }
    var heart = ps.filter(function (p) { return p.k === 'heart'; })[0];
    var plays = ps.filter(function (p) { return p.k === 'play'; });
    var play = plays[plays.length - 1];
    if (heart && S.phase !== 'battle') {
      var BE = D.ENEMIES[heart.boss];
      var big = sprite(SST_SPRITES.enemyKey(BE.art || heart.boss, 0), 0, 'popboss');
      big.style.setProperty('--from', heart.from / D.MAP.bossBase); big.style.setProperty('--to', heart.to / D.MAP.bossBase);
      var pct = function (v) { return Math.round(v / D.MAP.bossBase * 100); };
      var bar = h('div', { class: 'bar' }, [h('div', { class: 'fill shrink', style: '--w0:' + pct(heart.from) + '%;--w1:' + pct(heart.to) + '%' })]);
      return h('div', { class: 'popwrap modal' }, [h('div', { class: 'heartpop' }, [
        play ? playPopView(play, true) : null,
        h('div', { class: 'hpttl', text: 'ボス「' + heart.name + '」が 小さくなった！' }),
        h('div', { class: 'popstage' }, [big, h('div', { class: 'heartbreak', text: '♥' })]),
        h('div', { class: 'meter hp' }, [h('span', { class: 'lbl', text: 'ボスの 大きさ' }), bar]),
        h('div', { class: 'hpline' }, [hearts(heart.left)]),
        h('p', { class: 'story', text: heart.left > 0 ? '課題に 向き合うたび、ボスは 弱くなる。あと ' + heart.left + 'つ。' : 'ボスの ハートが ぜんぶ なくなった。じゅんびは ばっちり！' }),
        h('button', { class: 'primary', onclick: function () { S.popups = S.popups.filter(function (p) { return p !== heart && p.k !== 'play'; }); save(); render(); }, text: 'つぎへ' })
      ])]);
    }
    if (!play || S.phase !== 'battle') return null;
    var key = play.card + ':' + play.text + ':' + ps.length + ':' + S.floor;
    if (popTimerKey !== key) {
      popTimerKey = key; clearTimeout(popTimer);
      popTimer = setTimeout(function () { if (S && (S.popups || []).indexOf(play) >= 0) { dropPopups('play'); render(); } }, 4500);
    }
    var el = playPopView(play, false);
    el.addEventListener('click', function () { dropPopups('play'); render(); });
    return h('div', { class: 'popwrap' }, [el]);
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
    else if (S.phase === 'tutorialdone') screen = tutorialDoneScreen();
    else screen = endScreen();
    var cc = coach();
    var pop = popupLayer();
    var kids = cc ? [topBar(), cc, screen] : [topBar(), screen];
    if (pop) kids.push(pop);
    app.replaceChildren.apply(app, kids);
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
