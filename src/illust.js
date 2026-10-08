// 課題の「ほんとうの姿」（form 2）の SVG。
// 人物パーツ・場面の組み立て・SVG 文書を分け、人物の見た目を一か所で調整できるようにする。
(function (root) {
  'use strict';

  var LINE = '#12172a';
  var SKIN = '#f6cfa8';
  var PALETTE = {
    ink: LINE,
    skin: SKIN,
    red: '#e5484d',
    cheek: '#f2a0a0',
    question: '#3b5bdb',
    paperLine: '#a7b2c8',
    ball: '#e5484d',
    lightning: '#e0a800',
    hat: '#3d2f63'
  };

  // 表情パーツは名前で選択する。未知の値は既定の笑顔に戻す。
  var MOUTHS = {
    smile: '<path d="M-8 6 Q0 13 8 6" fill="none" stroke="' + LINE + '" stroke-width="3" stroke-linecap="round"/>',
    laugh: '<path d="M-10 4 Q0 18 10 4 Z" fill="' + PALETTE.red + '" stroke="' + LINE + '" stroke-width="3" stroke-linejoin="round"/>',
    surprised: '<ellipse cx="0" cy="8" rx="4" ry="5" fill="' + PALETTE.red + '" stroke="' + LINE + '" stroke-width="3"/>',
    flat: '<path d="M-6 8 H6" stroke="' + LINE + '" stroke-width="3" stroke-linecap="round"/>',
    angry: '<path d="M-8 10 Q0 2 8 10" fill="none" stroke="' + LINE + '" stroke-width="3" stroke-linecap="round"/><path d="M-16 -14 L-5 -9 M16 -14 L5 -9" stroke="' + LINE + '" stroke-width="3" stroke-linecap="round" transform="translate(0 -2)"/>'
  };

  function face(options) {
    var mouth = MOUTHS[options.mouth] || MOUTHS.smile;
    return '<g transform="translate(0 -90)">' +
      '<circle r="28" fill="' + SKIN + '" stroke="' + LINE + '" stroke-width="4"/>' +
      '<path d="M-28 -2 Q-30 -32 0 -32 Q30 -32 28 -2 Q16 -18 -4 -16 Q-20 -14 -28 -2 Z" fill="' + options.hair + '" stroke="' + LINE + '" stroke-width="4" stroke-linejoin="round"/>' +
      (options.glasses ? '<circle cx="-10" cy="-2" r="8" fill="none" stroke="' + LINE + '" stroke-width="3"/><circle cx="10" cy="-2" r="8" fill="none" stroke="' + LINE + '" stroke-width="3"/>' : '') +
      '<circle cx="-10" cy="-2" r="3.5" fill="' + LINE + '"/><circle cx="10" cy="-2" r="3.5" fill="' + LINE + '"/>' +
      '<circle cx="-17" cy="8" r="4" fill="' + PALETTE.cheek + '" opacity=".7"/><circle cx="17" cy="8" r="4" fill="' + PALETTE.cheek + '" opacity=".7"/>' +
      '<g transform="translate(0 6)">' + mouth + '</g></g>';
  }

  // 人物：中心座標・足元・倍率と、髪/服/表情の差分だけを受け取る。
  function kid(x, y, scale, options) {
    options = options || {};
    var hair = options.hair || '#6b4226';
    var shirt = options.shirt || '#3b6fd8';
    var arms = options.armsUp
      ? '<path d="M-26 -50 L-42 -82 M26 -50 L42 -82" stroke="' + LINE + '" stroke-width="15" stroke-linecap="round"/><path d="M-26 -50 L-42 -82 M26 -50 L42 -82" stroke="' + SKIN + '" stroke-width="8" stroke-linecap="round"/>'
      : '';
    return '<g transform="translate(' + x + ' ' + y + ') scale(' + scale + ')">' + arms +
      '<path d="M-30 0 V-38 Q-30 -62 0 -62 Q30 -62 30 -38 V0 Z" fill="' + shirt + '" stroke="' + LINE + '" stroke-width="4" stroke-linejoin="round"/>' +
      face({ hair: hair, mouth: options.mouth, glasses: options.glasses }) +
      '</g>';
  }

  function paper() {
    return '<rect x="44" y="18" width="112" height="148" rx="8" fill="#fff" stroke="' + LINE + '" stroke-width="5"/>' +
      '<path d="M62 46 H138 M62 66 H138 M62 86 H120 M62 116 H96 M62 136 H96" stroke="' + PALETTE.paperLine + '" stroke-width="6" stroke-linecap="round"/>' +
      '<path d="M112 112 Q112 100 124 100 Q136 100 136 112 Q136 120 126 124 V132" fill="none" stroke="' + PALETTE.question + '" stroke-width="6" stroke-linecap="round"/><circle cx="126" cy="146" r="4.5" fill="' + PALETTE.question + '"/>';
  }

  function bumped() {
    return kid(100, 178, 1.15, { mouth: 'surprised', shirt: '#2b8a3e', armsUp: true }) +
      '<path d="M150 70 l10 -8 M156 84 l14 -2" stroke="' + LINE + '" stroke-width="4" stroke-linecap="round"/>';
  }

  function leftOut() {
    return kid(58, 178, .9, { mouth: 'laugh', shirt: '#f08c3a' }) +
      kid(142, 178, .9, { mouth: 'laugh', shirt: '#3b6fd8', hair: '#d9a400' }) +
      '<circle cx="100" cy="172" r="12" fill="' + PALETTE.ball + '" stroke="' + LINE + '" stroke-width="4"/><path d="M88 172 H112" stroke="' + LINE + '" stroke-width="3"/>';
  }

  function teased() {
    return kid(62, 178, .9, { mouth: 'laugh', shirt: '#5c6b8a' }) +
      kid(138, 178, .9, { mouth: 'laugh', shirt: '#9b7fe0', hair: '#2a2a2a' });
  }

  function presentation() {
    return kid(48, 182, .72, { mouth: 'smile', shirt: '#3b6fd8' }) +
      kid(152, 182, .72, { mouth: 'smile', shirt: '#f08c3a', hair: '#d9a400' }) +
      kid(100, 168, .8, { mouth: 'smile', shirt: '#2b8a3e', hair: '#2a2a2a' });
  }

  function fightNear() {
    return kid(60, 184, 1, { mouth: 'angry', shirt: '#c92a2a', hair: '#2a2a2a' }) +
      kid(140, 184, 1, { mouth: 'angry', shirt: '#5c6b8a' }) +
      '<path d="M96 40 l8 14 -10 2 8 14" fill="none" stroke="' + PALETTE.lightning + '" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/>';
  }

  // 見た目だけで危険と決めつけないため、知らない大人も穏やかな表情にする。
  function stranger() {
    return kid(100, 186, 1.25, { mouth: 'smile', shirt: '#4a4f63', hair: '#6e7781', glasses: true }) +
      '<path d="M62 52 Q100 24 138 52 Z" fill="' + PALETTE.hat + '" stroke="' + LINE + '" stroke-width="4" stroke-linejoin="round"/><rect x="56" y="50" width="88" height="8" rx="4" fill="' + PALETTE.hat + '" stroke="' + LINE + '" stroke-width="4"/>';
  }

  var SCENES = {
    dunno: paper,
    bumped: bumped,
    left_out: leftOut,
    teased: teased,
    presentation: presentation,
    fight_near: fightNear,
    stranger: stranger
  };

  function svg(id) {
    var scene = SCENES[id];
    if (!scene) return null;
    return '<svg viewBox="0 0 200 190" xmlns="http://www.w3.org/2000/svg" role="img">' + scene() + '</svg>';
  }

  root.SST_ILLUST = { svg: svg };
})(this);
