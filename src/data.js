// カード・課題・できごと・文面の正本。数値と文面はここだけで定義する。
// 対象：小学3年。漢字は3年までの配当に寄せ、迷う字はひらがなにする。
(function (root) {
  'use strict';

  var STATS = {
    think: { name: 'かしこさ', verb: '考える' },
    act: { name: '行動', verb: '動く' },
    relate: { name: 'なかま力', verb: '関わる' }
  };

  var CTX_LABEL = { study: 'べんきょう', conflict: 'ぶつかり合い', join: '遊び・なかま', tease: 'からかい', stage: '発表', danger: 'あぶない場面' };

  var TYPE_LABEL = {
    think: '考える', act: '動く', relate: '関わる', calm: '整える',
    impulse: 'しょうどう', basic: 'きほん', curse: 'モヤモヤ'
  };

  // うまくいきやすさ（3段階）。児童には段階を見せず「失敗するかも」とだけ出す（段階の言い分けが分かりにくかったため）
  var CHANCE = {
    high: { p: 0.8, label: '失敗するかも' },
    mid: { p: 0.6, label: '失敗するかも' },
    low: { p: 0.35, label: '失敗するかも' }
  };

  var PLAYER = { maxYoyu: 50, energy: 3, hand: 5, statMax: 5, trustStart: 5, trustMax: 10 };

  var RULES = {
    stressThreshold: 0.3,      // 心の余裕がこの割合未満でカッとなるが手札にまざる
    growthUses: 3,             // 1回の戦いで同じ種類を3回使うと成長
    trustGainCapPerBattle: 2,  // カードによる信頼の上昇は1戦で2まで
    weak: 1.5, resist: 0.5, anxiety: 0.6,
    restHeal: 0.3, dangerChance: 0.25, distanceMul: 0.9, frozenTurns: 2, frozenRecover: 0.1, nigatePer: 8, nigateStress: 2, backfireGrow: 3, moyaDrain: 2, allyTrust: 7, allyGuard: 6, hpScale: 1.7, stressScale: 1.45,
    rewardChoices: 3, rewardChoicesHighTrust: 4, highTrust: 8, lowTrust: 3
  };

  // ctx: そのカードが合う場面。書いていないカードはどの場面でも使える。合わない場面では、その戦いの間 山札から外す
  // judge: good=向社会的・アサーティブ・整える／impulse=しょうどう／neutral=きほん
  // style: 振り返りのアサーション3分類（aggressive/passive/assertive）
  var CARDS = {
    // --- 初期デッキ ---
    try_it: { name: 'トライする', line: 'とにかく 一度 やってみる。', type: 'act', judge: 'neutral', style: 'assertive', cost: 1, solve: 5, ctx: ['study', 'join', 'stage'] },
    endure: { name: 'がまんする', line: 'ぐっと こらえる。', type: 'basic', judge: 'neutral', style: 'passive', cost: 1, guard: 5 },
    breathe: { name: '深こきゅう', line: 'ゆっくり 3回 いきをすう。', type: 'calm', judge: 'good', style: 'assertive', cost: 1, guard: 4, draw: 1 },
    talk: { name: '話してみる', line: '「ねえ、ちょっといい？」', type: 'relate', judge: 'good', style: 'assertive', cost: 1, solve: 4 },
    keep_distance: { name: 'きょりを おく', line: '「ちょっと はなれて、頭を ひやそう」', type: 'calm', judge: 'good', style: 'distance', cost: 1, guard: 6, distance: true },
    run_away: { name: 'その場を はなれる（にげる）', line: 'あぶないと 思ったら、すぐに その場を はなれる。', type: 'act', judge: 'good', style: 'distance', cost: 1, escape: true },
    okoru: { name: '怒る', line: '「もう、なんなの！」と どなる。', type: 'impulse', judge: 'impulse', style: 'aggressive', cost: 0, solve: 9, chance: 'high', trust: -1, curse: true },

    // --- 報酬で手に入るカード ---
    write_plan: { name: 'やることを紙に書く', line: '1. 2. 3. と じゅんばんに書く。', type: 'think', judge: 'good', style: 'assertive', cost: 1, solve: 4, draw: 1, ctx: ['study', 'stage'] },
    their_view: { name: '相手の気もちを考える', line: '「あの子は どう思ったかな？」', type: 'think', judge: 'good', style: 'assertive', cost: 1, guard: 4, organize: true, ctx: ['conflict', 'join', 'tease'] },
    start_now: { name: 'すぐ取りかかる', line: 'あとまわしに しない。', type: 'act', judge: 'good', style: 'assertive', cost: 1, solve: 8, ctx: ['study', 'stage'] },
    move_body: { name: '体を動かして 気分てんかん', line: '休み時間に 外で走る。', type: 'act', judge: 'good', style: 'assertive', cost: 1, heal: 5, exhaust: true },
    together: { name: '「いっしょにやろう」', line: '「いっしょにやろう」と 声をかける。', type: 'relate', judge: 'good', style: 'assertive', cost: 1, solve: 6, trust: 1, chance: 'high', ctx: ['study', 'join'] },
    thanks: { name: '「ありがとう」を つたえる', line: '「さっきは ありがとう」', type: 'relate', judge: 'good', style: 'assertive', cost: 0, guard: 3, trust: 1 },
    apologize: { name: 'あやまる', line: '「さっきは ごめんね」', type: 'relate', judge: 'good', style: 'assertive', cost: 1, solve: 3, trust: 2, ctx: ['conflict', 'join'] },
    lead: { name: 'みんなを まとめる', line: '「じゃあ、じゅんばんに 言っていこう」', type: 'relate', judge: 'good', style: 'assertive', cost: 2, solve: 14, chance: 'mid', req: { relate: 2, trust: 6 }, ctx: ['study', 'join'] },
    sort_out: { name: '状きょうを 整理する', line: '「何が あった？ 自分は どうしたい？」と 書き出す。', type: 'think', judge: 'good', style: 'assertive', cost: 1, guard: 3, draw: 1, organize: true },
    firm_reply: { name: 'きっぱり 言い返す', line: '「そういうことは 言わないで」と 目を見て 言う。', type: 'relate', judge: 'good', style: 'assertive', cost: 1, solve: 10, chance: 'mid', fail: 'walk_away', ctx: ['conflict', 'tease'] },
    name_feeling: { name: '気もちを 言葉にする', line: '「いま、ちょっと くやしい」', type: 'calm', judge: 'good', style: 'assertive', cost: 1, guard: 7 },

    // --- 場面カード（その戦いの間だけ手札に入る） ---
    say_dunno: { name: '「わからない」と言う', line: '「ここが わかりません」', type: 'relate', judge: 'good', style: 'assertive', cost: 1, solve: 8, chance: 'high' },
    ask_next: { name: 'となりの人に 聞く', line: '「ここ、どうやった？」', type: 'relate', judge: 'good', style: 'assertive', cost: 1, solve: 7, chance: 'mid', fail: 'ask_teacher' },
    ask_teacher: { name: '先生に 聞く', line: '「先生、ここを 教えてください」', type: 'relate', judge: 'good', style: 'assertive', cost: 1, solve: 7, chance: 'high' },
    skip_it: { name: 'とばして 次へ', line: 'わからない問題は あとで。', type: 'think', judge: 'neutral', style: 'passive', cost: 1, guard: 4, solve: 2 },

    ask_ok: { name: '「だいじょうぶ？」と聞く', line: '「だいじょうぶ？ いま、ぶつかったよね」', type: 'relate', judge: 'good', style: 'assertive', cost: 1, solve: 6, organize: true, chance: 'high' },
    watch_them: { name: '相手の ようすを見る', line: 'あわてている？ わらっている？', type: 'think', judge: 'good', style: 'assertive', cost: 1, guard: 3, organize: true },
    tell_hurt: { name: '「いたかったよ」と つたえる', line: '「いたかったよ。気をつけてね」', type: 'relate', judge: 'good', style: 'assertive', cost: 1, solve: 8, chance: 'high' },
    hit_back: { name: 'やり返す', line: 'どんっと おし返す。', type: 'impulse', judge: 'impulse', style: 'aggressive', cost: 0, solve: 10, chance: 'high', trust: -2, curse: true },

    let_me_in: { name: '「入れて」と言う', line: '「ねえ、入れて！」', type: 'relate', judge: 'good', style: 'assertive', cost: 1, solve: 10, chance: 'mid', fail: 'next_time' },
    next_time: { name: '「次は 入れてね」', line: '「じゃあ、次は 入れてね」', type: 'relate', judge: 'good', style: 'assertive', cost: 0, solve: 5, chance: 'high' },
    invite_other: { name: 'ほかの遊びに さそう', line: '「おにごっこ しない？」', type: 'relate', judge: 'good', style: 'assertive', cost: 1, solve: 6, trust: 1, chance: 'high' },
    consult: { name: '先生に そうだんする', line: '「先生、ちょっと 聞いてほしいことが あります」', type: 'relate', judge: 'good', style: 'assertive', cost: 1, solve: 7, chance: 'high' },
    sulk: { name: 'ひとりで すねる', line: 'もういいよ、と はなれる。', type: 'impulse', judge: 'impulse', style: 'passive', cost: 0, guard: 8, chance: 'high', trust: -1, curse: true },

    say_stop: { name: '「いやだ」と はっきり言う', line: '「それ、いやだから やめて」', type: 'relate', judge: 'good', style: 'assertive', cost: 1, solve: 9, chance: 'mid', fail: 'walk_away' },
    walk_away: { name: 'その場を はなれる', line: 'だまって 先生の近くへ 行く。', type: 'act', judge: 'good', style: 'assertive', cost: 0, guard: 6, chance: 'high' },
    tell_teacher: { name: '先生に つたえる', line: '「何回も 言われて こまっています」', type: 'relate', judge: 'good', style: 'assertive', cost: 1, solve: 10, chance: 'high', organize: true },

    read_memo: { name: 'メモを見ながら 話す', line: '書いておいたことを 読む。', type: 'think', judge: 'good', style: 'assertive', cost: 1, solve: 9, chance: 'high' },
    breathe_first: { name: '深こきゅうして 始める', line: 'すって、はいて、「はじめます」', type: 'calm', judge: 'good', style: 'assertive', cost: 1, guard: 6 },
    friend_face: { name: '友だちの顔を見る', line: 'うなずいてくれる子を さがす。', type: 'relate', judge: 'good', style: 'assertive', cost: 1, guard: 5, solve: 5, req: { trust: 6 } },
    call_adult: { name: '近くの 大人を よぶ', line: '「たすけてください！」と 大きな声で 言う。', type: 'relate', judge: 'good', style: 'distance', cost: 0, escape: true, trust: 1 },
    run_now: { name: 'すぐに にげる', line: '安全な ところまで 走る。', type: 'act', judge: 'good', style: 'distance', cost: 0, escape: true },
    say_no_stranger: { name: '「行きません」と ことわる', line: '知らない人には ついて行かない。', type: 'relate', judge: 'good', style: 'assertive', cost: 1, guard: 8 },
    ugokenai: { name: '動けない', line: '心の余裕が なくなって、何も できない。', type: 'curse', judge: 'curse', cost: 0, unplayable: true },
    wameku: { name: 'わめく', line: 'ぎゃーっと 大声で わめく。', type: 'impulse', judge: 'impulse', style: 'aggressive', cost: 0, solve: 10, chance: 'high', trust: -2, curse: true },
    junk_advice: { name: '「気にしなきゃ いいじゃん」', line: '友だちの アドバイス。でも、気になるものは 気になる。', type: 'basic', judge: 'neutral', style: 'passive', cost: 1, guard: 1 },
    give_up: { name: '「やっぱり やめる」', line: 'だまって すわってしまう。', type: 'impulse', judge: 'impulse', style: 'passive', cost: 0, guard: 12, chance: 'high', trust: -1, curse: true },

    // --- ストレスで入りこむカード・モヤモヤ ---
    kattonaru: { name: 'カッとなる', line: '頭が まっ白になって 大声を出す。', type: 'impulse', judge: 'impulse', style: 'aggressive', cost: 0, solve: 12, chance: 'high', trust: -2, curse: true, exhaust: true },
    moyamoya: { name: 'モヤモヤ', line: 'あのときのことが 気になって 手につかない。', type: 'curse', judge: 'curse', cost: 0, unplayable: true }
  };

  // アイテム（支え）：つけている（equip）ものは、戦いごとに1回ずつ使える。元気は使わない。なくならない。
  // つけられるのは slots まで。ひと休みで、持っているものと入れかえられる
  var SUPPORTS = {
    teacher: { name: '先生に そうだん', line: '「先生、聞いてほしいことが あります」', note: 'この場面で 先生に すすめられた カードが 手札に入る（戦いのあと 報酬にも出る）。状きょうも 1つ 整理される' },
    friend: { name: '友だちに そうだん', line: '「ねえ、どう思う？」', note: '心の余裕 +5。友だちの アドバイスが カードになる（ときどき 役に立たないことも）', heal: 5 },
    family: { name: 'お家の人に そうだん', line: '帰ってから 話を 聞いてもらう。', note: '心の余裕 +10', heal: 10 },
    book: { name: 'お気に入りの本', line: '好きな 本を 読んで、気もちを 切りかえる。', note: '心の余裕 +4、手札の モヤモヤを すてる', heal: 4, clearMoya: true }
  };
  // 先生がすすめるカード（場面ごと）、友だちのアドバイス（junk はハズレ）
  var TEACHER_CARDS = { study: 'ask_teacher', conflict: 'consult', join: 'consult', tease: 'tell_teacher', stage: 'breathe_first', danger: 'call_adult' };
  var FRIEND_CARDS = ['together', 'thanks', 'invite_other', 'name_feeling', 'firm_reply', 'sort_out'];
  var SUPPORT_RULES = { slots: 3, start: ['teacher'], rewardChance: 0.3, junkChance: 0.3 };

  // 課題の3つの姿：0=こわい かいぶつ／1=現実の姿＋ぶきみな オーラ／2=ふつうの 現実。
  // 整理するカード（organize）で1つずつ現実に近づき、いきおいが弱まる。かしこさが organizeStat 以上なら 1 から始まる
  var FORMS = { stressMul: [1, 0.8, 0.6], organizeStat: 2 };

  var STARTER = ['try_it', 'try_it', 'try_it', 'try_it', 'endure', 'endure', 'endure', 'keep_distance', 'breathe', 'talk', 'okoru', 'run_away'];
  var REWARD_POOL = ['write_plan', 'their_view', 'start_now', 'move_body', 'together', 'thanks', 'apologize', 'lead', 'name_feeling', 'sort_out', 'firm_reply'];

  // pass: そのターン数を乗りこえると、課題は時間とともに過ぎ去る（報酬なし。leave なら モヤモヤが のこる）。
  //   からかい・発表には付けない：放っておいても過ぎ去らない問題があることを残すため
  // moves: stress=心の余裕を n へらす／grow=問題が大きくなる（以後の stress に +n）／worry=モヤモヤを1まい まぜる
  // forms: 3つの姿の名前。view: いちばん現実の姿（2）になった時に わかる ほんとう（相性が変わる）
  var ENEMIES = {
    dunno: {
      forms: ['ハテナ だいまじん', 'むずかしそうな プリント', 'わからない 1問'],
      ctx: 'study', scene: 'わからない問題', name: 'わからない問題', kind: 'normal', hp: 24,
      pass: { turns: 5, say: 'じゅぎょうが おわった。でも、わからないままだ。', leave: true },
      moves: [{ t: 'stress', n: 6, say: 'あせってくる' }, { t: 'grow', n: 2, say: 'どんどん むずかしく見えてくる' }, { t: 'stress', n: 7, say: 'まわりが すすんでいく' }],
      weak: ['relate', 'think'], resist: [], situ: ['say_dunno', 'ask_next', 'skip_it'],
      other: 'となりの子：「聞いてくれたら、すぐ 教えたのに」'
    },
    bumped: {
      forms: ['ドンッと ぶつかる かいぶつ', 'わざと ぶつかってきた？ あの子', 'よそ見して ぶつかっただけ'],
      ctx: 'conflict', scene: 'ろうかで ぶつかられた', name: 'わざと ぶつかられた？', kind: 'normal', hp: 20,
      pass: { turns: 3, say: '時間がたって、気にならなくなった。' },
      moves: [{ t: 'stress', n: 7, say: 'むかむかしてくる' }, { t: 'stress', n: 8, say: '「わざとだ」と思えてくる' }],
      weak: [], resist: ['relate'], backfire: [], situ: ['ask_ok', 'tell_hurt', 'watch_them', 'hit_back'],
      view: { truth: 'benign', name: 'よそ見して ぶつかっただけ', weak: ['relate'], resist: [], backfire: ['impulse'], stressMul: 0.5 },
      other: 'ぶつかった子：「あっ、ごめん！ 前を見てなかった」'
    },
    left_out: {
      forms: ['ひとりぼっちの きり', '入れてくれない グループ？', '人数が ちょうどの 遊び'],
      ctx: 'join', scene: '遊びに 入れない', name: '遊びに 入れない', kind: 'normal', hp: 28,
      pass: { turns: 4, say: '休み時間が おわった。さびしさは 少し のこった。', leave: true },
      moves: [{ t: 'stress', n: 6, say: 'さびしくなる' }, { t: 'worry', say: '「きらわれてる？」と考えてしまう' }, { t: 'stress', n: 8, say: '休み時間が おわっていく' }],
      weak: ['relate'], resist: [], backfire: ['impulse'], situ: ['let_me_in', 'invite_other', 'sulk'],
      other: '遊んでいた子：「人数が ちょうどだったから、気づかなかった」'
    },
    teased: {
      forms: ['チクチクことばの むれ', 'わらっている 子たち', 'くり返し からかわれている'],
      ctx: 'tease', scene: 'からかわれた', name: 'からかわれた', kind: 'elite', hp: 36,
      moves: [{ t: 'stress', n: 7, say: '同じことを また言われる' }, { t: 'grow', n: 3, say: 'まわりも わらいはじめる' }, { t: 'stress', n: 9, say: '学校に 行きたくなくなる' }],
      weak: [], resist: [], backfire: ['impulse'], situ: ['say_stop', 'tell_teacher', 'wameku'],
      view: { truth: 'hostile', name: 'くり返し からかわれている', weak: ['relate'], resist: [], backfire: ['impulse'], stressMul: 1 },
      other: 'あとで 先生：「話してくれて よかった。一人で かかえなくて いいんだよ」'
    },
    presentation: {
      forms: ['見つめる 大目玉', 'こっちを見る みんな', 'ふつうに 聞いている クラスの みんな'],
      ctx: 'stage', scene: 'みんなの前で 発表', name: 'みんなの前で 発表', kind: 'boss', hp: 48, anxiety: true,
      moves: [{ t: 'stress', n: 8, say: '心ぞうが どきどきする' }, { t: 'worry', say: '「まちがえたら どうしよう」' }, { t: 'stress', n: 11, say: 'みんなが こっちを見る' }, { t: 'grow', n: 2, say: '声が 小さくなってくる' }],
      weak: ['think'], resist: [], backfire: [], situ: ['read_memo', 'breathe_first', 'friend_face', 'give_up'],
      other: '聞いていた子：「さいごまで 言えてて すごかった」'
    }
  };

  // あぶない場面（ときどき 課題の代わりに出る）。戦って勝つのは ほぼ無理で、はなれる・にげる・大人をよぶ が正解
  ENEMIES.fight_near = {
    forms: ['あばれる 大あらし', 'もめている 上級生たち', 'ケンカ中の 上級生'],
    ctx: 'danger', scene: '上級生の ケンカに まきこまれそう', kind: 'danger', hp: 80, escapeOk: true,
    moves: [{ t: 'stress', n: 11, say: 'どなり声が 近づいてくる' }, { t: 'grow', n: 4, say: 'まわりも さわぎはじめる' }, { t: 'stress', n: 13, say: 'おされて ころびそう' }],
    weak: [], resist: ['relate', 'think', 'act'], backfire: ['impulse'], situ: ['call_adult', 'run_now'],
    other: '先生：「はなれて 知らせてくれて ありがとう。あぶない ところに 入らなかったのは 正しい」'
  };
  ENEMIES.stranger = {
    forms: ['あまい声の かげ', '知らない 大人？', '帰り道で 声をかけてきた 知らない人'],
    ctx: 'danger', scene: '知らない人に さそわれた', kind: 'danger', hp: 80, escapeOk: true,
    moves: [{ t: 'stress', n: 10, say: '「いいもの あげるよ」と 近づいてくる' }, { t: 'grow', n: 4, say: 'うでを つかまれそう' }, { t: 'stress', n: 12, say: 'まわりに だれも いない' }],
    weak: [], resist: ['relate', 'think', 'act'], backfire: ['impulse'], situ: ['say_no_stranger', 'run_now', 'call_adult'],
    other: 'お家の人：「にげて すぐ 話してくれて、本当に よかった」'
  };

  // effects: trust / yoyu / addCard / curse / growth(stat)
  var EVENTS = {
    forgot: {
      title: 'わすれものに 気づいた朝',
      text: '教室について、算数のノートを わすれたことに 気づいた。',
      options: [
        { label: '先生に 正直に言う', effects: { trust: 1, support: 'teacher' }, result: '「言いに来てくれて ありがとう」と言われた。' },
        { label: 'となりの子に 紙を 一まい もらう', req: { trust: 5 }, effects: { yoyu: 6 }, result: '「いいよ」と すぐ 貸してくれた。' },
        { label: 'だまっておく', effects: { curse: 1 }, result: 'じゅぎょう中、ずっと 気になってしまった。' }
      ]
    },
    friend_trouble: {
      title: '友だちが こまっている',
      text: '給食のあと、友だちが 牛にゅうを こぼして こまっている。',
      options: [
        { label: '「手つだおうか？」と言う', effects: { trust: 2, yoyu: -4, addCard: 'together', support: 'friend' }, result: 'いっしょに ふいた。「ありがとう」と言われた。' },
        { label: '先生を よびに行く', effects: { trust: 1 }, result: '先生が ぞうきんを 持ってきてくれた。' },
        { label: '見なかったことにする', effects: {}, result: 'そのまま 席にもどった。' }
      ]
    },
    second_chance: {
      title: 'やり直しのチャンス',
      text: 'この前 言い合いになった子と、ろうかで 二人きりになった。',
      lowTrustOnly: true,
      options: [
        { label: '「この前は ごめんね」と言う', effects: { trust: 3, support: 'friend' }, result: '「ううん、こっちこそ」と言ってくれた。' },
        { label: 'あいさつだけ する', effects: { trust: 1 }, result: '「おはよう」と 返ってきた。' }
      ]
    }
  };

  // お試し版：4段＋ボス。各段は2マスから1つ選ぶ
  var ACTS = [
    {
      name: '教室',
      rows: [['battle', 'battle'], ['battle', 'event'], ['elite', 'event'], ['rest', 'battle']],
      normals: ['dunno', 'bumped', 'left_out'], dangers: ['fight_near', 'stranger'], elites: ['teased'], boss: 'presentation',
      events: ['forgot', 'friend_trouble']
    }
  ];

  var TEXT = {
    title: 'こころの 冒険',
    lose: 'つかれちゃった。でも、ナイストライ！',
    win: 'さいごまで たどりついた！',
    failCause: ['今日は タイミングが 合わなかった。', '相手の じゅんびが まだだった。', 'こういう日も ある。'],
    curseGained: 'モヤモヤが デッキに 入った。',
    stressIntrude: '心の余裕が へって、「カッとなる」が 手札に まざった。'
  };

  var DATA = { FORMS: FORMS, TEACHER_CARDS: TEACHER_CARDS, FRIEND_CARDS: FRIEND_CARDS, SUPPORTS: SUPPORTS, SUPPORT_RULES: SUPPORT_RULES, CTX_LABEL: CTX_LABEL, STATS: STATS, TYPE_LABEL: TYPE_LABEL, CHANCE: CHANCE, PLAYER: PLAYER, RULES: RULES, CARDS: CARDS, STARTER: STARTER, REWARD_POOL: REWARD_POOL, ENEMIES: ENEMIES, EVENTS: EVENTS, ACTS: ACTS, TEXT: TEXT };
  if (typeof module !== 'undefined' && module.exports) module.exports = DATA;
  else root.SST_DATA = DATA;
})(this);
