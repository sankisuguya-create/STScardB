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
    weak: 2.0, resist: 0.35, anxiety: 0.6,
    restHeal: 0.3, dangerChance: 0.25, distanceMul: 0.9, frozenTurns: 2, frozenRecover: 0.1, nigatePer: 8, nigateStress: 2, backfireGrow: 4, backfireRegrow: 0.7, backfireSolve: 0.5, moyaDrain: 7, panicDrain: 1, allyTrust: 7, allyGuard: 6, hpScale: 1.6, stressScale: 3.0,
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
    talk: { name: '話してみる', line: '「ねえ、ちょっといい？」', type: 'relate', judge: 'good', style: 'assertive', cost: 1, solve: 4, ctx: ['study', 'conflict', 'join', 'tease'] },
    keep_distance: { name: 'きょりを おく', line: '「ちょっと はなれて、頭を ひやそう」', type: 'calm', judge: 'good', style: 'distance', cost: 1, guard: 6, distance: true, ctx: ['conflict', 'tease', 'join', 'danger'] },
    run_away: { name: 'その場を はなれる（にげる）', line: 'あぶないと 思ったら、すぐに その場を はなれる。', type: 'act', judge: 'good', style: 'distance', cost: 1, escape: true, ctx: ['danger', 'conflict', 'tease'] },
    okoru: { name: '怒る', line: '「もう、なんなの！」と どなる。', type: 'impulse', judge: 'impulse', style: 'aggressive', cost: 1, solve: 9, chance: 'high', trust: -1, curse: true, ctx: ['conflict', 'tease', 'join'] },

    // --- 報酬で手に入るカード ---
    write_plan: { name: 'やることを紙に書く', line: '1. 2. 3. と じゅんばんに書く。', type: 'think', judge: 'good', style: 'assertive', cost: 1, solve: 4, draw: 1, ctx: ['study', 'stage'] },
    their_view: { name: '相手の気もちを考える', line: '「あの子は どう思ったかな？」', type: 'think', judge: 'good', style: 'assertive', cost: 1, guard: 4, organize: true, ctx: ['conflict', 'join', 'tease'] },
    start_now: { name: 'すぐ取りかかる', line: 'あとまわしに しない。', type: 'act', judge: 'good', style: 'assertive', cost: 1, solve: 8, ctx: ['study', 'stage'] },
    move_body: { name: '体を動かして 気分てんかん', line: '休み時間に 外で走る。', type: 'act', judge: 'good', style: 'assertive', cost: 1, heal: 5, exhaust: true, ctx: ['study', 'conflict', 'join', 'tease', 'stage'] },
    together: { name: '「いっしょにやろう」', line: '「いっしょにやろう」と 声をかける。', type: 'relate', judge: 'good', style: 'assertive', cost: 1, solve: 6, trust: 1, chance: 'high', ctx: ['study', 'join', 'stage'] },
    thanks: { name: '「ありがとう」を つたえる', line: '「さっきは ありがとう」', type: 'relate', judge: 'good', style: 'assertive', cost: 0, guard: 3, trust: 1, ctx: ['study', 'conflict', 'join', 'stage'] },
    apologize: { name: 'あやまる', line: '「さっきは ごめんね」', type: 'relate', judge: 'good', style: 'assertive', cost: 1, solve: 3, trust: 2, ctx: ['conflict', 'join'] },
    lead: { name: 'みんなを まとめる', line: '「じゃあ、じゅんばんに 言っていこう」', type: 'relate', judge: 'good', style: 'assertive', cost: 2, solve: 14, chance: 'mid', req: { relate: 2, trust: 6 }, ctx: ['study', 'join', 'stage'] },
    sort_out: { name: '状きょうを 整理する', line: '「何が あった？ 自分は どうしたい？」と 書き出す。', type: 'think', judge: 'good', style: 'assertive', cost: 1, guard: 3, draw: 1, organize: true, ctx: ['study', 'conflict', 'join', 'tease', 'stage'] },
    firm_reply: { name: 'きっぱり 言い返す', line: '「そういうことは 言わないで」と 目を見て 言う。', type: 'relate', judge: 'good', style: 'assertive', cost: 1, solve: 10, chance: 'mid', fail: 'walk_away', ctx: ['conflict', 'tease'] },
    name_feeling: { name: '気もちを 言葉にする', line: '「いま、ちょっと くやしい」', type: 'calm', judge: 'good', style: 'assertive', cost: 1, guard: 7, ctx: ['study', 'conflict', 'join', 'tease', 'stage'] },

    // --- 場面カード（その戦いの間だけ手札に入る） ---
    say_dunno: { name: '「わからない」と言う', line: '「ここが わかりません」', type: 'relate', judge: 'good', style: 'assertive', cost: 1, solve: 8, chance: 'high' },
    ask_next: { name: 'となりの人に 聞く', line: '「ここ、どうやった？」', type: 'relate', judge: 'good', style: 'assertive', cost: 1, solve: 7, chance: 'mid', fail: 'ask_teacher' },
    ask_teacher: { name: '先生に 聞く', line: '「先生、ここを 教えてください」', type: 'relate', judge: 'good', style: 'assertive', cost: 1, solve: 7, chance: 'high', ctx: ['study', 'stage'] },
    skip_it: { name: 'とばして 次へ', line: 'わからない問題は あとで。', type: 'think', judge: 'neutral', style: 'passive', cost: 1, guard: 4, solve: 2 },

    ask_ok: { name: '「だいじょうぶ？」と聞く', line: '「だいじょうぶ？ いま、ぶつかったよね」', type: 'relate', judge: 'good', style: 'assertive', cost: 1, solve: 6, organize: true, chance: 'high' },
    watch_them: { name: '相手の ようすを見る', line: 'あわてている？ わらっている？', type: 'think', judge: 'good', style: 'assertive', cost: 1, guard: 3, organize: true },
    tell_hurt: { name: '「いたかったよ」と つたえる', line: '「いたかったよ。気をつけてね」', type: 'relate', judge: 'good', style: 'assertive', cost: 1, solve: 8, chance: 'high' },
    hit_back: { name: 'やり返す', line: 'どんっと おし返す。', type: 'impulse', judge: 'impulse', style: 'aggressive', cost: 1, solve: 10, chance: 'high', trust: -2, curse: true },

    let_me_in: { name: '「入れて」と言う', line: '「ねえ、入れて！」', type: 'relate', judge: 'good', style: 'assertive', cost: 1, solve: 10, chance: 'mid', fail: 'next_time' },
    next_time: { name: '「次は 入れてね」', line: '「じゃあ、次は 入れてね」', type: 'relate', judge: 'good', style: 'assertive', cost: 0, solve: 5, chance: 'high' },
    invite_other: { name: 'ほかの遊びに さそう', line: '「おにごっこ しない？」', type: 'relate', judge: 'good', style: 'assertive', cost: 1, solve: 6, trust: 1, chance: 'high' },
    consult: { name: '先生に そうだんする', line: '「先生、ちょっと 聞いてほしいことが あります」', type: 'relate', judge: 'good', style: 'assertive', cost: 1, solve: 7, chance: 'high', ctx: ['study', 'conflict', 'join', 'tease', 'stage'] },
    sulk: { name: 'ひとりで すねる', line: 'もういいよ、と はなれる。', type: 'impulse', judge: 'impulse', style: 'passive', cost: 1, guard: 8, chance: 'high', trust: -1, curse: true },

    say_stop: { name: '「いやだ」と はっきり言う', line: '「それ、いやだから やめて」', type: 'relate', judge: 'good', style: 'assertive', cost: 1, solve: 9, chance: 'mid', fail: 'walk_away' },
    walk_away: { name: 'その場を はなれる', line: 'だまって 先生の近くへ 行く。', type: 'act', judge: 'good', style: 'assertive', cost: 0, guard: 6, chance: 'high' },
    tell_teacher: { name: '先生に つたえる', line: '「何回も 言われて こまっています」', type: 'relate', judge: 'good', style: 'assertive', cost: 1, solve: 10, chance: 'high', organize: true, ctx: ['conflict', 'tease', 'danger'] },

    read_memo: { name: 'メモを見ながら 話す', line: '書いておいたことを 読む。', type: 'think', judge: 'good', style: 'assertive', cost: 1, solve: 9, chance: 'high' },
    breathe_first: { name: '深こきゅうして 始める', line: 'すって、はいて、「はじめます」', type: 'calm', judge: 'good', style: 'assertive', cost: 1, guard: 6 },
    friend_face: { name: '友だちの顔を見る', line: 'うなずいてくれる子を さがす。', type: 'relate', judge: 'good', style: 'assertive', cost: 1, guard: 5, solve: 5, req: { trust: 6 } },
    call_adult: { name: '近くの 大人を よぶ', line: '「たすけてください！」と 大きな声で 言う。', type: 'relate', judge: 'good', style: 'distance', cost: 0, escape: true, trust: 1 },
    run_now: { name: 'すぐに にげる', line: '安全な ところまで 走る。', type: 'act', judge: 'good', style: 'distance', cost: 0, escape: true },
    say_no_stranger: { name: '「行きません」と ことわる', line: '知らない人には ついて行かない。', type: 'relate', judge: 'good', style: 'assertive', cost: 1, guard: 8 },
    review_notes: { name: '見直しを する', line: '名前・計算・書きわすれを たしかめる。', type: 'think', judge: 'good', style: 'assertive', cost: 1, solve: 9, organize: true, ctx: ['study'] },
    plan_time: { name: '時間を 決めて やる', line: '「5時から 20分 やる」と 決める。', type: 'think', judge: 'good', style: 'assertive', cost: 1, solve: 6, draw: 1, ctx: ['study'] },
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
    ask_tip: { name: 'コツを 聞く', line: '「どうやったら うまく できる？」', type: 'relate', judge: 'good', style: 'assertive', cost: 1, solve: 7, chance: 'high' },
    quit_it: { name: 'もう やめる', line: '「どうせ できないし」', type: 'impulse', judge: 'impulse', style: 'passive', cost: 1, guard: 9, chance: 'high', trust: -1, curse: true },
    listen_all: { name: 'みんなの 意見を 聞く', line: '「一人ずつ 言ってみよう」', type: 'relate', judge: 'good', style: 'assertive', cost: 1, solve: 6, organize: true },
    vote: { name: '多数決に しよう', line: '「手を あげて 決めよう」', type: 'think', judge: 'good', style: 'assertive', cost: 1, solve: 10, chance: 'mid', fail: 'listen_all' },
    force_own: { name: '自分の 意見を おしつける', line: '「ぜったい こっちが いい！」', type: 'impulse', judge: 'impulse', style: 'aggressive', cost: 1, solve: 10, chance: 'high', trust: -2, curse: true },
    consult_family: { name: 'お家の人に そうだんする', line: '「今日 こんなことが あってね」', type: 'relate', judge: 'good', style: 'assertive', cost: 1, heal: 6, guard: 4, ctx: ['study', 'conflict', 'join', 'tease', 'stage'] },
    sukkiri: { name: '気もちを 話して すっきり', line: 'もやもやを 言葉にして だれかに 話す。', type: 'calm', judge: 'good', style: 'assertive', cost: 1, guard: 3, clearMoya: true, exhaust: true, ctx: ['study', 'conflict', 'join', 'tease', 'stage'] },
    panic: { name: 'パニック', line: '頭が ぐるぐるして 何も 考えられない。使えず、手札を ふさぐ。整えるカードで 1まい 消える。', type: 'curse', judge: 'curse', cost: 0, unplayable: true },
    tataku: { name: 'たたく', line: 'カッとして 手が 出る。', type: 'impulse', judge: 'impulse', style: 'aggressive', cost: 0, solve: 10, chance: 'high', trust: -3, curse: true },
    warukuchi: { name: '悪口を 言い返す', line: '「そっちだって ○○じゃん！」', type: 'impulse', judge: 'impulse', style: 'aggressive', cost: 0, solve: 9, chance: 'high', trust: -2, curse: true },
    // --- 上級カード（成長しないと 報酬に 出ない） ---
    positive_try: { name: 'ポジティブに トライする', line: '「失敗しても、そこから 学べばいい！」', type: 'act', judge: 'good', style: 'assertive', cost: 1, solve: 11, chance: 'mid', growFail: true, guardFail: 6, req: { act: 2 }, adv: true, ctx: ['study', 'join', 'stage'] },
    humor_dodge: { name: 'ギャグにして かわす', line: '「それ、ほめ言葉だと 思っとくね！」と 笑って かわす。', type: 'relate', judge: 'good', style: 'assertive', cost: 1, solve: 12, guard: 6, tame: true, req: { relate: 3, trust: 6 }, adv: true, ctx: ['tease', 'conflict'] },
    big_picture: { name: '先を 見通す', line: '「まず これ、次に これ。そうすれば 間に合う」', type: 'think', judge: 'good', style: 'assertive', cost: 1, solve: 6, organize2: true, draw: 1, req: { think: 3 }, adv: true, ctx: ['study', 'stage', 'join', 'conflict', 'tease'] },
    mediate: { name: '間に 入って 取りもつ', line: '「二人とも、言いたいこと あるよね。じゅんばんに 聞こう」', type: 'relate', judge: 'good', style: 'assertive', cost: 2, solve: 16, trust: 1, req: { relate: 3, think: 1 }, adv: true, ctx: ['conflict', 'join'] },
    calm_master: { name: '自分を 落ちつかせる', line: '「だいじょうぶ。一つずつ やれば いい」と 自分に 言う。', type: 'calm', judge: 'good', style: 'assertive', cost: 1, guard: 12, clearPanicAll: true, req: { think: 2, act: 1 }, adv: true, ctx: ['study', 'stage', 'conflict', 'tease', 'join'] },
    ugokenai: { name: '動けない', line: '心の余裕が なくなって、何も できない。', type: 'curse', judge: 'curse', cost: 0, unplayable: true },
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
    teacher: { name: '先生に そうだん', line: '「先生、聞いてほしいことが あります」', note: 'この場面で 先生に すすめられた カードが 手札に入る（戦いのあと 報酬にも出る）。状きょうも 1つ 整理される' },
    friend: { name: '友だちに そうだん', line: '「ねえ、どう思う？」', note: '心の余裕 +5。友だちの アドバイスが カードになる（ときどき 役に立たないことも）', heal: 5 },
    family: { name: 'お家の人に そうだん', line: '帰ってから 話を 聞いてもらう。', note: '心の余裕 +10', heal: 10 },
    diary: { name: '日記を 書く', line: '今日の ことを ノートに 書く。', note: 'モヤモヤを 1まい デッキから けす。心の余裕 +3', heal: 3, purgeMoya: true },
    book: { name: 'お気に入りの本', line: '好きな 本を 読んで、気もちを 切りかえる。', note: '心の余裕 +4、手札の モヤモヤを すてる', heal: 4, clearMoya: true }
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

  var ADVANCED = ['positive_try', 'humor_dodge', 'big_picture', 'mediate', 'calm_master'];

  // 主人公4人：はじめの成長・心の余裕・とくいカード
  var HEROES = {
    hanoko: { name: 'ハノコ', note: 'かしこいが 運動は にがて', stats: { think: 2, act: 0, relate: 1 }, maxYoyu: 50, card: 'write_plan', look: 'hanoko' },
    tario: { name: 'タリオ', note: '社交的だが 勉強は にがて', stats: { think: 0, act: 1, relate: 2 }, maxYoyu: 50, card: 'together', look: 'tario' },
    musuhi: { name: 'ムスヒ', note: '運動は とくいだが 人づきあいは にがて', stats: { think: 1, act: 2, relate: 0 }, maxYoyu: 50, card: 'start_now', look: 'musuhi' },
    hayatsu: { name: 'ハヤツ', note: '何でも できるが、打たれ弱い', stats: { think: 1, act: 1, relate: 1 }, maxYoyu: 36, card: 'sort_out', look: 'hayatsu' }
  };

  var STARTER = ['try_it', 'try_it', 'try_it', 'try_it', 'endure', 'endure', 'endure', 'keep_distance', 'breathe', 'talk', 'okoru', 'run_away'];
  var REWARD_POOL = ['write_plan', 'their_view', 'start_now', 'move_body', 'together', 'thanks', 'apologize', 'lead', 'name_feeling', 'sort_out', 'firm_reply', 'plan_time', 'sukkiri', 'review_notes'];

  // pass: そのターン数を乗りこえると、課題は時間とともに過ぎ去る（報酬なし。leave なら モヤモヤが のこる）。
  //   からかい・発表には付けない：放っておいても過ぎ去らない問題があることを残すため
  // moves: stress=心の余裕を n へらす／grow=問題が大きくなる（以後の stress に +n）／worry=モヤモヤを1まい まぜる
  // forms: 3つの姿の名前。view: いちばん現実の姿（2）になった時に わかる ほんとう（相性が変わる）
  var ENEMIES = {
    dunno: {
      intro: '算数の じゅぎょう中。黒板の 問題を 見ても、どうやって とけば いいのか わからない。まわりの 子は どんどん ノートに 書いている…',
      forms: ['ハテナ だいまじん', 'むずかしそうな プリント', 'わからない 1問'],
      ctx: 'study', scene: 'わからない問題', name: 'わからない問題', kind: 'normal', hp: 24,
      pass: { turns: 5, say: 'じゅぎょうが おわった。でも、わからないままだ。', leave: true },
      moves: [{ t: 'stress', n: 6, say: 'あせってくる' }, { t: 'grow', n: 2, say: 'どんどん むずかしく見えてくる' }, { t: 'stress', n: 7, say: 'まわりが すすんでいく' }],
      weak: ['relate', 'think'], resist: [], situ: ['say_dunno', 'ask_next', 'skip_it'],
      other: 'となりの子：「聞いてくれたら、すぐ 教えたのに」'
    },
    bumped: {
      intro: '休み時間、ろうかを 歩いていたら、うしろから ドンッと ぶつかられた。かたが いたい。「わざと？」と 思った しゅんかん、むかっと した。',
      forms: ['ドンッと ぶつかる かいぶつ', 'わざと ぶつかってきた？ あの子', 'よそ見して ぶつかっただけ'],
      ctx: 'conflict', scene: 'ろうかで ぶつかられた', name: 'わざと ぶつかられた？', kind: 'normal', hp: 20,
      pass: { turns: 3, say: '時間がたって、気にならなくなった。' },
      moves: [{ t: 'inject', card: 'tataku', say: '手が 出そうに なる（たたく が まざる）' }, { t: 'stress', n: 7, say: 'むかむかしてくる' }, { t: 'stress', n: 8, say: '「わざとだ」と思えてくる' }],
      weak: [], resist: ['relate'], backfire: [], situ: ['ask_ok', 'tell_hurt', 'watch_them', 'hit_back'],
      view: { truth: 'benign', name: 'よそ見して ぶつかっただけ', weak: ['relate'], resist: [], backfire: ['impulse'], stressMul: 0.5 },
      other: 'ぶつかった子：「あっ、ごめん！ 前を見てなかった」'
    },
    left_out: {
      intro: '昼休み、校庭で みんなが おにごっこを している。「入れて」と 言いたいけど、なかなか 声が 出ない…',
      forms: ['ひとりぼっちの きり', '入れてくれない グループ？', '人数が ちょうどの 遊び'],
      ctx: 'join', scene: '遊びに 入れない', name: '遊びに 入れない', kind: 'normal', hp: 28,
      pass: { turns: 4, say: '休み時間が おわった。さびしさは 少し のこった。', leave: true },
      moves: [{ t: 'stress', n: 6, say: 'さびしくなる' }, { t: 'worry', say: '「きらわれてる？」と考えてしまう' }, { t: 'stress', n: 8, say: '休み時間が おわっていく' }],
      weak: ['relate'], resist: [], backfire: ['impulse'], situ: ['let_me_in', 'invite_other', 'sulk'],
      other: '遊んでいた子：「人数が ちょうどだったから、気づかなかった」'
    },
    teased: {
      intro: 'このごろ、同じ 子たちに 何回も 同じことを 言われて わらわれる。今日も また 始まった。',
      forms: ['チクチクことばの むれ', 'わらっている 子たち', 'くり返し からかわれている'],
      ctx: 'tease', scene: 'からかわれた', name: 'からかわれた', kind: 'elite', hp: 36,
      moves: [{ t: 'inject', card: 'warukuchi', say: '言い返したく なる（悪口が まざる）' }, { t: 'stress', n: 7, say: '同じことを また言われる' }, { t: 'grow', n: 3, say: 'まわりも わらいはじめる' }, { t: 'stress', n: 9, say: '学校に 行きたくなくなる' }],
      weak: [], resist: [], backfire: ['impulse'], situ: ['say_stop', 'tell_teacher', 'wameku'],
      view: { truth: 'hostile', name: 'くり返し からかわれている', weak: ['relate'], resist: [], backfire: ['impulse'], stressMul: 1 },
      other: 'あとで 先生：「話してくれて よかった。一人で かかえなくて いいんだよ」'
    },
    presentation: {
      intro: '今日は 学習発表会。ぶたいの そでから 見ると、体育館に 人が いっぱい。次は 自分の 番だ。',
      forms: ['見つめる 大目玉', 'こっちを見る みんな', 'ふつうに 聞いている クラスの みんな'],
      ctx: 'stage', scene: 'みんなの前で 発表', name: 'みんなの前で 発表', kind: 'boss', hp: 42, anxiety: true,
      moves: [{ t: 'stress', n: 7, say: '心ぞうが どきどきする' }, { t: 'inject', card: 'panic', say: '頭が まっ白に なりそう（パニックが まざる）' }, { t: 'stress', n: 9, say: 'みんなが こっちを見る' }, { t: 'worry', say: '「まちがえたら どうしよう」' }, { t: 'grow', n: 2, say: '声が 小さくなってくる' }],
      weak: ['think'], resist: [], backfire: [], situ: ['read_memo', 'breathe_first', 'friend_face', 'give_up'],
      other: '聞いていた子：「さいごまで 言えてて すごかった」'
    }
  };

  // ===== 層ごとの ボスと 関連する課題 =====
  ENEMIES.test = {
      intro: '今日は 算数の テスト。つくえの 上に テスト用紙が くばられた。「はじめ」の 声が かかる。',
    forms: ['100点の 大まじん', 'むずかしそうな テスト用紙', 'いつもの 小テスト'],
    ctx: 'study', scene: 'テスト', kind: 'boss', hp: 42,
    moves: [{ t: 'stress', n: 7, say: '時間が どんどん へっていく' }, { t: 'inject', card: 'panic', say: '頭が まっ白に なりそう（パニックが まざる）' }, { t: 'stress', n: 9, say: 'まわりの えんぴつの 音が 気になる' }, { t: 'worry', say: '「わからない 問題が ある…」' }],
    weak: ['think'], resist: [], backfire: [], situ: ['review_notes', 'breathe_first', 'give_up'],
    other: '先生：「さいごまで あきらめずに 見直したね」'
  };
  ENEMIES.homework = {
      intro: '気づいたら、今日までの 提出物が 大量に たまっている…。漢字ドリル、計算プリント、音読カード。どれから 手を つけよう。',
    forms: ['しゅくだい 大なだれ', 'つみ上がった プリント', '今日の 宿題 2まい'],
    ctx: 'study', scene: '宿題の 山', kind: 'normal', hp: 26,
    moves: [{ t: 'stress', n: 6, say: '「まだ こんなに ある…」' }, { t: 'grow', n: 2, say: 'ねる時間が 近づく' }, { t: 'stress', n: 7, say: 'あそびたい 気もちが じゃまをする' }],
    weak: ['think', 'act'], resist: [], backfire: [], situ: ['plan_time', 'put_off'],
    other: 'お家の人：「先に やって えらいね」'
  };
  ENEMIES.forgot_item = {
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
    ctx: 'conflict', scene: '友だちと 大げんか', kind: 'boss', hp: 55,
    moves: [{ t: 'inject', card: 'tataku', say: '手が 出そうに なる（たたく が まざる）' }, { t: 'stress', n: 9, say: '口を きいて くれない' }, { t: 'grow', n: 3, say: 'ほかの子も まきこまれる' }, { t: 'stress', n: 10, say: 'さびしくて むかむかする' }, { t: 'worry', say: '「もう 友だちじゃ ないのかな」' }],
    weak: [], resist: ['relate'], backfire: ['impulse'], situ: ['tell_feeling', 'keep_distance', 'ignore_back'],
    view: { truth: 'benign', weak: ['relate'], resist: [], backfire: ['impulse'], stressMul: 0.8 },
    other: '友だち：「じつは こっちも あやまりたかった」'
  };
  ENEMIES.misunder = {
      intro: '友だちに 言われた 一言が 気に なる。「それって、どういう いみ？」 なんだか 悪く 言われた 気が する。',
    forms: ['もやもや 二面ぐも', 'ちがう話を している 二人', '言い方の ちがい'],
    ctx: 'conflict', scene: 'かんちがい', kind: 'normal', hp: 24,
    moves: [{ t: 'stress', n: 7, say: '「なんで そんなこと 言うの」' }, { t: 'grow', n: 2, say: '話が どんどん ずれていく' }],
    weak: [], resist: ['relate'], backfire: ['impulse'], situ: ['ask_meaning', 'okoru'],
    view: { truth: 'benign', weak: ['relate'], resist: [], backfire: ['impulse'], stressMul: 0.6 },
    other: '友だち：「あ、そういう いみじゃ なかったんだ！」'
  };
  ENEMIES.rumor = {
      intro: 'トイレの 前で、何人かが ひそひそ 話を している。自分の 名前が 聞こえた 気が した…',
    forms: ['ひそひそ こうもり', 'こそこそ 話す 子たち', 'ただの うわさ話'],
    ctx: 'tease', scene: 'かげ口を 聞いた', kind: 'normal', hp: 24,
    moves: [{ t: 'inject', card: 'warukuchi', say: '言い返したく なる（悪口が まざる）' }, { t: 'stress', n: 7, say: '聞こえないように 話している' }, { t: 'worry', say: '「自分の ことかも…」' }, { t: 'stress', n: 8, say: 'うわさが 広がっていく' }],
    weak: ['relate'], resist: [], backfire: ['impulse'], situ: ['not_join', 'tell_teacher', 'spread'],
    other: '先生：「話に のらずに いてくれて ありがとう」'
  };
  ENEMIES.practice = {
      intro: '発表会の 練習。何回 やっても、同じ ところで まちがえてしまう。本番まで あと少し。',
    forms: ['しっぱい ループ大へび', '何度も つまずく 練習', 'あと少しの 練習'],
    ctx: 'stage', scene: '練習が うまくいかない', kind: 'normal', hp: 28,
    moves: [{ t: 'stress', n: 7, say: 'また まちがえた' }, { t: 'grow', n: 2, say: '本番が 近づく' }, { t: 'stress', n: 8, say: '「みんなは できてるのに」' }],
    weak: ['act'], resist: [], backfire: [], situ: ['practice_again', 'quit_it'],
    other: '先生：「くり返し 練習したから、できるように なったね」'
  };
  ENEMIES.team = {
      intro: 'グループで 発表の テーマを 決める 時間。みんな 言いたいことが ちがって、話が まとまらない。',
    forms: ['バラバラ 四つ頭', '言い合う グループ', '意見が ちがう だけの なかま'],
    ctx: 'join', scene: 'グループで 意見が 合わない', kind: 'normal', hp: 30,
    moves: [{ t: 'stress', n: 7, say: 'みんな 自分の 意見を ゆずらない' }, { t: 'grow', n: 2, say: '時間が なくなっていく' }, { t: 'stress', n: 8, say: '声が 大きくなる' }],
    weak: [], resist: ['impulse'], backfire: ['impulse'], situ: ['listen_all', 'vote', 'force_own'],
    view: { truth: 'benign', weak: ['relate', 'think'], resist: [], backfire: ['impulse'], stressMul: 0.7 },
    other: 'グループの子：「みんなの 意見が 入って よかった」'
  };

  // あぶない場面（ときどき 課題の代わりに出る）。戦って勝つのは ほぼ無理で、はなれる・にげる・大人をよぶ が正解
  ENEMIES.fight_near = {
      intro: 'げた箱の 近くで、上級生どうしが 大声で 言い合いを している。おしたり おされたり、今にも ケンカに なりそうだ。',
    forms: ['あばれる 大あらし', 'もめている 上級生たち', 'ケンカ中の 上級生'],
    ctx: 'danger', scene: '上級生の ケンカに まきこまれそう', kind: 'danger', hp: 80, escapeOk: true,
    moves: [{ t: 'inject', card: 'panic', say: '頭が まっ白に なりそう（パニックが まざる）' }, { t: 'stress', n: 11, say: 'どなり声が 近づいてくる' }, { t: 'grow', n: 4, say: 'まわりも さわぎはじめる' }, { t: 'stress', n: 13, say: 'おされて ころびそう' }],
    weak: [], resist: ['relate', 'think', 'act'], backfire: ['impulse'], situ: ['call_adult', 'run_now'],
    other: '先生：「はなれて 知らせてくれて ありがとう。あぶない ところに 入らなかったのは 正しい」'
  };
  ENEMIES.stranger = {
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
    { name: '教室', boss: 'test', related: ['dunno', 'homework', 'forgot_item'], others: ['bumped', 'left_out'], elites: ['teased'], dangers: ['fight_near', 'stranger'], events: ['forgot', 'friend_trouble', 'library', 'family_talk'] },
    { name: '友だち', boss: 'friend_fight', related: ['misunder', 'bumped', 'rumor'], others: ['left_out', 'dunno'], elites: ['teased'], dangers: ['fight_near', 'stranger'], events: ['friend_trouble', 'library', 'family_talk'] },
    { name: '行事', boss: 'presentation', related: ['practice', 'team'], others: ['left_out', 'rumor'], elites: ['teased'], dangers: ['fight_near', 'stranger'], events: ['library', 'family_talk', 'friend_trouble'] }
  ];
  var MAP = { rows: 7, cols: 4, paths: 3, relatedShare: 0.5, hearts: 3, heartHp: 0.22, heartStress: 0.2, bossBase: 1.35, actHeal: 1 };

  var TEXT = {
    title: 'こころの 冒険',
    lose: 'つかれちゃった。でも、ナイストライ！',
    win: 'さいごまで たどりついた！',
    failCause: ['今日は タイミングが 合わなかった。', '相手の じゅんびが まだだった。', 'こういう日も ある。'],
    curseGained: 'モヤモヤが デッキに 入った。',
    stressIntrude: '心の余裕が へって、「カッとなる」が 手札に まざった。'
  };

  Object.keys(ENEMIES).forEach(function (k) {
    var e = ENEMIES[k];
    e.situ.forEach(function (id) {
      var c = CARDS[id];
      if (!c.ctx) c.ctx = [];
      if (c.autoCtx !== false && c.ctx.indexOf(e.ctx) < 0 && !c.unplayable) { c.ctx.push(e.ctx); c.autoCtx = true; }
    });
  });

  var DATA = { ADVANCED: ADVANCED, HEROES: HEROES, TROUBLE_OF: TROUBLE_OF, TROUBLE_RANK: TROUBLE_RANK, MAP: MAP, FORMS: FORMS, TEACHER_CARDS: TEACHER_CARDS, FRIEND_CARDS: FRIEND_CARDS, SUPPORTS: SUPPORTS, SUPPORT_RULES: SUPPORT_RULES, CTX_LABEL: CTX_LABEL, STATS: STATS, TYPE_LABEL: TYPE_LABEL, CHANCE: CHANCE, PLAYER: PLAYER, RULES: RULES, CARDS: CARDS, STARTER: STARTER, REWARD_POOL: REWARD_POOL, ENEMIES: ENEMIES, EVENTS: EVENTS, ACTS: ACTS, TEXT: TEXT };
  if (typeof module !== 'undefined' && module.exports) module.exports = DATA;
  else root.SST_DATA = DATA;
})(this);
