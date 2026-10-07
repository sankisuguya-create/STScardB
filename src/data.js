// カード・課題・できごと・文面の正本。数値と文面はここだけで定義する。
// 対象：小学3年。漢字は3年までの配当に寄せ、迷う字はひらがなにする。
(function (root) {
  'use strict';

  var STATS = {
    think: { name: 'かしこさ', verb: '考える' },
    act: { name: '行動', verb: '動く' },
    relate: { name: 'なかま力', verb: '関わる' }
  };

  // term：long＝時間を かけて 効く（相談・計画・練習）。term: 'short' の 課題（テスト・発表など その場で 来るもの）では 控えに 回る／使えない
  var TERM_LABEL = { short: 'すぐ', long: '時間を かけて' };
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

  var PLAYER = { stressStart: 10, statMin: -2, weakFail: 0.2, statPow: 2, overStress: 0.6, overFail: 0.2, panicStress: 0.8, overPanic: 2, maxYoyu: 50, energy: 3, hand: 5, statMax: 5, trustStart: 5, trustMax: 10 };

  var RULES = {
    stressThreshold: 0.3,      // 余裕（＝上限−ストレス）がこの割合未満でカッとなるが手札にまざる
    growthUses: 3,             // 1回の戦いで同じ種類を3回使うと成長
    trustGainCapPerBattle: 2,  // カードによる信頼の上昇は1戦で2まで
    weak: 2.0, resist: 0.35, anxiety: 0.6,
    restHeal: 0.3, rareChance: [0.04, 0.35, 0.45], rareChanceElite: [0.12, 0.8, 0.9], dangerChance: 0.25, distanceMul: 0.9, frozenTurns: 2, frozenRecover: 0.1, nigatePer: 8, nigateStress: 2, backfireGrow: 4, backfireRegrow: 0.7, backfireSolve: 0.5, moyaDrain: 30, panicDrain: 1, allyTrust: 7, allyGuard: 6, hpScale: 1.6, stressScale: 2.6,
    rewardChoices: 2, rewardChoicesHighTrust: 3, highTrust: 8, lowTrust: 3
  };

  // ctx: そのカードが合う場面。書いていないカードはどの場面でも使える。合わない場面では、その戦いの間 山札から外す
  // judge: good=向社会的・アサーティブ・整える／impulse=しょうどう／neutral=きほん
  // style: 振り返りのアサーション3分類（aggressive/passive/assertive）
  var CARDS = {
    // --- 初期デッキ ---
    trial_error: { from: 'try_it', name: 'トライ＆エラーだ！', line: '失敗したら やり方を 変えて、もう一回。', type: 'act', judge: 'good', style: 'assertive', cost: 1, solve: 8, growFail: true, ctx: ['study', 'join', 'stage'] },
    yokkoisho: { from: 'try_it', name: 'よっこいしょ！', line: '重い 気もちを かけ声で もち上げて、取りかかる。', type: 'act', judge: 'good', style: 'assertive', cost: 1, solve: 7, guard: 4, ctx: ['study', 'join', 'stage'] },
    omoshiro: { from: 'try_it', name: '面白く なってきた！', line: 'むずかしいほど 面白い、と 言いかえる。', type: 'act', judge: 'good', style: 'assertive', cost: 1, solve: 7, draw: 1, ctx: ['study', 'join', 'stage'] },
    // --- がまんの 上位（時間を やりすごす）と 目を そらす ---
    no_worry: { from: 'endure', name: '失敗したって 大丈夫', line: '「まちがえても、やり直せば いい」', type: 'calm', judge: 'good', style: 'assertive', cost: 1, guard: 16 },
    later_down: { from: 'endure', name: 'あとで 落ちこめば いい', line: '「今は とりあえず 前を 向こう。くやしいのは あとで」', type: 'calm', judge: 'good', style: 'assertive', cost: 1, guard: 13, draw: 1 },
    switch_on: { from: 'endure', name: '切りかえて いこう', line: '「よし、次！」と 声に 出す。手札の パニックと モヤモヤを 外へ。', type: 'calm', judge: 'good', style: 'assertive', cost: 1, guard: 10, clearPanicAll: true, clearMoya: true },
    look_away: { name: '現実から 目を そらす', line: '「見なかった ことに しよう…」', type: 'impulse', judge: 'impulse', style: 'passive', cost: 0, guard: 22, curse: true },
    try_it: { name: 'トライする', line: 'とにかく 一度 やってみる。', type: 'act', judge: 'neutral', style: 'assertive', cost: 1, solve: 5, ctx: ['study', 'join', 'stage'] },
    endure: { name: 'がまんする', line: 'ぐっと こらえる。', type: 'basic', judge: 'neutral', style: 'passive', cost: 1, guard: 7 },
    breathe: { name: '深こきゅう', line: 'ゆっくり 3回 いきをすう。', type: 'calm', judge: 'good', style: 'assertive', cost: 1, guard: 4, draw: 1 },
    talk: { name: '話してみる', line: '「ねえ、ちょっといい？」', type: 'relate', judge: 'good', style: 'assertive', cost: 1, solve: 4, ctx: ['study', 'conflict', 'join', 'tease'] },
    keep_distance: { name: 'きょりを おく', line: '「ちょっと はなれて、頭を ひやそう」', type: 'calm', judge: 'good', style: 'distance', cost: 1, guard: 6, distance: true, ctx: ['conflict', 'tease', 'join', 'danger'] },
    run_away: { name: 'その場を はなれる（にげる）', line: 'あぶないと 思ったら、すぐに その場を はなれる。', type: 'act', judge: 'good', style: 'distance', cost: 1, escape: true, ctx: ['danger', 'conflict', 'tease'] },
    okoru: { name: '怒る', line: '「もう、なんなの！」と どなる。', type: 'impulse', judge: 'impulse', style: 'aggressive', cost: 1, solve: 9, chance: 'high', trust: -1, curse: true, ctx: ['conflict', 'tease', 'join'] },

    // --- 報酬で手に入るカード ---
    write_plan: { name: 'やることを紙に書く', line: '1. 2. 3. と じゅんばんに書く。', type: 'think', judge: 'good', style: 'assertive', cost: 1, solve: 4, draw: 1, ctx: ['study', 'stage'] },
    their_view: { name: '相手の気もちを考える', line: '「あの子は どう思ったかな？」', type: 'think', judge: 'good', style: 'assertive', cost: 1, guard: 4, organize: true, ctx: ['conflict', 'join', 'tease'] },
    start_now: { name: 'すぐ取りかかる', line: 'あとまわしに しない。', type: 'act', judge: 'good', style: 'assertive', cost: 1, solve: 8, ctx: ['study', 'stage'] },
    move_body: { name: '体を動かして 気分てんかん', line: '休み時間に 外で走る。', type: 'act', judge: 'good', style: 'assertive', cost: 1, guard: 7, exhaust: true, ctx: ['study', 'conflict', 'join', 'tease', 'stage'] },
    together: { coop: true, name: '「いっしょにやろう」', line: '「いっしょにやろう」と 声をかける。', type: 'relate', judge: 'good', style: 'assertive', cost: 1, solve: 6, trust: 1, chance: 'high', ctx: ['study', 'join', 'stage'] },
    thanks: { name: '「ありがとう」を つたえる', line: '「さっきは ありがとう」', type: 'relate', judge: 'good', style: 'assertive', cost: 0, guard: 3, trust: 1, ctx: ['study', 'conflict', 'join', 'stage'] },
    apologize: { name: 'あやまる', line: '「さっきは ごめんね」', type: 'relate', judge: 'good', style: 'assertive', cost: 1, solve: 3, trust: 2, ctx: ['conflict', 'join', 'study', 'tease'] },
    lead: { name: 'みんなを まとめる', line: '「じゃあ、じゅんばんに 言っていこう」', type: 'relate', judge: 'good', style: 'assertive', cost: 2, solve: 14, chance: 'mid', req: { relate: 2, trust: 6 }, ctx: ['study', 'join', 'stage'] },
    sort_out: { name: '状きょうを 整理する', line: '「何が あった？ 自分は どうしたい？」と 書き出す。', type: 'think', judge: 'good', style: 'assertive', cost: 1, guard: 3, draw: 1, organize: true, ctx: ['study', 'conflict', 'join', 'tease', 'stage'] },
    firm_reply: { name: 'きっぱり 言い返す', line: '「そういうことは 言わないで」と 目を見て 言う。', type: 'relate', judge: 'good', style: 'assertive', cost: 1, solve: 10, chance: 'mid', fail: 'walk_away', ctx: ['conflict', 'tease'] },
    name_feeling: { name: '気もちを 言葉にする', line: '「いま、ちょっと くやしい」', type: 'calm', judge: 'good', style: 'assertive', cost: 1, guard: 7, ctx: ['study', 'conflict', 'join', 'tease', 'stage'] },

    // --- 場面カード（その戦いの間だけ手札に入る） ---
    say_dunno: { name: '「わからない」と言う', line: '「ここが わかりません」', type: 'relate', judge: 'good', style: 'assertive', cost: 1, solve: 8, chance: 'high', help: true },
    ask_next: { name: 'となりの人に 聞く', line: '「ここ、どうやった？」', type: 'relate', judge: 'good', style: 'assertive', cost: 1, solve: 7, chance: 'mid', fail: 'ask_teacher', help: true },
    ask_teacher: { name: '先生に 聞く', line: '「先生、ここを 教えてください」', type: 'relate', judge: 'good', style: 'assertive', cost: 1, solve: 7, chance: 'high', ctx: ['study', 'stage'], help: true },
    skip_it: { name: 'とばして 次へ', line: 'わからない問題は あとで。', type: 'think', judge: 'neutral', style: 'passive', cost: 1, guard: 4, solve: 2 },

    ask_ok: { name: '「だいじょうぶ？」と聞く', line: '「だいじょうぶ？ いま、ぶつかったよね」', type: 'relate', judge: 'good', style: 'assertive', cost: 1, solve: 6, organize: true, chance: 'high' },
    watch_them: { name: '相手の ようすを見る', line: 'あわてている？ わらっている？', type: 'think', judge: 'good', style: 'assertive', cost: 1, guard: 3, organize: true },
    tell_hurt: { name: '「いたかったよ」と つたえる', line: '「いたかったよ。気をつけてね」', type: 'relate', judge: 'good', style: 'assertive', cost: 1, solve: 8, chance: 'high' },
    hit_back: { name: 'やり返す', line: 'どんっと おし返す。', type: 'impulse', judge: 'impulse', style: 'aggressive', cost: 1, solve: 10, chance: 'high', trust: -2, curse: true },

    let_me_in: { name: '「入れて」と言う', line: '「ねえ、入れて！」', type: 'relate', judge: 'good', style: 'assertive', cost: 1, solve: 10, chance: 'mid', fail: 'next_time' },
    next_time: { name: '「次は 入れてね」', line: '「じゃあ、次は 入れてね」', type: 'relate', judge: 'good', style: 'assertive', cost: 0, solve: 5, chance: 'high' },
    invite_other: { name: 'ほかの遊びに さそう', line: '「おにごっこ しない？」', type: 'relate', judge: 'good', style: 'assertive', cost: 1, solve: 6, trust: 1, chance: 'high' },
    consult: { name: '先生に そうだんする', line: '「先生、ちょっと 聞いてほしいことが あります」', type: 'relate', judge: 'good', style: 'assertive', cost: 1, solve: 7, chance: 'high', ctx: ['study', 'conflict', 'join', 'tease', 'stage'], help: true, term: 'long' },
    sulk: { name: 'ひとりで すねる', line: 'もういいよ、と はなれる。', type: 'impulse', judge: 'impulse', style: 'passive', cost: 1, guard: 8, chance: 'high', trust: -1, curse: true },

    say_stop: { name: '「いやだ」と はっきり言う', line: '「それ、いやだから やめて」', type: 'relate', judge: 'good', style: 'assertive', cost: 1, solve: 9, chance: 'mid', fail: 'walk_away' },
    walk_away: { name: 'その場を はなれる', line: 'だまって 先生の近くへ 行く。', type: 'act', judge: 'good', style: 'assertive', cost: 0, guard: 6, chance: 'high' },
    tell_teacher: { name: '先生に つたえる', line: '「何回も 言われて こまっています」', type: 'relate', judge: 'good', style: 'assertive', cost: 1, solve: 10, chance: 'high', organize: true, ctx: ['conflict', 'tease', 'danger'], help: true },

    read_memo: { name: 'メモを見ながら 話す', line: '書いておいたことを 読む。', type: 'think', judge: 'good', style: 'assertive', cost: 1, solve: 9, chance: 'high' },
    breathe_first: { name: '深こきゅうして 始める', line: 'すって、はいて、「はじめます」', type: 'calm', judge: 'good', style: 'assertive', cost: 1, guard: 6 },
    friend_face: { name: '友だちの顔を見る', line: 'うなずいてくれる子を さがす。', type: 'relate', judge: 'good', style: 'assertive', cost: 1, guard: 5, solve: 5, req: { trust: 6 } },
    call_adult: { name: '近くの 大人を よぶ', line: '「たすけてください！」と 大きな声で 言う。', type: 'relate', judge: 'good', style: 'distance', cost: 0, escape: true, trust: 1, help: true },
    run_now: { name: 'すぐに にげる', line: '安全な ところまで 走る。', type: 'act', judge: 'good', style: 'distance', cost: 0, escape: true },
    say_no_stranger: { name: '「行きません」と ことわる', line: '知らない人には ついて行かない。', type: 'relate', judge: 'good', style: 'assertive', cost: 1, guard: 8 },
    review_notes: { name: '見直しを する', line: '名前・計算・書きわすれを たしかめる。', type: 'think', judge: 'good', style: 'assertive', cost: 1, solve: 9, organize: true, ctx: ['study'] },
    plan_time: { name: '時間を 決めて やる', line: '「5時から 20分 やる」と 決める。', type: 'think', judge: 'good', style: 'assertive', cost: 1, solve: 6, draw: 1, ctx: ['study'], term: 'long' },
    put_off: { name: 'あとで やる…', line: 'テレビを 見てから…と 先のばし。', type: 'impulse', judge: 'impulse', style: 'passive', cost: 1, guard: 9, chance: 'high', trust: -1, curse: true },
    say_honest: { name: '正直に 言う', line: '「ノートを わすれました」', type: 'relate', judge: 'good', style: 'assertive', cost: 1, solve: 9, trust: 1 },
    borrow: { name: 'となりに かりる', line: '「えんぴつ、かしてくれる？」', type: 'relate', judge: 'good', style: 'assertive', cost: 1, solve: 8, chance: 'high', req: { trust: 5 } },
    hide_it: { name: 'だまって かくす', line: 'わすれたことを だまっておく。', type: 'impulse', judge: 'impulse', style: 'passive', cost: 1, guard: 8, chance: 'high', trust: -1, curse: true },
    tell_feeling: { name: '自分の 気もちを つたえる', line: '「あのとき、悲しかったんだ」', type: 'relate', judge: 'good', style: 'assertive', cost: 1, solve: 10, chance: 'mid', fail: 'apologize' },
    ignore_back: { name: 'むし し返す', line: 'こっちも 口を きかない。', type: 'impulse', judge: 'impulse', style: 'passive', cost: 1, guard: 9, chance: 'high', trust: -1, curse: true },
    ask_meaning: { name: '「どういう いみ？」と 聞く', line: '「それって、どういう いみ？」', type: 'relate', judge: 'good', style: 'assertive', cost: 1, solve: 7, organize: true },
    not_join: { name: '話に のらない', line: '「わたしは いいや」と はなれる。', type: 'relate', judge: 'good', style: 'assertive', cost: 1, guard: 7, solve: 4 },
    spread: { name: 'ほかの子に 言いふらす', line: '「ねえ、聞いて！ あの子がね…」', type: 'impulse', judge: 'impulse', style: 'aggressive', cost: 1, solve: 10, chance: 'high', trust: -2, curse: true },
    practice_again: { name: 'もう一回 れんしゅう', line: '「もう一回 やってみよう」', type: 'act', judge: 'good', style: 'assertive', cost: 1, solve: 9, chance: 'mid', fail: 'ask_tip' },
    ask_tip: { name: 'コツを 聞く', line: '「どうやったら うまく できる？」', type: 'relate', judge: 'good', style: 'assertive', cost: 1, solve: 7, chance: 'high', help: true, term: 'long' },
    quit_it: { name: 'もう やめる', line: '「どうせ できないし」', type: 'impulse', judge: 'impulse', style: 'passive', cost: 1, guard: 9, chance: 'high', trust: -1, curse: true },
    listen_all: { name: 'みんなの 意見を 聞く', line: '「一人ずつ 言ってみよう」', type: 'relate', judge: 'good', style: 'assertive', cost: 1, solve: 6, organize: true },
    vote: { name: '多数決に しよう', line: '「手を あげて 決めよう」', type: 'think', judge: 'good', style: 'assertive', cost: 1, solve: 10, chance: 'mid', fail: 'listen_all' },
    force_own: { name: '自分の 意見を おしつける', line: '「ぜったい こっちが いい！」', type: 'impulse', judge: 'impulse', style: 'aggressive', cost: 1, solve: 10, chance: 'high', trust: -2, curse: true },
    consult_family: { name: 'お家の人に そうだんする', line: '「今日 こんなことが あってね」', type: 'relate', judge: 'good', style: 'assertive', cost: 1, guard: 8, ctx: ['study', 'conflict', 'join', 'tease', 'stage'], help: true, term: 'long' },
    sukkiri: { name: '気もちを 話して すっきり', line: 'もやもやを 言葉にして だれかに 話す。', type: 'calm', judge: 'good', style: 'assertive', cost: 1, guard: 3, clearMoya: true, exhaust: true, ctx: ['study', 'conflict', 'join', 'tease', 'stage'], term: 'long' },
    notice_fault: { sure: true, name: '自分が 悪かった 所に 気づく', line: '「あの時、自分も 言いすぎた…」 使うと「認める」に かわる。手札に のこる。', type: 'basic', judge: 'good', style: 'assertive', cost: 3, solve: 6, retain: true },
    admit_fault: { sure: true, name: '自分が 悪かった 所を 認める', line: '「ぼくも 悪かった」と 自分の 中で 認める。使うと「あやまる」が 手札に。手札に のこる。', type: 'basic', judge: 'good', style: 'assertive', cost: 3, solve: 10, retain: true },
    make_up: { sure: true, name: '仲直り', line: '「また いっしょに 遊ぼう」 けんかが おわる。', type: 'basic', judge: 'good', style: 'assertive', cost: 3, solve: 999 },
    pride: { name: 'プライド', line: '「あやまったら 負けだ」と 思ってしまう。使えず、手札に のこる。整えるカードで 1まい 消える。', type: 'curse', judge: 'curse', cost: 0, unplayable: true, jam: true, retain: true },
    shame: { name: '恥ずかしさ', line: '顔が あつくて 言葉が 出ない。使えず、手札に のこる。整えるカードで 1まい 消える。', type: 'curse', judge: 'curse', cost: 0, unplayable: true, jam: true, retain: true },
    irritation: { name: 'イライラ', line: 'むしゃくしゃが おさまらない。使えず、手札に のこる。ターンの おわりに ストレス +4。整えるカードで 1まい 消える。', type: 'curse', judge: 'curse', cost: 0, unplayable: true, jam: true, retain: true, drainEnd: 4 },
    not_my_fault: { name: '自分は 悪くない！', line: '「むこうが 悪い」「みんなも やってた」と 自分を 守る。', type: 'impulse', judge: 'impulse', style: 'aggressive', cost: 0, guard: 8, trust: -1, curse: true },
    panic: { name: 'パニック', line: '頭が ぐるぐるして 何も 考えられない。使えず、手札を ふさぐ。整えるカードで 1まい 消える。', type: 'curse', judge: 'curse', cost: 0, unplayable: true },
    tataku: { name: 'たたく', line: 'カッとして 手が 出る。', type: 'impulse', judge: 'impulse', style: 'aggressive', cost: 0, solve: 10, chance: 'high', trust: -3, curse: true },
    warukuchi: { name: '悪口を 言い返す', line: '「そっちだって ○○じゃん！」', type: 'impulse', judge: 'impulse', style: 'aggressive', cost: 0, solve: 9, chance: 'high', trust: -2, curse: true },
    // --- 上級カード（成長しないと 報酬に 出ない） ---
    positive_try: { name: 'ポジティブに トライする', line: '「失敗しても、そこから 学べばいい！」', type: 'act', judge: 'good', style: 'assertive', cost: 1, solve: 11, chance: 'mid', growFail: true, guardFail: 6, req: { act: 4 }, adv: true, ctx: ['study', 'join', 'stage'] },
    humor_dodge: { name: 'ギャグにして かわす', line: '「それ、ほめ言葉だと 思っとくね！」と 笑って かわす。', type: 'relate', judge: 'good', style: 'assertive', cost: 1, solve: 12, guard: 6, tame: true, req: { relate: 5, trust: 6 }, adv: true, ctx: ['tease', 'conflict'] },
    big_picture: { name: '先を 見通す', line: '「まず これ、次に これ。そうすれば 間に合う」', type: 'think', judge: 'good', style: 'assertive', cost: 1, solve: 6, organize2: true, draw: 1, req: { think: 5 }, adv: true, ctx: ['study', 'stage', 'join', 'conflict', 'tease'] },
    mediate: { name: '間に 入って 取りもつ', line: '「二人とも、言いたいこと あるよね。じゅんばんに 聞こう」', type: 'relate', judge: 'good', style: 'assertive', cost: 2, solve: 16, trust: 1, req: { relate: 5, think: 3 }, adv: true, ctx: ['conflict', 'join'] },
    calm_master: { name: '自分を 落ちつかせる', line: '「だいじょうぶ。一つずつ やれば いい」と 自分に 言う。', type: 'calm', judge: 'good', style: 'assertive', cost: 1, guard: 12, clearPanicAll: true, req: { think: 4, act: 3 }, adv: true, ctx: ['study', 'stage', 'conflict', 'tease', 'join'] },
    analyse: { name: '原因を 考える', line: '「なんで こうなったんだろう？」と 考えて、手を 打つ。', type: 'think', judge: 'good', style: 'assertive', cost: 1, solve: 9, organize: true, req: { think: 2 }, adv: true, signature: true, ctx: ['study', 'conflict', 'join', 'tease', 'stage'] },
    make_friends: { name: 'だれとでも 話せる', line: '「ねえねえ、それ 何？」と 自然に 話しかける。', type: 'relate', judge: 'good', style: 'assertive', cost: 1, solve: 9, trust: 1, draw: 1, req: { relate: 2 }, adv: true, signature: true, ctx: ['study', 'conflict', 'join', 'tease', 'stage'] },
    dash: { name: 'すぐに 動いて 片づける', line: '考えるより 先に 体が 動く。', type: 'act', judge: 'good', style: 'assertive', cost: 1, solve: 14, req: { act: 2 }, adv: true, signature: true, ctx: ['study', 'join', 'stage'] },
    show_by_doing: { name: '行動で 見せる', line: '言葉より 先に、自分から やってみせる。', type: 'act', judge: 'good', style: 'assertive', cost: 1, solve: 10, guard: 8, trust: 1, req: { act: 5 }, adv: true, ctx: ['study', 'conflict', 'join', 'stage'] },
    reframe: { name: '見方を 切りかえる', line: '「ピンチは チャンス かも」と 考えなおす。', type: 'think', judge: 'good', style: 'assertive', cost: 1, guard: 6, formTo2: true, req: { think: 4 }, adv: true, ctx: ['study', 'conflict', 'join', 'tease', 'stage'] },
    prepare: { name: '前の日に 準備する', line: '明日の ことを 考えて、今日の うちに そろえておく。', type: 'think', judge: 'good', style: 'assertive', cost: 2, solve: 20, req: { think: 5 }, adv: true, ctx: ['study', 'stage'], term: 'long' },
    self_check: { name: 'ふり返って 次に 生かす', line: '「さっきは ここが よくなかった。次は こうしよう」', type: 'think', judge: 'good', style: 'assertive', cost: 1, solve: 7, draw: 2, req: { think: 4, relate: 2 }, adv: true, ctx: ['study', 'conflict', 'join', 'tease', 'stage'], term: 'long' },
    ally_up: { name: '味方を つくる', line: '「いっしょに いてくれる？」と たのんで、そばに いてもらう。', type: 'relate', judge: 'good', style: 'assertive', cost: 1, guard: 12, trust: 1, req: { relate: 4 }, adv: true, ctx: ['conflict', 'join', 'tease', 'stage'] },
    listen_deep: { name: 'じっくり 話を 聞く', line: '口を はさまずに、さいごまで 聞く。', type: 'relate', judge: 'good', style: 'assertive', cost: 1, solve: 12, organize: true, req: { relate: 5 }, adv: true, ctx: ['conflict', 'join', 'tease'] },
    ask_well: { name: '上手に 助けを たのむ', line: '「ここが こまってるから、ここだけ 手伝って」', type: 'relate', judge: 'good', style: 'assertive', cost: 1, solve: 8, draw: 2, req: { relate: 4, think: 2 }, adv: true, ctx: ['study', 'join', 'stage', 'conflict'], help: true },
    routine: { name: '毎日 コツコツ', line: '少しずつ、毎日 つづける。', type: 'act', judge: 'good', style: 'assertive', cost: 0, solve: 7, energy: 1, req: { act: 4 }, adv: true, ctx: ['study', 'stage'], term: 'long' },
    brave_step: { name: '勇気を 出して 一歩', line: 'こわいけど、自分から 一歩 前に 出る。', type: 'act', judge: 'good', style: 'assertive', cost: 1, solve: 16, chance: 'mid', growFail: true, req: { act: 5 }, adv: true, ctx: ['study', 'conflict', 'join', 'tease', 'stage'] },
    safe_route: { name: '安全な 道を えらぶ', line: '人の 多い 明るい 道を 通って、大人の いる ところへ。', type: 'act', judge: 'good', style: 'distance', cost: 0, escape: true, req: { act: 4 }, adv: true, ctx: ['danger'] },
    // --- 元気2・3の カード（大きく 効く） ---
    teamwork: { coop: true, name: '役わりを 分ける', line: '「わたしは 調べる、きみは 書く」', type: 'relate', judge: 'good', style: 'assertive', cost: 2, solve: 15, trust: 1, ctx: ['study', 'join', 'stage'] },
    reset_mind: { name: 'じっくり 気もちを 立て直す', line: '水を 飲んで、深こきゅうして、もう一度 考える。', type: 'calm', judge: 'good', style: 'assertive', cost: 2, guard: 16, clearMoya: true, ctx: ['study', 'conflict', 'join', 'tease', 'stage'] },
    all_in: { name: '全力で 取り組む', line: 'ほかの ことは 後回し。これ 一つに 集中！', type: 'act', judge: 'good', style: 'assertive', cost: 3, solve: 26, ctx: ['study', 'join', 'stage'] },
    class_talk: { name: '学級会で 話し合う', line: '「クラスの みんなで 決まりを 考えよう」', type: 'relate', judge: 'good', style: 'assertive', cost: 3, solve: 22, trust: 2, organize: true, ctx: ['conflict', 'join', 'tease'] },
    full_plan: { name: '計画を 立てて やりきる', line: '何を、いつ、どれだけ やるか 決めて、さいごまで やる。', type: 'think', judge: 'good', style: 'assertive', cost: 3, solve: 18, guard: 10, ctx: ['study', 'stage'] },
    ugokenai: { name: '動けない', line: 'ストレスが いっぱいで、何も できない。', type: 'curse', judge: 'curse', cost: 0, unplayable: true },
    wameku: { name: 'わめく', line: 'ぎゃーっと 大声で わめく。', type: 'impulse', judge: 'impulse', style: 'aggressive', cost: 1, solve: 10, chance: 'high', trust: -2, curse: true },
    junk_advice: { name: '「気にしなきゃ いいじゃん」', line: '友だちの アドバイス。でも、気になるものは 気になる。', type: 'basic', judge: 'neutral', style: 'passive', cost: 1, guard: 1 },
    give_up: { name: '「やっぱり やめる」', line: 'だまって すわってしまう。', type: 'impulse', judge: 'impulse', style: 'passive', cost: 1, guard: 12, chance: 'high', trust: -1, curse: true },

    // --- ストレスで入りこむカード・モヤモヤ ---
    kattonaru: { name: 'カッとなる', line: '頭が まっ白になって 大声を出す。', type: 'impulse', judge: 'impulse', style: 'aggressive', cost: 0, solve: 12, chance: 'high', trust: -2, curse: true, exhaust: true },
    moyamoya: { name: 'モヤモヤ', line: 'あのときのことが 気になって 手につかない。', type: 'curse', judge: 'curse', cost: 0, unplayable: true }
  };

  // アイテム（支え）：つけている（equip）ものは、戦いごとに1回ずつ使える。元気は使わない。なくならない。
  // つけられるのは slots まで。ひと休みで、持っているものと入れかえられる
  var SUPPORTS = {
    teacher: { help: true, name: '先生に そうだん', line: '「先生、聞いてほしいことが あります」', note: 'この場面で 先生に すすめられた カードが 手札に入る（戦いのあと 報酬にも出る）。状きょうも 1つ 整理される', term: 'long' },
    friend: { help: true, name: '友だちに そうだん', line: '「ねえ、どう思う？」', note: '心の準備 +5。友だちの アドバイスが カードになる（ときどき 役に立たないことも）', guard: 5 },
    family: { help: true, name: 'お家の人に そうだん', line: '帰ってから 話を 聞いてもらう。', note: '心の準備 +10', guard: 10, term: 'long' },
    diary: { name: '日記を 書く', line: '今日の ことを ノートに 書く。', note: 'モヤモヤを 1まい デッキから けす', purgeMoya: true, term: 'long' },
    book: { name: 'お気に入りの本', line: '好きな 本を 読んで、気もちを 切りかえる。', note: '心の準備 +4、手札の モヤモヤを すてる', guard: 4, clearMoya: true, term: 'long' }
  };
  // 先生がすすめるカード（場面ごと）、友だちのアドバイス（junk はハズレ）
  var TEACHER_CARDS = { study: 'ask_teacher', conflict: 'consult', join: 'consult', tease: 'tell_teacher', stage: 'breathe_first', danger: 'call_adult' };
  var FRIEND_CARDS = ['together', 'thanks', 'invite_other', 'name_feeling', 'firm_reply', 'sort_out'];
  var SUPPORT_RULES = { slots: 3, start: ['teacher'], rewardChance: 0.3, junkChance: 0.3 };

  // 課題の3つの姿：0=こわい かいぶつ／1=現実の姿＋ぶきみな オーラ／2=ふつうの 現実。
  // 整理するカード（organize）で1つずつ現実に近づき、いきおいが弱まる。かしこさが organizeStat 以上なら 1 から始まる
  var FORMS = { stressMul: [1, 0.8, 0.6], organizeStat: 2 };

  // 問題行動（しょうどうカード）と、そのあと 道に 関係なく 起きる トラブル。強い順
  var TROUBLE_OF = {
    tataku: 'trouble_hit', hit_back: 'trouble_hit',
    spread: 'trouble_rumor', warukuchi: 'trouble_rumor',
    okoru: 'trouble_yell', wameku: 'trouble_yell', kattonaru: 'trouble_yell', force_own: 'trouble_yell',
    sulk: 'trouble_withdraw', hide_it: 'trouble_withdraw', put_off: 'trouble_withdraw', ignore_back: 'trouble_withdraw', give_up: 'trouble_withdraw', quit_it: 'trouble_withdraw'
  };
  var TROUBLE_RANK = ['trouble_hit', 'trouble_rumor', 'trouble_yell', 'trouble_withdraw'];

  var ADVANCED = ['positive_try', 'humor_dodge', 'big_picture', 'mediate', 'calm_master', 'analyse', 'make_friends', 'dash', 'show_by_doing', 'reframe', 'prepare', 'self_check', 'ally_up', 'listen_deep', 'ask_well', 'routine', 'brave_step', 'safe_route'];
  // レアカードの 系統（かしこさ系・社交系・実働系）
  var RARE_LINE = { think: 'かしこさ系', relate: '社交系', act: '実働系', calm: 'かしこさ系' };

  // 主人公：はじめの成長・maxYoyu（ストレスの上限は これ＋10）・とくいカード
  // ctxMod：その場面の 課題の 問題の大きさ・ストレスに かける（1より小さいと 楽、大きいと きびしい）
  var HEROES = {
    hanoko: { name: 'A', note: 'かしこいが 運動は にがて', stats: { think: 2, act: -1, relate: 1 }, maxYoyu: 50, cards: ['analyse', 'write_plan'], look: 'hanoko',
      ctxMod: { study: 0.8, conflict: 1.1, join: 1.3, tease: 1.1, stage: 1.9, danger: 1.4 }, good: 'べんきょう', bad: '発表・練習' },
    tario: { name: 'B', note: '社交的だが 勉強は にがて', stats: { think: -1, act: 1, relate: 2 }, maxYoyu: 50, cards: ['make_friends', 'together'], look: 'tario',
      ctxMod: { study: 1.4, conflict: 0.7, join: 0.6, tease: 0.75, stage: 1.0, danger: 1.0 }, good: '友だち・遊び', bad: 'べんきょう' },
    musuhi: { name: 'C', note: '運動は とくいだが 人づきあいは にがて', stats: { think: 1, act: 2, relate: -1 }, maxYoyu: 50, cards: ['dash', 'start_now'], look: 'musuhi',
      ctxMod: { study: 1.0, conflict: 1.6, join: 1.6, tease: 1.5, stage: 0.6, danger: 0.65 }, good: '発表・練習・あぶない場面', bad: '友だち・からかい' },
    hayatsu: { name: 'D', note: '何でも できるが、一度 つまずくと なかなか 立ち直れない', stats: { think: 2, act: 2, relate: 2 }, maxYoyu: 50, cards: ['sort_out'], look: 'hayatsu',
      ctxMod: { study: 1.0, conflict: 1.0, join: 1.0, tease: 1.0, stage: 1.0, danger: 1.0 }, good: 'どれも とくい', bad: 'ピンチに 弱い（マイナスカードに 弱い）',
      fragile: { pinch: 0.4, healMul: 0.5, frozenRecover: 0.05, nigateMul: 2, moyaMul: 2, panicDrain: 3, stressThreshold: 0.45, slumpBattles: 3, slumpPanic: 2 } },
    kitori: { name: 'E', note: '何を やっても うまく いかない。でも、まわりを たよる ことは できる', stats: { think: -1, act: -1, relate: -1 }, maxYoyu: 40, cards: ['consult', 'consult_family', 'ask_teacher', 'say_dunno'], look: 'kitori',
      ctxMod: { study: 1.5, conflict: 1.5, join: 1.5, tease: 1.5, stage: 1.5, danger: 1.5 }, good: 'まわりを たよる こと（相談カード・アイテムが 強い）', bad: 'ぜんぶの 場面',
      items: ['teacher', 'friend', 'family'], helpBoost: 1.35, helpSafe: true,
      message: 'こういう 人も いる。たよる ことは 弱さじゃない。' },
    zeta: { name: 'Z', note: 'すべて ふつう', stats: { think: 0, act: 0, relate: 0 }, maxYoyu: 50, cards: [], look: 'plain',
      ctxMod: { study: 1.0, conflict: 1.0, join: 1.0, tease: 1.0, stage: 1.0, danger: 1.0 }, good: 'とくに なし', bad: 'とくに なし' }
  };


  var STARTER = ['try_it', 'try_it', 'try_it', 'try_it', 'endure', 'endure', 'endure', 'keep_distance', 'breathe', 'talk', 'okoru', 'run_away'];
  var REWARD_POOL = ['no_worry', 'later_down', 'switch_on', 'look_away', 'write_plan', 'their_view', 'start_now', 'move_body', 'together', 'thanks', 'apologize', 'lead', 'name_feeling', 'sort_out', 'firm_reply', 'plan_time', 'sukkiri', 'review_notes', 'teamwork', 'reset_mind', 'all_in', 'class_talk', 'full_plan'];

  // pass: そのターン数を乗りこえると、課題は時間とともに過ぎ去る（報酬なし。leave なら モヤモヤが のこる）。
  //   からかい・発表には付けない：放っておいても過ぎ去らない問題があることを残すため
  // moves: stress=ストレスを n ふやす／grow=問題が大きくなる（以後の stress に +n）／worry=モヤモヤを1まい まぜる
  // forms: 3つの姿の名前。view: いちばん現実の姿（2）になった時に わかる ほんとう（相性が変わる）
  var ENEMIES = {
    dunno: {
      term: 'short',
      intro: '算数の じゅぎょう中。黒板の 問題を 見ても、どうやって とけば いいのか わからない。まわりの 子は どんどん ノートに 書いている…',
      forms: ['ハテナ だいまじん', 'むずかしそうな プリント', 'わからない 1問'],
      ctx: 'study', scene: 'わからない問題', name: 'わからない問題', kind: 'normal', hp: 24,
      pass: { turns: 3, say: 'じゅぎょうが おわった。でも、わからないままだ。', leave: true },
      moves: [{ t: 'stress', n: 6, say: 'あせってくる' }, { t: 'grow', n: 2, say: 'どんどん むずかしく見えてくる' }, { t: 'stress', n: 7, say: 'まわりが すすんでいく' }],
      weak: ['relate', 'think'], resist: [], situ: ['say_dunno', 'ask_next', 'skip_it'],
      other: 'となりの子：「聞いてくれたら、すぐ 教えたのに」'
    },
    bumped: {
      term: 'short',
      intro: '休み時間、ろうかを 歩いていたら、うしろから ドンッと ぶつかられた。かたが いたい。「わざと？」と 思った しゅんかん、むかっと した。',
      forms: ['ドンッと ぶつかる かいぶつ', 'わざと ぶつかってきた？ あの子', 'よそ見して ぶつかっただけ'],
      ctx: 'conflict', scene: 'ろうかで ぶつかられた', name: 'わざと ぶつかられた？', kind: 'normal', hp: 20,
      pass: { turns: 3, say: '時間がたって、気にならなくなった。' },
      moves: [{ t: 'smear', n: 2, card: 'kattonaru', say: 'むかっとして、頭に 血が のぼる（カードが「カッとなる」に ぬりつぶされる）' }, { t: 'inject', card: 'tataku', say: '手が 出そうに なる（たたく が まざる）' }, { t: 'stress', n: 7, say: 'むかむかしてくる' }, { t: 'stress', n: 8, say: '「わざとだ」と思えてくる' }],
      weak: [], resist: ['relate'], backfire: [], situ: ['ask_ok', 'tell_hurt', 'watch_them', 'hit_back'],
      view: { truth: 'benign', name: 'よそ見して ぶつかっただけ', weak: ['relate'], resist: [], backfire: ['impulse'], stressMul: 0.5 },
      other: 'ぶつかった子：「あっ、ごめん！ 前を見てなかった」'
    },
    left_out: {
      intro: '昼休み、校庭で みんなが おにごっこを している。「入れて」と 言いたいけど、なかなか 声が 出ない…',
      forms: ['ひとりぼっちの きり', '入れてくれない グループ？', '人数が ちょうどの 遊び'],
      ctx: 'join', scene: '遊びに 入れない', name: '遊びに 入れない', kind: 'normal', hp: 28,
      pass: { turns: 3, say: '休み時間が おわった。さびしさは 少し のこった。', leave: true },
      moves: [{ t: 'stress', n: 6, say: 'さびしくなる' }, { t: 'worry', say: '「きらわれてる？」と考えてしまう' }, { t: 'stress', n: 8, say: '休み時間が おわっていく' }],
      weak: ['relate'], resist: [], backfire: ['impulse'], situ: ['let_me_in', 'invite_other', 'sulk'],
      other: '遊んでいた子：「人数が ちょうどだったから、気づかなかった」'
    },
    teased: {
      intro: 'このごろ、同じ 子たちに 何回も 同じことを 言われて わらわれる。今日も また 始まった。',
      forms: ['チクチクことばの むれ', 'わらっている 子たち', 'くり返し からかわれている'],
      ctx: 'tease', scene: 'からかわれた', name: 'からかわれた', kind: 'elite', hp: 36,
      moves: [{ t: 'smear', n: 2, card: 'wameku', say: 'くやしくて、気もちが あふれそう（カードが「わめく」に ぬりつぶされる）' }, { t: 'inject', card: 'warukuchi', say: '言い返したく なる（悪口が まざる）' }, { t: 'stress', n: 7, say: '同じことを また言われる' }, { t: 'grow', n: 3, say: 'まわりも わらいはじめる' }, { t: 'stress', n: 9, say: '学校に 行きたくなくなる' }],
      weak: [], resist: [], backfire: ['impulse'], situ: ['say_stop', 'tell_teacher', 'wameku'],
      view: { truth: 'hostile', name: 'くり返し からかわれている', weak: ['relate'], resist: [], backfire: ['impulse'], stressMul: 1 },
      other: 'あとで 先生：「話してくれて よかった。一人で かかえなくて いいんだよ」'
    },
    presentation: {
      term: 'short',
      intro: '今日は 学習発表会。ぶたいの そでから 見ると、体育館に 人が いっぱい。次は 自分の 番だ。',
      forms: ['見つめる 大目玉', 'こっちを見る みんな', 'ふつうに 聞いている クラスの みんな'],
      pass: { turns: 4, say: '発表の 時間が すぎた。言えなかった ことが のこった。', leave: true }, ctx: 'stage', scene: 'みんなの前で 発表', name: 'みんなの前で 発表', kind: 'boss', hp: 42, anxiety: true,
      moves: [{ t: 'stress', n: 7, say: '心ぞうが どきどきする' }, { t: 'inject', card: 'panic', say: '頭が まっ白に なりそう（パニックが まざる）' }, { t: 'stress', n: 9, say: 'みんなが こっちを見る' }, { t: 'worry', say: '「まちがえたら どうしよう」' }, { t: 'grow', n: 2, say: '声が 小さくなってくる' }],
      weak: ['think'], resist: [], backfire: [], situ: ['read_memo', 'breathe_first', 'friend_face', 'give_up'],
      other: '聞いていた子：「さいごまで 言えてて すごかった」'
    }
  };

  // ===== 層ごとの ボスと 関連する課題 =====
  ENEMIES.test = {
      term: 'short',
      intro: '今日は 算数の テスト。つくえの 上に テスト用紙が くばられた。「はじめ」の 声が かかる。',
    forms: ['100点の 大まじん', 'むずかしそうな テスト用紙', 'いつもの 小テスト'],
    solo: true, pass: { turns: 4, say: 'テストの 時間が おわった。とけなかった 問題が 頭に のこる。', leave: true }, ctx: 'study', scene: 'テスト', kind: 'boss', hp: 42,
    moves: [{ t: 'stress', n: 7, say: '時間が どんどん へっていく' }, { t: 'inject', card: 'panic', say: '頭が まっ白に なりそう（パニックが まざる）' }, { t: 'stress', n: 9, say: 'まわりの えんぴつの 音が 気になる' }, { t: 'worry', say: '「わからない 問題が ある…」' }],
    weak: ['think'], resist: [], backfire: [], situ: ['review_notes', 'breathe_first', 'give_up'],
    other: '先生：「さいごまで あきらめずに 見直したね」'
  };
  ENEMIES.homework = {
      intro: '気づいたら、今日までの 提出物が 大量に たまっている…。漢字ドリル、計算プリント、音読カード。どれから 手を つけよう。',
    forms: ['しゅくだい 大なだれ', 'つみ上がった プリント', '今日の 宿題 2まい'],
    solo: true, ctx: 'study', scene: '宿題の 山', kind: 'normal', hp: 26,
    moves: [{ t: 'stress', n: 6, say: '「まだ こんなに ある…」' }, { t: 'grow', n: 2, say: 'ねる時間が 近づく' }, { t: 'stress', n: 7, say: 'あそびたい 気もちが じゃまをする' }],
    weak: ['think', 'act'], resist: [], backfire: [], situ: ['plan_time', 'put_off'],
    other: 'お家の人：「先に やって えらいね」'
  };
  ENEMIES.forgot_item = {
      term: 'short',
      intro: '朝、教室に ついて ランドセルを 開けたら…ノートが ない！ 1時間目は その ノートを 使う じゅぎょうだ。',
    forms: ['なくしものの ぬま', '空っぽの ランドセル', 'ノートを わすれた 朝'],
    ctx: 'study', scene: 'わすれもの', kind: 'normal', hp: 18, pass: { turns: 3, say: '一日 なんとか すごした。でも、言えないままだった。', leave: true },
    moves: [{ t: 'stress', n: 6, say: '「どうしよう…」' }, { t: 'stress', n: 6, say: 'じゅぎょうが 始まる' }],
    weak: ['relate'], resist: [], backfire: ['impulse'], situ: ['say_honest', 'borrow', 'hide_it'],
    other: '先生：「言いに来てくれて ありがとう。次から 気をつけようね」'
  };
  ENEMIES.friend_fight = {
      intro: 'きのう、なかよしの 友だちと 言い合いに なった。今日は 朝から 一度も 目を 合わせてくれない。',
    forms: ['ギザギザ ハートの 竜', '目を 合わせない 友だち', 'なかなおり したい 友だち'],
    chain: { start: 'notice_fault', steps: { notice_fault: 'admit_fault', admit_fault: 'apologize' }, finale: 'apologize', win: 'make_up', reward: { cards: ['listen_deep', 'mediate'], stat: 'relate', trust: 2 } }, ctx: 'conflict', scene: '友だちと 大げんか', kind: 'boss', hp: 55,
    moves: [{ t: 'smear', n: 2, card: 'kattonaru', say: 'むかっとして、頭に 血が のぼる（カードが「カッとなる」に ぬりつぶされる）' }, { t: 'inject', card: 'tataku', say: '手が 出そうに なる（たたく が まざる）' }, { t: 'stress', n: 9, say: '口を きいて くれない' }, { t: 'grow', n: 3, say: 'ほかの子も まきこまれる' }, { t: 'stress', n: 10, say: 'さびしくて むかむかする' }, { t: 'worry', say: '「もう 友だちじゃ ないのかな」' }],
    weak: [], resist: ['relate'], backfire: ['impulse'], situ: ['tell_feeling', 'keep_distance', 'ignore_back'],
    view: { truth: 'benign', weak: ['relate'], resist: [], backfire: ['impulse'], stressMul: 0.8 },
    other: '友だち：「じつは こっちも あやまりたかった」'
  };
  ENEMIES.misunder = {
      intro: '友だちに 言われた 一言が 気に なる。「それって、どういう いみ？」 なんだか 悪く 言われた 気が する。',
    forms: ['もやもや 二面ぐも', 'ちがう話を している 二人', '言い方の ちがい'],
    ctx: 'conflict', scene: 'かんちがい', pass: { turns: 4, say: '時間が たって、うやむやに なった。でも 気まずさは のこった。', leave: true }, kind: 'normal', hp: 24,
    moves: [{ t: 'stress', n: 7, say: '「なんで そんなこと 言うの」' }, { t: 'grow', n: 2, say: '話が どんどん ずれていく' }],
    weak: [], resist: ['relate'], backfire: ['impulse'], situ: ['ask_meaning', 'okoru'],
    view: { truth: 'benign', weak: ['relate'], resist: [], backfire: ['impulse'], stressMul: 0.6 },
    other: '友だち：「あ、そういう いみじゃ なかったんだ！」'
  };
  ENEMIES.rumor = {
      intro: 'トイレの 前で、何人かが ひそひそ 話を している。自分の 名前が 聞こえた 気が した…',
    forms: ['ひそひそ こうもり', 'こそこそ 話す 子たち', 'ただの うわさ話'],
    ctx: 'tease', scene: 'かげ口を 聞いた', pass: { turns: 4, say: 'うわさは 聞こえなくなった。でも 気には なっている。', leave: true }, kind: 'normal', hp: 24,
    moves: [{ t: 'inject', card: 'warukuchi', say: '言い返したく なる（悪口が まざる）' }, { t: 'stress', n: 7, say: '聞こえないように 話している' }, { t: 'worry', say: '「自分の ことかも…」' }, { t: 'stress', n: 8, say: 'うわさが 広がっていく' }],
    weak: ['relate'], resist: [], backfire: ['impulse'], situ: ['not_join', 'tell_teacher', 'spread'],
    other: '先生：「話に のらずに いてくれて ありがとう」'
  };
  ENEMIES.practice = {
      intro: '発表会の 練習。何回 やっても、同じ ところで まちがえてしまう。本番まで あと少し。',
    forms: ['しっぱい ループ大へび', '何度も つまずく 練習', 'あと少しの 練習'],
    ctx: 'stage', scene: '練習が うまくいかない', pass: { turns: 4, say: '練習の 時間が おわった。不安は のこったまま。', leave: true }, kind: 'normal', hp: 28,
    moves: [{ t: 'stress', n: 7, say: 'また まちがえた' }, { t: 'grow', n: 2, say: '本番が 近づく' }, { t: 'stress', n: 8, say: '「みんなは できてるのに」' }],
    weak: ['act'], resist: [], backfire: [], situ: ['practice_again', 'quit_it'],
    other: '先生：「くり返し 練習したから、できるように なったね」'
  };
  ENEMIES.team = {
      intro: 'グループで 発表の テーマを 決める 時間。みんな 言いたいことが ちがって、話が まとまらない。',
    forms: ['バラバラ 四つ頭', '言い合う グループ', '意見が ちがう だけの なかま'],
    ctx: 'join', scene: 'グループで 意見が 合わない', pass: { turns: 4, say: '時間ぎれで、先生が テーマを 決めた。', leave: true }, kind: 'normal', hp: 30,
    moves: [{ t: 'stress', n: 7, say: 'みんな 自分の 意見を ゆずらない' }, { t: 'grow', n: 2, say: '時間が なくなっていく' }, { t: 'stress', n: 8, say: '声が 大きくなる' }],
    weak: [], resist: ['impulse'], backfire: ['impulse'], situ: ['listen_all', 'vote', 'force_own'],
    view: { truth: 'benign', weak: ['relate', 'think'], resist: [], backfire: ['impulse'], stressMul: 0.7 },
    other: 'グループの子：「みんなの 意見が 入って よかった」'
  };


  // ===== トラブル課題（衝動的な 行動が 多いほど ？マスで 出やすい）=====
  ENEMIES.payback = {
    trouble: true, art: 'bumped',
    intro: 'この前 カッと なって やり返した 子が、今日は こっちを にらんでいる。「この前の、おぼえてるからな」',
    forms: ['しかえし 火の玉', 'にらんでくる あの子', 'まだ おこっている 子'],
    ctx: 'conflict', scene: 'しかえし', kind: 'normal', hp: 30,
    moves: [{ t: 'smear', n: 2, card: 'kattonaru', say: 'むかっとして、頭に 血が のぼる（カードが「カッとなる」に ぬりつぶされる）' }, { t: 'inject', card: 'tataku', say: 'また 手が 出そうに なる（たたく が まざる）' }, { t: 'stress', n: 8, say: 'にらまれる' }, { t: 'grow', n: 2, say: '話が 大きく なっていく' }],
    weak: ['relate'], resist: [], backfire: ['impulse'], situ: ['apologize', 'tell_feeling', 'hit_back'],
    other: 'あの子：「…あやまってくれたなら、もう いいよ」'
  };
  ENEMIES.bad_rep = {
    trouble: true, art: 'rumor',
    intro: '教室に 入ると、ひそひそ 声。「あの子、すぐ おこるんだって」 自分の ことが うわさに なっている。',
    forms: ['うわさの 黒い けむり', 'ひそひそ 話す クラスの 子', '前の ことを 気にしている 子たち'],
    ctx: 'tease', scene: '自分の うわさ', kind: 'normal', hp: 28,
    moves: [{ t: 'inject', card: 'warukuchi', say: '言い返したく なる（悪口が まざる）' }, { t: 'stress', n: 8, say: '目を そらされる' }, { t: 'stress', n: 7, say: 'うわさが 広がる' }],
    weak: ['relate'], resist: [], backfire: ['impulse'], situ: ['not_join', 'tell_teacher', 'spread'],
    other: 'クラスの子：「ちゃんと あやまってたの、見てたよ」'
  };
  ENEMIES.cold_class = {
    trouble: true, art: 'left_out',
    intro: '休み時間。いつもの 遊びに 行ったら、みんなが ちょっと だまった。「…どうする？」と 目を 見合わせている。',
    forms: ['つめたい かぜの かべ', '目を 見合わせる みんな', 'まだ 様子を 見ている みんな'],
    ctx: 'join', scene: 'みんなが よそよそしい', kind: 'normal', hp: 30,
    moves: [{ t: 'stress', n: 7, say: 'さそって もらえない' }, { t: 'worry', say: '「もう 入れて もらえない？」と 考えてしまう' }, { t: 'stress', n: 8, say: '休み時間が おわっていく' }],
    weak: ['relate'], resist: [], backfire: ['impulse'], situ: ['let_me_in', 'invite_other', 'sulk'],
    other: '遊んでいた子：「この前は びっくりした。でも、また いっしょに やろう」'
  };


  // ===== 自分の しっぱい（？マスで ときどき 出る）=====
  ENEMIES.got_rough = {
    selfFail: true, art: 'bumped', term: 'short',
    intro: '休み時間、おにごっこで テンションが 上がって、友だちを 強く たたいて しまった。友だちが うでを おさえて 下を 向いている。',
    forms: ['あばれる 火の 手', 'うでを おさえる 友だち', 'びっくりして いたい 友だち'],
    ctx: 'conflict', scene: 'もり上がって たたいた', kind: 'normal', hp: 26,
    moves: [{ t: 'inject', card: 'irritation', say: 'イライラが おさまらない（イライラが まざる）' }, { t: 'stress', n: 7, say: '友だちが だまって しまった' }, { t: 'inject', card: 'kattonaru', say: '「わざとじゃ ない！」と 言いたくなる（カッとなる が まざる）' }, { t: 'stress', n: 8, say: 'まわりの 子が 見ている' }],
    weak: ['relate'], resist: [], backfire: ['impulse'], situ: ['apologize', 'ask_ok', 'hide_it'],
    other: '友だち：「いたかったけど、すぐ あやまって くれたから いいよ」'
  };
  ENEMIES.said_too_much = {
    selfFail: true, art: 'rumor',
    intro: 'みんなで わらっているうちに、調子に のって 友だちの ことを「へんなの」と 言いすぎた。友だちが 笑わなく なった。',
    forms: ['とげとげ ことばの つる', 'だまりこんだ 友だち', '本当は 気にしていた 友だち'],
    ctx: 'tease', scene: '言いすぎた', kind: 'normal', hp: 26,
    moves: [{ t: 'inject', card: 'pride', say: 'あやまるのが くやしい（プライドが まざる）' }, { t: 'stress', n: 7, say: '友だちが 目を 合わせない' }, { t: 'inject', card: 'warukuchi', say: 'ごまかして もっと 言いたくなる（悪口が まざる）' }, { t: 'stress', n: 7, say: '気まずい 空気が 続く' }],
    weak: ['relate'], resist: [], backfire: ['impulse'], situ: ['apologize', 'tell_feeling', 'spread'],
    other: '友だち：「言われて いやだった。でも、あやまって くれて うれしかった」'
  };
  ENEMIES.joined_in = {
    selfFail: true, art: 'teased',
    intro: 'クラスの 何人かが ある子を からかっていた。気づいたら 自分も いっしょに わらって、まねを していた。その子が 一人で 帰っていく。',
    forms: ['わらい声の むれ', 'からかわれた あの子', '一人で がまんしていた あの子'],
    ctx: 'tease', scene: 'からかいに 加わった', kind: 'normal', hp: 30,
    moves: [{ t: 'inject', card: 'not_my_fault', say: '「みんなも やってた」と 思いたくなる（自分は 悪くない！が まざる）' }, { t: 'stress', n: 7, say: 'あの子の 顔が うかぶ' }, { t: 'grow', n: 2, say: 'からかいが 毎日の ことに なりそう' }, { t: 'stress', n: 8, say: '「みんなも やってたし」と 思いたくなる' }],
    weak: ['relate'], resist: [], backfire: ['impulse'], situ: ['not_join', 'tell_teacher', 'apologize'],
    other: 'あの子：「次の 日、声を かけて くれて ほっとした」'
  };
  ENEMIES.skipped_hw = {
    selfFail: true, solo: true, art: 'homework',
    intro: 'きのう ゲームに むちゅうに なって、宿題を やらずに ねて しまった。朝の 会で「宿題を 出してください」の 声。',
    forms: ['サボりの おばけ', '出せない 宿題', 'やれば おわる 量の 宿題'],
    ctx: 'study', scene: '宿題を サボった', kind: 'normal', hp: 24,
    moves: [{ t: 'inject', card: 'shame', say: '出せないのが 恥ずかしい（恥ずかしさが まざる）' }, { t: 'stress', n: 7, say: '先生が こっちを 見る' }, { t: 'inject', card: 'put_off', say: '「あとで やればいい」と 思いたくなる' }, { t: 'stress', n: 7, say: 'ほかの 子は もう 出している' }],
    weak: ['think', 'act'], resist: [], backfire: ['impulse'], situ: ['say_honest', 'plan_time', 'hide_it'],
    other: '先生：「正直に 言って くれたね。休み時間に いっしょに やろう」'
  };
  ENEMIES.ran_hall = {
    selfFail: true, art: 'bumped', term: 'short',
    intro: '早く 遊びたくて ろうかを 走ったら、曲がり角で 下の 学年の 子と ぶつかった。その子が しりもちを ついている。',
    forms: ['ろうかを かける つむじ風', 'しりもちを ついた 子', 'びっくりした 下の 学年の 子'],
    ctx: 'conflict', scene: 'ろうかを 走った', kind: 'normal', hp: 22,
    moves: [{ t: 'stress', n: 7, say: 'その子が 泣きそうに なる' }, { t: 'stress', n: 7, say: '先生が 歩いて くる' }],
    weak: ['relate'], resist: [], backfire: ['impulse'], situ: ['ask_ok', 'apologize', 'walk_away'],
    other: '下の 学年の 子：「手を かして くれて ありがとう」'
  };
  ENEMIES.chatting = {
    selfFail: true, art: 'dunno', term: 'short',
    intro: 'じゅぎょう中、となりの 子と 話していたら 楽しくて 声が 大きく なった。先生に「今は 何の 時間？」と 言われた。',
    forms: ['おしゃべり ことり', 'こっちを 見る 先生', 'じゅぎょうに もどってほしい 先生'],
    ctx: 'study', scene: 'じゅぎょう中の おしゃべり', kind: 'normal', hp: 20,
    moves: [{ t: 'inject', card: 'shame', say: 'みんなに 見られて 恥ずかしい（恥ずかしさが まざる）' }, { t: 'stress', n: 6, say: 'みんなが ふり向く' }, { t: 'stress', n: 6, say: '何の 話を しているか わからなく なった' }],
    weak: ['think', 'relate'], resist: [], backfire: ['impulse'], situ: ['say_honest', 'review_notes', 'hide_it'],
    other: '先生：「すぐ 切りかえられたね」'
  };

  // れんしゅう用の 課題（はじめの 操作説明だけで 使う。マップには 出ない）
  ENEMIES.tutorial = {
    forms: ['ころがる 消しゴム虫', 'どこかへ 行った 消しゴム', 'つくえの 下の 消しゴム'],
    intro: 'じゅぎょう中に 消しゴムを 落としてしまった。どこに 行ったかな？',
    ctx: 'study', scene: '消しゴムを 落とした（れんしゅう）', kind: 'normal', hp: 8, art: 'forgot_item',
    moves: [{ t: 'stress', n: 2, say: 'あせってくる' }, { t: 'stress', n: 2, say: 'ノートが 書けない' }],
    weak: ['relate'], resist: [], backfire: [], situ: ['ask_next'],
    other: 'となりの子：「あ、ここに あったよ！」'
  };
  var TUTORIAL_DECK = ['try_it', 'endure', 'talk', 'breathe', 'try_it', 'endure'];

  // あぶない場面（ときどき 課題の代わりに出る）。戦って勝つのは ほぼ無理で、はなれる・にげる・大人をよぶ が正解
  ENEMIES.fight_near = {
      term: 'short',
      intro: 'げた箱の 近くで、上級生どうしが 大声で 言い合いを している。おしたり おされたり、今にも ケンカに なりそうだ。',
    forms: ['あばれる 大あらし', 'もめている 上級生たち', 'ケンカ中の 上級生'],
    ctx: 'danger', scene: '上級生の ケンカに まきこまれそう', kind: 'danger', hp: 80, escapeOk: true,
    moves: [{ t: 'inject', card: 'panic', say: '頭が まっ白に なりそう（パニックが まざる）' }, { t: 'stress', n: 11, say: 'どなり声が 近づいてくる' }, { t: 'grow', n: 4, say: 'まわりも さわぎはじめる' }, { t: 'stress', n: 13, say: 'おされて ころびそう' }],
    weak: [], resist: ['relate', 'think', 'act'], backfire: ['impulse'], situ: ['call_adult', 'run_now'],
    other: '先生：「はなれて 知らせてくれて ありがとう。あぶない ところに 入らなかったのは 正しい」'
  };
  ENEMIES.stranger = {
      term: 'short',
      intro: '学校の 帰り道、一人で 歩いていたら、知らない 大人に「いいもの あげるから ついておいで」と 声を かけられた。',
    forms: ['あまい声の かげ', '知らない 大人？', '帰り道で 声をかけてきた 知らない人'],
    ctx: 'danger', scene: '知らない人に さそわれた', kind: 'danger', hp: 80, escapeOk: true,
    moves: [{ t: 'inject', card: 'panic', say: '頭が まっ白に なりそう（パニックが まざる）' }, { t: 'stress', n: 10, say: '「いいもの あげるよ」と 近づいてくる' }, { t: 'grow', n: 4, say: 'うでを つかまれそう' }, { t: 'stress', n: 12, say: 'まわりに だれも いない' }],
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
    friend_retry: {
      title: '友だちの さか上がり',
      text: '体育の 時間。友だちが さか上がりで 何回 落ちても「もう一回！」と 足の 位置を 変えて ためしている。',
      options: [
        { label: '自分も まねして、やり方を 変えながら ためす', effects: { trust: 1, evolve: ['try_it', 'trial_error'] }, result: '「失敗したら、どこを 変えるか 考えれば いいんだ」と 気づいた。' },
        { label: '「すごいね」と 声を かける', effects: { trust: 1 }, result: '友だちが「ありがとう！」と わらった。' },
        { label: '見ているだけに する', effects: {}, result: '休み時間が おわった。' }
      ]
    },
    friend_heavy: {
      title: 'そうじの 時間',
      text: '重い つくえを はこぶ 当番。友だちが「よっこいしょ！」と わらいながら 持ち上げている。',
      options: [
        { label: '自分も「よっこいしょ！」と 声を 出して 運ぶ', effects: { trust: 1, evolve: ['try_it', 'yokkoisho'] }, result: '声を 出すと、ふしぎと 体が 動いた。めんどうな ことも 取りかかれそうだ。' },
        { label: '「手つだうよ」と 反対がわを 持つ', effects: { trust: 1, yoyu: 4 }, result: '二人で 運んだら すぐ おわった。' },
        { label: '自分の 分だけ だまって 運ぶ', effects: {}, result: 'つくえは 運びおわった。' }
      ]
    },
    friend_fun: {
      title: 'むずかしい パズル',
      text: '休み時間、友だちが むずかしい パズルに 何度も つまずきながら「面白く なってきた！」と 目を かがやかせている。',
      options: [
        { label: '自分も いっしょに やってみる', effects: { trust: 1, evolve: ['try_it', 'omoshiro'] }, result: 'むずかしい ところほど、とけた ときが うれしい。「むずかしい」が「面白い」に 見えてきた。' },
        { label: '「がんばって」と おうえんする', effects: { trust: 1 }, result: '「とけたら 見せるね！」と 言ってくれた。' },
        { label: '「むずかしそう…」と はなれる', effects: {}, result: '友だちは 一人で つづけていた。' }
      ]
    },
    friend_shrug: {
      title: 'テストが 返ってきた',
      text: '友だちの テストに ばつが いくつも ある。でも「失敗したって 大丈夫。どこを まちがえたか わかったし」と 言っている。',
      options: [
        { label: 'その 考え方を まねしてみる', effects: { trust: 1, evolve: ['endure', 'no_worry'] }, result: 'まちがいは「わかってない ところの 目じるし」なんだ、と 思えた。' },
        { label: 'いっしょに やり直しを する', effects: { trust: 1, addCard: 'review_notes' }, result: '二人で 見直したら、自分の まちがいも 見つかった。' },
        { label: '自分の 点数だけ 気にする', effects: { yoyu: -4 }, result: '点数の ことが 頭から はなれなかった。' }
      ]
    },
    friend_later: {
      title: '試合に 負けた 日',
      text: 'クラス対こうの ドッジボールで 負けた。くやしそうな 友だちが「くやしいのは あとで。今は 次の チームを おうえんしよう！」と 言った。',
      options: [
        { label: '自分も 気もちを あとに まわして おうえんする', effects: { trust: 1, evolve: ['endure', 'later_down'] }, result: 'おうえんしているうちに、気もちが 少し 前を 向いた。家で 思いきり くやしがろう。' },
        { label: '「くやしいね」と 気もちを 話す', effects: { trust: 1, yoyu: 6 }, result: '「だよね」と 友だちも うなずいた。少し 楽に なった。' },
        { label: 'だまって すわりこむ', effects: { yoyu: -4 }, result: 'しばらく 何も 考えられなかった。' }
      ]
    },
    friend_switch: {
      title: '注意された 友だち',
      text: '友だちが ろうかを 走って 先生に 注意された。「はい。よし、次！」と すぐに 歩き出した。',
      options: [
        { label: 'その 切りかえを まねしてみる', effects: { trust: 1, evolve: ['endure', 'switch_on'] }, result: '「よし、次！」と 心の 中で 言うと、頭が すっきりした。' },
        { label: '「大丈夫？」と 声を かける', effects: { trust: 1 }, result: '「うん、もう 平気！」と 笑顔で 返ってきた。' },
        { label: '「見ちゃった」と 笑う', effects: { trust: -1 }, result: '友だちは ちょっと いやそうな 顔を した。' }
      ]
    },
    lost_wallet: {
      title: '落とし物',
      text: 'ろうかに キャラクターの キーホルダーが 落ちている。だれのだろう。',
      options: [
        { label: '職員室に とどける', effects: { trust: 1 }, result: '次の 日、持ち主の 子が「ありがとう」と 言いに 来た。' },
        { label: '「だれのー？」と 教室で 聞く', effects: { trust: 1, yoyu: 2 }, result: '「ぼくの！」と すぐに 見つかった。' },
        { label: '見なかった ことに する', effects: {}, result: 'ずっと そこに 落ちていた。' }
      ]
    },
    new_kid: {
      title: '転校生',
      text: '今日 来た 転校生が、休み時間に 一人で すわっている。',
      options: [
        { label: '「いっしょに 遊ぼう」と さそう', effects: { trust: 2, yoyu: 4 }, result: '転校生は ほっとした 顔で 立ち上がった。' },
        { label: 'となりに すわって 話しかける', effects: { trust: 1, addCard: 'talk' }, result: '好きな まんがが 同じだった。' },
        { label: '気に なるけど そのままに する', effects: {}, result: '転校生は ずっと 本を 見ていた。' }
      ]
    },
    rainy_day: {
      title: '雨の 休み時間',
      text: '雨で 外に 出られない。教室は ざわざわ している。',
      options: [
        { label: '友だちと トランプを する', effects: { yoyu: 12 }, result: 'わらいすぎて おなかが いたくなった。' },
        { label: '本を 読む', effects: { yoyu: 8 }, result: '物語の 世界に 入りこんで、気もちが 落ちついた。' },
        { label: 'ぼーっと 外を 見る', effects: { yoyu: 4 }, result: '雨の 音を 聞いていた。' }
      ]
    },
    neighbor: {
      title: '近所の 人',
      text: '帰り道、近所の おばあさんが 花に 水を あげている。',
      options: [
        { label: '「こんにちは」と あいさつする', effects: { trust: 1, yoyu: 6 }, result: '「おかえり。毎日 えらいね」と 言ってもらえた。' },
        { label: '会しゃくだけ する', effects: { yoyu: 2 }, result: 'おばあさんも にっこり した。' },
        { label: '急いで 通りすぎる', effects: {}, result: '家に ついた。' }
      ]
    },
    wrongly_blamed: {
      title: 'ぬれぎぬ', unlucky: true,
      text: '休み時間の あと、教室の 花びんが われていた。近くに いた 自分が うたがわれている。',
      options: [
        { label: '「ちがうよ。見ていたのは こう」と 落ちついて 話す', effects: { trust: -1 }, result: '全員は なっとく しなかった。でも 先生は 話を 最後まで 聞いて くれた。' },
        { label: '「ぼくじゃない！」と 大声で 言い返す', effects: { trust: -2, yoyu: -4 }, result: 'さわぎが 大きくなって、ますます あやしまれた。' },
        { label: '何も 言えずに だまる', effects: { trust: -2, curse: 1 }, result: '「やっぱり…」と ひそひそ 言われた。' }
      ]
    },
    telephone: {
      title: 'でんごんゲーム', unlucky: true,
      text: '友だちに 言った「今日は 遊べない」が、まわりまわって「〇〇とは 遊びたくない」と つたわっていた。',
      options: [
        { label: '本人に 直接「そう 言ってないよ」と 話しに 行く', effects: { trust: -1, yoyu: -2 }, result: '少し ぎこちないけど、本人には つたわった。' },
        { label: 'つたえた子に「話が ちがう！」と おこる', effects: { trust: -2 }, result: '言い合いに なって、話が もっと こじれた。' },
        { label: 'そのうち わかって くれると 思って ほうっておく', effects: { trust: -2 }, result: 'しばらく その子と 気まずかった。' }
      ]
    },
    group_late: {
      title: 'おくれた じゅんび', unlucky: true,
      text: 'グループの 発表の じゅんびが 間に合わなかった。休んだ 子の 分なのに「〇〇が やらなかった」と 言われた。',
      options: [
        { label: '「休みの 子の 分だったよ。今から いっしょに やろう」と 言う', effects: { trust: -1, addCard: 'listen_all' }, result: '全員は 気に しなかったけど、何人かは 手つだって くれた。' },
        { label: '「知らない！」と その場を はなれる', effects: { trust: -2 }, result: 'グループの 空気が 悪く なった。' },
        { label: '自分が やったことに して だまって 作る', effects: { trust: -1, yoyu: -6 }, result: '作りおわったけど、つかれて しまった。' }
      ]
    },
    recess: {
      repeat: true,
      title: '休み時間',
      text: 'チャイムが 鳴った。校庭から 友だちの 声が 聞こえる。',
      options: [
        { label: '友だちと 外で 遊ぶ', effects: { yoyu: 18, trust: 1 }, result: '思いきり 走って わらった。気もちが 軽くなった。' },
        { label: '友だちと おしゃべりする', effects: { yoyu: 14 }, result: 'くだらない 話で もりあがった。少し ほっとした。' },
        { label: '一人で ぼんやりする', effects: { yoyu: 6 }, result: '少しだけ 休めた。' }
      ]
    },
    library: {
      title: '図書室で 本を 見つけた',
      text: '休み時間に 図書室へ 行ったら、気になる 本が 3さつ あった。',
      options: [
        { label: '『気もちの ことば じてん』を 読む', effects: { addCard: 'sukkiri' }, result: '気もちを 言葉に すると すっきりする、と 書いてあった。' },
        { label: '『べんきょうの コツ』を 読む', effects: { addCard: 'plan_time' }, result: '時間を 決めると 集中できる、と わかった。' },
        { label: '『友だちと なかよく』を 読む', effects: { addCard: 'thanks' }, result: '「ありがとう」の 言い方が いろいろ のっていた。' }
      ]
    },
    family_talk: {
      title: '夕ごはんの 時間',
      text: 'お家の人が「今日は どうだった？」と 聞いてくれた。',
      options: [
        { label: '今日 あったことを 話す', effects: { addCard: 'consult_family', yoyu: 6 }, result: '話したら 気もちが 軽くなった。' },
        { label: '「ふつう」とだけ 言う', effects: {}, result: 'そのまま ごはんを 食べた。' }
      ]
    },
    trouble_hit: {
      title: 'トラブル：先生に よばれた', trouble: true,
      text: 'さっき 手が 出てしまった ことで、先生に よばれた。相手の子も 来ている。',
      options: [
        { label: '何が あったか 正直に 話して、あやまる', effects: { trust: 2, addCard: 'apologize' }, result: '先生：「話してくれて ありがとう。次は 手が 出る前に、はなれるか 先生を よぼうね」。相手の子とも なかなおりできた。' },
        { label: '「むこうが 先に やった」と 言う', effects: { trust: -1, curse: 1 }, result: '先生：「どちらの 話も 聞くね」。でも、自分のしたことは 残ったままだ。' },
        { label: 'だまって 下を 向く', effects: { curse: 1 }, result: '先生が 待ってくれたけど、何も 言えなかった。' }
      ]
    },
    trouble_yell: {
      title: 'トラブル：クラスの 空気が 悪くなった', trouble: true,
      text: '大きな声を 出したことで、まわりの 子が びっくりしている。先生が「どうしたの？」と 来てくれた。',
      options: [
        { label: '気もちを 話して、「大きな声を 出して ごめん」と 言う', effects: { trust: 2, addCard: 'name_feeling' }, result: '先生：「おこった 気もちは 大事。つたえ方を いっしょに 考えよう」' },
        { label: '「べつに」と 言って はなれる', effects: { trust: -1, curse: 1 }, result: 'しばらく だれも 話しかけて こなかった。' }
      ]
    },
    trouble_rumor: {
      title: 'トラブル：うわさが 広がった', trouble: true,
      text: '言ったことが 広がって、相手の子が ないている。先生が 二人を よんで 話を 聞いてくれる。',
      options: [
        { label: '言ったことを みとめて、あやまる', effects: { trust: 2, addCard: 'not_join' }, result: '先生：「言葉は 消せないけど、あやまる ことは できる。よく 言えたね」' },
        { label: '「みんなも 言ってた」と 言う', effects: { trust: -2, curse: 1 }, result: '先生：「みんなの ことじゃなく、自分の ことを 考えよう」' }
      ]
    },
    trouble_withdraw: {
      title: '先生が 声を かけてくれた', trouble: true,
      text: '一人で かかえこんでいる ようすに、先生が 気づいて「何か あった？」と 聞いてくれた。',
      options: [
        { label: 'こまっていることを 話す', effects: { trust: 1, addCard: 'consult', yoyu: 6 }, result: '先生：「話してくれて ありがとう。いっしょに 考えよう」' },
        { label: '「だいじょうぶです」と 言う', effects: {}, result: '先生：「いつでも 話してね」と 言ってくれた。' }
      ]
    },
    slack: {
      title: 'ゴロゴロ する', slack: true,
      text: '今日は 何も しないで、ゲームを したり ねころんだり。気もちは 楽だけど、やる ことは 先のばしに なった…',
      options: [
        { label: 'ゴロゴロする', effects: { yoyu: 22, slack: 1 }, result: 'ストレスは へった。でも、体が なまって、これからの 課題が 少し きつく 感じそう…' }
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
  // 1層＝7段＋ボス。課題の半分以上は ボスに 関連する課題（related）。関連する課題を 乗りこえるたびに ボスの ハートが へる
  var ACTS = [
    { name: '教室', boss: 'test', related: ['dunno', 'homework'], others: ['forgot_item', 'bumped', 'left_out'], elites: ['teased'], dangers: ['fight_near', 'stranger'], events: ['recess', 'forgot', 'friend_trouble', 'library', 'family_talk', 'friend_retry', 'friend_shrug', 'lost_wallet', 'rainy_day', 'wrongly_blamed', 'recess'] },
    { name: '友だち', boss: 'friend_fight', related: ['misunder', 'bumped', 'rumor'], others: ['left_out', 'dunno'], elites: ['teased'], dangers: ['fight_near', 'stranger'], events: ['recess', 'friend_trouble', 'library', 'family_talk', 'friend_heavy', 'friend_later', 'new_kid', 'friend_switch', 'telephone', 'recess'] },
    { name: '行事', boss: 'presentation', related: ['practice', 'team'], others: ['left_out', 'rumor'], elites: ['teased'], dangers: ['fight_near', 'stranger'], events: ['recess', 'library', 'family_talk', 'friend_trouble', 'friend_fun', 'friend_switch', 'neighbor', 'friend_later', 'group_late', 'recess'] }
  ];
  var ROUTES = [
    { id: 'hard', name: 'しんどいが 力が つく道', note: '課題に 向き合う マスが 多い（4つ）。ボスが 弱くなり、成長しやすい', nodes: ['battle', 'mystery', 'battle', 'event', 'battle', 'mystery', 'battle', 'event', 'event'] },
    { id: 'normal', name: 'ふつうの道', note: '課題に 向き合う マスは 2つ。休みも ある', nodes: ['battle', 'event', 'mystery', 'rest', 'event', 'battle', 'mystery', 'event', 'event'] },
    { id: 'easy', name: '楽そうな道', note: '課題は 1つ だけで 休める。でも 先のばしに すると、ボスが 大きくなる', nodes: ['mystery', 'slack', 'event', 'slack', 'rest', 'battle', 'slack', 'event', 'event'] }
  ];

  var MAP = { rows: 10, cols: 3, paths: 3, crossEdge: 0, straight: true, mysteryBattle: 0.15, mysteryElite: 0.05, troublePer: 0.06, actScale: { hp: [1, 1.3, 1.6], stress: [1, 1.2, 1.4] }, rust: 0.07, selfFail: 0.05, selfFailPer: 0.03, selfFailMax: 0.3, troubleMax: 0.6, slackBoss: 0.05, actHealAmount: 0, relatedShare: 0.5, hearts: 3, heartHp: 0.18, heartStress: 0.2, bossBase: 1.15, actHeal: 1 };

  // カードを 使った時の「どうなったか」（場面 × カードの系統）
  var OUTCOME = {
    study: { think: 'じゅんばんに 考えたら、ときかたが 少し 見えてきた。', act: '手を 動かしたら、少しずつ すすみ出した。', relate: '思いきって 伝えたら、手を かして もらえた。', calm: 'いきが ととのって、問題が 落ちついて 読めた。', basic: 'じっと こらえて、なんとか その場を もたせた。', impulse: 'その場は ごまかせた。でも わからないまま。', help: '先生や 友だちが 手を かしてくれた。', fail: 'やってみたけど、まだ わからない。', backfire: 'ごまかした分、あとで もっと こまりそう。' },
    conflict: { think: '相手の 気もちを 考えたら、言い方が 見えてきた。', act: '自分から 動いて、空気が 少し かわった。', relate: '気もちを 伝えたら、相手も 少し 落ちついた。', calm: '気もちが しずまって、言葉を えらべた。', basic: 'ぐっと こらえた。ケンカには ならなかった。', impulse: 'その場は スッとした。でも 相手は もっと おこった。', help: '大人が 間に 入ってくれた。', fail: 'うまく 伝わらず、まだ ぎくしゃく している。', backfire: '言いすぎて、あとで こじれそう。' },
    join: { think: 'どう 声を かけるか、作戦が 立った。', act: '思いきって 近づいたら、場所を あけてくれた。', relate: '「入れて」と 言えたら、なかまに 入れた。', calm: 'どきどきが おさまって、声が 出せそう。', basic: 'がまんして 見ていた。時間は すぎた。', impulse: 'わりこんだら、みんなが しらけた。', help: '友だちが いっしょに 声を かけてくれた。', fail: '声が 小さくて、気づいて もらえなかった。', backfire: '気まずく なって、次は もっと 入りにくい。' },
    tease: { think: 'どう こたえるか 考えて、落ちついて いられた。', act: 'はっきり 動いたら、からかいが 止まった。', relate: '「やめて」と 言えた。相手が だまった。', calm: 'いやな 気もちが 少し 小さく なった。', basic: 'たえた。でも 心に のこっている。', impulse: 'やり返したら、もっと からかわれた。', help: '大人に 話したら、止めて もらえた。', fail: '言えたけど、まだ やまない。', backfire: 'やり返した分、あとで もっと ひどく なりそう。' },
    stage: { think: '話す じゅんばんを 考えたら、見通しが ついた。', act: 'まず 一言 言えたら、声が 出てきた。', relate: '友だちの うなずきで、安心できた。', calm: '深く いきを すって、ふるえが おさまった。', basic: 'なんとか 立っていられた。', impulse: 'ふざけて ごまかしたら、空気が かたまった。', help: 'みんなが 応えんして くれた。', fail: 'ことばに つまった。でも まだ 続けられる。', backfire: 'ごまかした分、次は もっと きんちょうしそう。' },
    danger: { think: 'あぶないと 気づけた。', act: 'すぐに 動いて、きょりが とれた。', relate: '大きな 声で 人を よべた。', calm: 'あわてずに、にげ道を 見つけた。', basic: 'その場に いたら、もっと あぶなく なった。', impulse: 'むちゃを したら、もっと あぶなく なった。', help: '大人が すぐ 来てくれた。', fail: 'うまく いかなかった。べつの 手を さがそう。', backfire: 'あぶない ことが 大きく なった。' }
  };

  var TEXT = {
    title: 'こころの 冒険',
    lose: 'つかれちゃった。でも、ナイストライ！',
    win: 'さいごまで たどりついた！',
    failCause: ['今日は タイミングが 合わなかった。', '相手の じゅんびが まだだった。', 'こういう日も ある。'],
    curseGained: 'モヤモヤが デッキに 入った。',
    stressIntrude: 'ストレスが たまって、「カッとなる」が 手札に まざった。'
  };

  Object.keys(ENEMIES).forEach(function (k) {
    var e = ENEMIES[k];
    e.situ.forEach(function (id) {
      var c = CARDS[id];
      if (!c.ctx) c.ctx = [];
      if (c.autoCtx !== false && c.ctx.indexOf(e.ctx) < 0 && !c.unplayable) { c.ctx.push(e.ctx); c.autoCtx = true; }
    });
  });

  var DATA = { ROUTES: ROUTES, TUTORIAL_DECK: TUTORIAL_DECK, TERM_LABEL: TERM_LABEL, RARE_LINE: RARE_LINE, ADVANCED: ADVANCED, HEROES: HEROES, TROUBLE_OF: TROUBLE_OF, TROUBLE_RANK: TROUBLE_RANK, MAP: MAP, FORMS: FORMS, TEACHER_CARDS: TEACHER_CARDS, FRIEND_CARDS: FRIEND_CARDS, SUPPORTS: SUPPORTS, SUPPORT_RULES: SUPPORT_RULES, CTX_LABEL: CTX_LABEL, STATS: STATS, TYPE_LABEL: TYPE_LABEL, CHANCE: CHANCE, PLAYER: PLAYER, RULES: RULES, CARDS: CARDS, STARTER: STARTER, REWARD_POOL: REWARD_POOL, ENEMIES: ENEMIES, EVENTS: EVENTS, ACTS: ACTS, TEXT: TEXT, OUTCOME: OUTCOME, TROUBLE_ENEMIES: ['payback', 'bad_rep', 'cold_class'], SELF_FAIL_ENEMIES: ['got_rough', 'said_too_much', 'joined_in', 'skipped_hw', 'ran_hall', 'chatting'] };
  if (typeof module !== 'undefined' && module.exports) { DATA.FIT = require('./fit.js'); module.exports = DATA; }
  else root.SST_DATA = DATA;
})(this);
