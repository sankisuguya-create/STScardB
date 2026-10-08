// 課題の「ほんとうの姿」（form 2）の SVG。
// 人物の姿勢・視線・場面小物を使い、色だけに頼らず状況を読み取れる絵にする。
(function (root) {
  'use strict';

  var LINE = '#12172a', SKIN = '#f6cfa8';
  var C = {
    red: '#e5484d', cheek: '#f2a0a0', blue: '#3b5bdb',
    pale: '#a7b2c8', yellow: '#ffd23f', green: '#2b8a3e',
    orange: '#f08c3a', purple: '#3d2f63', paper: '#fff'
  };

  var MOUTHS = {
    smile: '<path d="M-8 6 Q0 13 8 6" fill="none" stroke="' + LINE + '" stroke-width="3" stroke-linecap="round"/>',
    laugh: '<path d="M-10 4 Q0 18 10 4 Z" fill="' + C.red + '" stroke="' + LINE + '" stroke-width="3" stroke-linejoin="round"/>',
    o: '<ellipse cx="0" cy="8" rx="4" ry="5" fill="' + C.red + '" stroke="' + LINE + '" stroke-width="3"/>',
    worried: '<path d="M-8 11 Q0 4 8 11" fill="none" stroke="' + LINE + '" stroke-width="3" stroke-linecap="round"/>',
    flat: '<path d="M-6 8 H6" stroke="' + LINE + '" stroke-width="3" stroke-linecap="round"/>',
    angry: '<path d="M-8 10 Q0 2 8 10" fill="none" stroke="' + LINE + '" stroke-width="3" stroke-linecap="round"/><path d="M-16 -14 L-5 -9 M16 -14 L5 -9" stroke="' + LINE + '" stroke-width="3" stroke-linecap="round" transform="translate(0 -2)"/>'
  };

  function armPath(pose) {
    if (pose === 'up') return 'M-24 -48 L-40 -78 M24 -48 L40 -78';
    if (pose === 'reach') return 'M-24 -48 L-48 -60 M24 -48 L38 -24';
    if (pose === 'point') return 'M-24 -48 L-44 -58 M24 -48 L48 -72';
    if (pose === 'open') return 'M-24 -48 L-48 -58 M24 -48 L48 -58';
    if (pose === 'clap') return 'M-24 -48 L-12 -60 M24 -48 L12 -60';
    return '';
  }

  function person(x, y, scale, options) {
    options = options || {};
    var hair = options.hair || '#6b4226';
    var shirt = options.shirt || '#3b6fd8';
    var mouth = MOUTHS[options.mouth] || MOUTHS.smile;
    var arms = armPath(options.pose);
    var headTurn = options.look === 'left' ? 'rotate(-8)' : options.look === 'right' ? 'rotate(8)' : '';
    var limbs = arms
      ? '<path d="' + arms + '" fill="none" stroke="' + LINE + '" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<path d="' + arms + '" fill="none" stroke="' + SKIN + '" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>'
      : '<path d="M-24 -48 L-29 -10 M24 -48 L29 -10" fill="none" stroke="' + LINE + '" stroke-width="13" stroke-linecap="round"/>' +
        '<path d="M-24 -48 L-29 -10 M24 -48 L29 -10" fill="none" stroke="' + SKIN + '" stroke-width="7" stroke-linecap="round"/>';
    var gaze = options.look === 'left' ? -4 : options.look === 'right' ? 4 : 0;

    return '<g transform="translate(' + x + ' ' + y + ') scale(' + scale + ')">' +
      limbs +
      '<path d="M-27 0 V-38 Q-27 -58 0 -58 Q27 -58 27 -38 V0 Z" fill="' + shirt + '" stroke="' + LINE + '" stroke-width="4" stroke-linejoin="round"/>' +
      '<g transform="translate(0 -84) ' + headTurn + '">' +
      '<circle r="26" fill="' + SKIN + '" stroke="' + LINE + '" stroke-width="4"/>' +
      '<path d="M-26 -2 Q-29 -29 0 -30 Q29 -28 26 -1 Q13 -16 -4 -14 Q-18 -12 -26 -2 Z" fill="' + hair + '" stroke="' + LINE + '" stroke-width="4" stroke-linejoin="round"/>' +
      (options.glasses ? '<circle cx="-9" cy="-1" r="7" fill="none" stroke="' + LINE + '" stroke-width="3"/><circle cx="9" cy="-1" r="7" fill="none" stroke="' + LINE + '" stroke-width="3"/>' : '') +
      '<circle cx="' + (-9 + gaze) + '" cy="-1" r="3" fill="' + LINE + '"/><circle cx="' + (9 + gaze) + '" cy="-1" r="3" fill="' + LINE + '"/>' +
      '<circle cx="-16" cy="7" r="3.5" fill="' + C.cheek + '" opacity=".7"/><circle cx="16" cy="7" r="3.5" fill="' + C.cheek + '" opacity=".7"/>' +
      '<g transform="translate(0 5)">' + mouth + '</g></g></g>';
  }

  function workbook() {
    return '<g transform="rotate(-5 100 96)">' +
      '<rect x="39" y="18" width="122" height="150" rx="7" fill="' + C.paper + '" stroke="' + LINE + '" stroke-width="5"/>' +
      '<path d="M57 44 H143 M57 63 H143 M57 82 H126 M57 111 H92 M57 132 H92" stroke="' + C.pale + '" stroke-width="5" stroke-linecap="round"/>' +
      '<text x="104" y="132" font-size="31" font-family="sans-serif" font-weight="700" fill="' + C.blue + '">?</text>' +
      '</g><path d="M150 44 l8 -9 M158 55 l11 -2" stroke="' + C.yellow + '" stroke-width="5" stroke-linecap="round"/>';
  }

  function bumped() {
    return person(100, 181, 1.05, { mouth: 'o', shirt: C.green, pose: 'up', look: 'left' }) +
      '<path d="M52 82 l-14 -8 M55 95 l-15 2 M144 70 l12 -9" stroke="' + C.yellow + '" stroke-width="5" stroke-linecap="round"/>';
  }

  function leftOut() {
    return person(55, 177, .78, { mouth: 'laugh', shirt: C.orange, look: 'right' }) +
      person(145, 177, .78, { mouth: 'laugh', shirt: '#3b6fd8', hair: '#d9a400', look: 'left' }) +
      '<circle cx="100" cy="161" r="11" fill="' + C.yellow + '" stroke="' + LINE + '" stroke-width="4"/>' +
      '<path d="M94 161 Q100 151 106 161 Q100 171 94 161" fill="none" stroke="' + LINE + '" stroke-width="2"/>' +
      person(100, 186, .68, { mouth: 'worried', shirt: '#7a4b2a', look: 'right' });
  }

  function teased() {
    return person(58, 184, .78, { mouth: 'worried', shirt: '#3b6fd8', pose: 'reach', look: 'right' }) +
      person(142, 178, .72, { mouth: 'laugh', shirt: '#f08c3a', hair: '#d9a400', pose: 'point', look: 'left' }) +
      person(173, 181, .55, { mouth: 'laugh', shirt: '#2b8a3e', hair: '#2a2a2a', pose: 'clap', look: 'left' });
  }

  function audiencePerson(x, y, scale, shirt, hair) {
    return person(x, y, scale, { mouth: 'smile', shirt: shirt, hair: hair, look: 'left' });
  }

  function presentation() {
    return '<path d="M16 157 H184" stroke="' + C.pale + '" stroke-width="4"/>' +
      '<rect x="22" y="45" width="33" height="77" rx="3" fill="#f7e7bd" stroke="' + LINE + '" stroke-width="4"/>' +
      '<path d="M29 62 H48 M29 72 H46 M29 82 H48" stroke="' + C.pale + '" stroke-width="3"/>' +
      audiencePerson(39, 185, .47, '#3b6fd8', '#6b4226') +
      audiencePerson(165, 185, .47, C.orange, '#d9a400') +
      audiencePerson(67, 185, .5, C.green, '#2a2a2a') +
      audiencePerson(133, 185, .5, '#9b7fe0', '#6b4226') +
      person(101, 179, .86, { mouth: 'worried', shirt: '#3b6fd8', pose: 'open', look: 'left' });
  }

  function fightNear() {
    return person(59, 184, .88, { mouth: 'angry', shirt: C.red, hair: '#2a2a2a', pose: 'reach', look: 'right' }) +
      person(141, 184, .88, { mouth: 'angry', shirt: '#5c6b8a', pose: 'reach', look: 'left' }) +
      '<path d="M96 44 l8 14 -10 2 8 14" fill="none" stroke="' + C.yellow + '" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"/>';
  }

  // 知らない大人は穏やかな表情のまま描き、危険の判断を見た目に結びつけない。
  function stranger() {
    return '<path d="M35 178 H165" stroke="' + C.pale + '" stroke-width="4"/>' +
      person(111, 187, 1.04, { mouth: 'smile', shirt: '#4a4f63', hair: '#6e7781', glasses: true, pose: 'open' }) +
      '<path d="M79 83 Q111 52 143 83 Z" fill="' + C.purple + '" stroke="' + LINE + '" stroke-width="4" stroke-linejoin="round"/>' +
      '<rect x="72" y="80" width="78" height="8" rx="4" fill="' + C.purple + '" stroke="' + LINE + '" stroke-width="4"/>';
  }

  var SCENES = {
    dunno: workbook,
    bumped: bumped,
    left_out: leftOut,
    teased: teased,
    presentation: presentation,
    fight_near: fightNear,
    stranger: stranger
  };

  var LABELS = {
    dunno: 'わからない問題のプリント',
    bumped: 'ろうかでぶつかって驚いた子',
    left_out: '遊びの輪に入れない子',
    teased: 'からかわれて困っている子と、笑っている子',
    presentation: '発表する子と、聞いているクラスの子',
    fight_near: 'けんかをしている二人',
    stranger: '道で出会った知らない大人'
  };

  // 課題IDと描画シーンを明示的に対応づける。
  var ENEMY_ILLUSTRATIONS = {
    dunno: 'dunno',
    bumped: 'bumped',
    left_out: 'left_out',
    teased: 'teased',
    presentation: 'presentation',
    fight_near: 'fight_near',
    stranger: 'stranger'
  };

  function svg(enemyId) {
    var sceneId = ENEMY_ILLUSTRATIONS[enemyId];
    var scene = sceneId && SCENES[sceneId];
    if (!scene) return null;
    return '<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="' + LABELS[enemyId] + '">' + scene() + '</svg>';
  }

  root.SST_ILLUST = { svg: svg };
})(this);
