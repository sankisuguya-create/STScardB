// 課題の「ほんとうの姿」（form 2）の SVG。ドット絵のかいぶつと対比して、くっきりした線で描く。
(function (root) {
  'use strict';
  var LINE = '#12172a', SKIN = '#f6cfa8';

  // 子ども1人（中心 x、足もと y、大きさ k）。mouth: smile / laugh / o / flat
  function kid(x, y, k, o) {
    o = o || {};
    var hair = o.hair || '#6b4226', shirt = o.shirt || '#3b6fd8', mouth = o.mouth || 'smile';
    var m = {
      smile: '<path d="M-8 6 Q0 13 8 6" fill="none" stroke="' + LINE + '" stroke-width="3" stroke-linecap="round"/>',
      laugh: '<path d="M-10 4 Q0 18 10 4 Z" fill="#e5484d" stroke="' + LINE + '" stroke-width="3" stroke-linejoin="round"/>',
      o: '<ellipse cx="0" cy="8" rx="4" ry="5" fill="#e5484d" stroke="' + LINE + '" stroke-width="3"/>',
      flat: '<path d="M-6 8 H6" stroke="' + LINE + '" stroke-width="3" stroke-linecap="round"/>'
    }[mouth];
    var arms = o.armsUp
      ? '<path d="M-26 -50 L-42 -82 M26 -50 L42 -82" stroke="' + LINE + '" stroke-width="15" stroke-linecap="round"/><path d="M-26 -50 L-42 -82 M26 -50 L42 -82" stroke="' + SKIN + '" stroke-width="8" stroke-linecap="round"/>'
      : '';
    return '<g transform="translate(' + x + ' ' + y + ') scale(' + k + ')">' +
      arms +
      '<path d="M-30 0 V-38 Q-30 -62 0 -62 Q30 -62 30 -38 V0 Z" fill="' + shirt + '" stroke="' + LINE + '" stroke-width="4" stroke-linejoin="round"/>' +
      '<g transform="translate(0 -90)">' +
      '<circle r="28" fill="' + SKIN + '" stroke="' + LINE + '" stroke-width="4"/>' +
      '<path d="M-28 -2 Q-30 -32 0 -32 Q30 -32 28 -2 Q16 -18 -4 -16 Q-20 -14 -28 -2 Z" fill="' + hair + '" stroke="' + LINE + '" stroke-width="4" stroke-linejoin="round"/>' +
      (o.glasses ? '<circle cx="-10" cy="-2" r="8" fill="none" stroke="' + LINE + '" stroke-width="3"/><circle cx="10" cy="-2" r="8" fill="none" stroke="' + LINE + '" stroke-width="3"/>' : '') +
      '<circle cx="-10" cy="-2" r="3.5" fill="' + LINE + '"/><circle cx="10" cy="-2" r="3.5" fill="' + LINE + '"/>' +
      '<circle cx="-17" cy="8" r="4" fill="#f2a0a0" opacity=".7"/><circle cx="17" cy="8" r="4" fill="#f2a0a0" opacity=".7"/>' +
      '<g transform="translate(0 6)">' + m + '</g>' +
      '</g></g>';
  }

  var ART = {
    // 1問の わからない問題：プリント1まい
    dunno: '<rect x="44" y="18" width="112" height="148" rx="8" fill="#fff" stroke="' + LINE + '" stroke-width="5"/>' +
      '<path d="M62 46 H138 M62 66 H138 M62 86 H120 M62 116 H96 M62 136 H96" stroke="#a7b2c8" stroke-width="6" stroke-linecap="round"/>' +
      '<path d="M112 112 Q112 100 124 100 Q136 100 136 112 Q136 120 126 124 V132" fill="none" stroke="#3b5bdb" stroke-width="6" stroke-linecap="round"/><circle cx="126" cy="146" r="4.5" fill="#3b5bdb"/>',
    // よそ見して ぶつかっただけ：あわてている子
    bumped: kid(100, 178, 1.15, { mouth: 'o', shirt: '#2b8a3e', armsUp: true }) +
      '<path d="M150 70 l10 -8 M156 84 l14 -2" stroke="' + LINE + '" stroke-width="4" stroke-linecap="round"/>',
    // 人数が ちょうどの 遊び：2人とボール
    left_out: kid(58, 178, .9, { mouth: 'laugh', shirt: '#f08c3a' }) + kid(142, 178, .9, { mouth: 'laugh', shirt: '#3b6fd8', hair: '#d9a400' }) +
      '<circle cx="100" cy="172" r="12" fill="#e5484d" stroke="' + LINE + '" stroke-width="4"/><path d="M88 172 H112" stroke="' + LINE + '" stroke-width="3"/>',
    // くり返し からかわれている：わらっている2人（ふつうの子として描く）
    teased: kid(62, 178, .9, { mouth: 'laugh', shirt: '#5c6b8a' }) + kid(138, 178, .9, { mouth: 'laugh', shirt: '#9b7fe0', hair: '#2a2a2a' }),
    // ふつうに 聞いている クラスの みんな：3人
    presentation: kid(48, 182, .72, { mouth: 'smile', shirt: '#3b6fd8' }) + kid(152, 182, .72, { mouth: 'smile', shirt: '#f08c3a', hair: '#d9a400' }) +
      kid(100, 168, .8, { mouth: 'smile', shirt: '#2b8a3e', hair: '#2a2a2a' })
  };

  function svg(id) {
    if (!ART[id]) return null;
    return '<svg viewBox="0 0 200 190" xmlns="http://www.w3.org/2000/svg" role="img">' + ART[id] + '</svg>';
  }

  root.SST_ILLUST = { svg: svg };
})(this);
