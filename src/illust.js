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
      flat: '<path d="M-6 8 H6" stroke="' + LINE + '" stroke-width="3" stroke-linecap="round"/>',
      angry: '<path d="M-8 10 Q0 2 8 10" fill="none" stroke="' + LINE + '" stroke-width="3" stroke-linecap="round"/><path d="M-16 -14 L-5 -9 M16 -14 L5 -9" stroke="' + LINE + '" stroke-width="3" stroke-linecap="round" transform="translate(0 -2)"/>'
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

  ART.fight_near = kid(60, 184, 1.0, { mouth: 'angry', shirt: '#c92a2a', hair: '#2a2a2a' }) + kid(140, 184, 1.0, { mouth: 'angry', shirt: '#5c6b8a' }) +
    '<path d="M96 40 l8 14 -10 2 8 14" fill="none" stroke="#e0a800" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/>';
  // 知らない大人：こわい顔にはしない（見た目では わからない、を残す）
  ART.stranger = kid(100, 186, 1.25, { mouth: 'smile', shirt: '#4a4f63', hair: '#6e7781', glasses: true }) +
    '<path d="M62 52 Q100 24 138 52 Z" fill="#3d2f63" stroke="' + LINE + '" stroke-width="4" stroke-linejoin="round"/><rect x="56" y="50" width="88" height="8" rx="4" fill="#3d2f63" stroke="' + LINE + '" stroke-width="4"/>';

  function paper(x, y, w, h, lines) {
    var s = '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="6" fill="#fff" stroke="' + LINE + '" stroke-width="5"/>';
    for (var i = 0; i < lines; i++) s += '<path d="M' + (x + 14) + ' ' + (y + 22 + i * 18) + ' H' + (x + w - 16) + '" stroke="#a7b2c8" stroke-width="6" stroke-linecap="round"/>';
    return s;
  }
  ART.test = paper(48, 14, 104, 160, 6) + '<circle cx="128" cy="34" r="14" fill="none" stroke="#e5484d" stroke-width="5"/><path d="M60 40 h10 M60 76 h10 M60 112 h10" stroke="' + LINE + '" stroke-width="5"/>';
  ART.homework = paper(36, 52, 104, 120, 4) + paper(60, 30, 104, 120, 5) + '<path d="M150 20 L166 70" stroke="#e0a800" stroke-width="10" stroke-linecap="round"/><path d="M150 20 L166 70" stroke="' + LINE + '" stroke-width="2"/>';
  ART.forgot_item = '<rect x="48" y="50" width="104" height="120" rx="16" fill="#e5484d" stroke="' + LINE + '" stroke-width="5"/><rect x="64" y="28" width="72" height="34" rx="10" fill="none" stroke="' + LINE + '" stroke-width="7"/><rect x="72" y="90" width="56" height="34" rx="6" fill="#b52a32" stroke="' + LINE + '" stroke-width="4"/><rect x="92" y="100" width="16" height="10" rx="2" fill="#ffd23f" stroke="' + LINE + '" stroke-width="3"/>' +
    '<text x="150" y="48" font-size="34" font-weight="900" fill="#3b5bdb">?</text>';
  ART.friend_fight = kid(62, 184, 1.0, { mouth: 'flat', shirt: '#3b6fd8' }) + kid(140, 184, 1.0, { mouth: 'flat', shirt: '#f08c3a', hair: '#d9a400' }) +
    '<path d="M100 30 c-10 -14 -30 -6 -22 10 l22 22 22 -22 c8 -16 -12 -24 -22 -10 z" fill="#f2a0a0" stroke="' + LINE + '" stroke-width="4"/>';
  ART.misunder = kid(56, 184, .95, { mouth: 'o', shirt: '#2f9e55' }) + kid(144, 184, .95, { mouth: 'flat', shirt: '#9b7fe0', hair: '#2a2a2a' }) +
    '<rect x="20" y="10" width="70" height="40" rx="18" fill="#fff" stroke="' + LINE + '" stroke-width="4"/><rect x="112" y="14" width="70" height="40" rx="18" fill="#fff" stroke="' + LINE + '" stroke-width="4"/>' +
    '<circle cx="42" cy="30" r="4" fill="' + LINE + '"/><circle cx="56" cy="30" r="4" fill="' + LINE + '"/><circle cx="70" cy="30" r="4" fill="' + LINE + '"/><path d="M140 34 q8 -14 16 0 t16 0" fill="none" stroke="#3b5bdb" stroke-width="4"/>';
  ART.rumor = kid(70, 184, .95, { mouth: 'smile', shirt: '#5c6b8a' }) + kid(130, 184, .95, { mouth: 'smile', shirt: '#9b7fe0', hair: '#d9a400' }) +
    '<ellipse cx="100" cy="92" rx="10" ry="14" fill="#f6cfa8" stroke="' + LINE + '" stroke-width="4"/>';
  ART.practice = kid(84, 186, 1.15, { mouth: 'flat', shirt: '#3b6fd8' }) +
    '<rect x="132" y="64" width="12" height="96" rx="5" fill="#f4efe2" stroke="' + LINE + '" stroke-width="4"/><circle cx="138" cy="90" r="3" fill="' + LINE + '"/><circle cx="138" cy="108" r="3" fill="' + LINE + '"/><circle cx="138" cy="126" r="3" fill="' + LINE + '"/>';
  ART.team = '<ellipse cx="100" cy="168" rx="92" ry="18" fill="#9c6a40" stroke="' + LINE + '" stroke-width="4"/>' +
    kid(40, 160, .72, { mouth: 'o', shirt: '#f08c3a' }) + kid(160, 160, .72, { mouth: 'o', shirt: '#2f9e55', hair: '#d9a400' }) + kid(100, 150, .75, { mouth: 'flat', shirt: '#3b6fd8', hair: '#2a2a2a' });

  // ===== 22課題ぶんの 専用の絵 =====
  var L4 = '" stroke="' + LINE + '" stroke-width="4"';
  function bl(cx, cy, r) { return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="#e5484d' + L4 + '/><path d="M' + (cx - r) + ' ' + cy + ' H' + (cx + r) + '" stroke="' + LINE + '" stroke-width="3"/>'; }
  function bubble(x, y, w, h, inner) { return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="16" fill="#fff' + L4 + '/>' + (inner || ''); }
  ART.payback = kid(100, 186, 1.2, { mouth: 'angry', shirt: '#c92a2a', hair: '#2a2a2a' }) +
    '<path d="M150 30 l6 10 M166 40 l-10 4 M142 46 l8 -4" stroke="#e5484d" stroke-width="5" stroke-linecap="round"/>';
  ART.bad_rep = kid(44, 184, .7, { mouth: 'flat', shirt: '#5c6b8a', hair: '#d9a400' }) + kid(100, 184, .7, { mouth: 'flat', shirt: '#f08c3a' }) + kid(156, 184, .7, { mouth: 'o', shirt: '#9b7fe0', hair: '#2a2a2a' }) +
    bubble(56, 12, 88, 36, '<path d="M72 30 q8 -10 16 0 t16 0 t16 0" fill="none" stroke="#a7b2c8" stroke-width="4"/>');
  ART.cold_class = kid(40, 184, .75, { mouth: 'flat', shirt: '#2f9e55' }) + kid(160, 184, .75, { mouth: 'flat', shirt: '#3b6fd8', hair: '#d9a400' }) + kid(100, 170, .7, { mouth: 'o', shirt: '#f08c3a', hair: '#2a2a2a' }) +
    '<text x="86" y="40" font-size="30" font-weight="900" fill="#3b5bdb">…</text>';
  ART.got_rough = kid(100, 186, 1.15, { mouth: 'flat', shirt: '#3b6fd8', hair: '#d9a400' }) +
    '<path d="M62 120 L120 112" stroke="' + LINE + '" stroke-width="16" stroke-linecap="round"/><path d="M62 120 L120 112" stroke="' + SKIN + '" stroke-width="9" stroke-linecap="round"/><circle cx="124" cy="112" r="9" fill="#f2a0a0" stroke="' + LINE + '" stroke-width="3"/>';
  ART.said_too_much = kid(100, 186, 1.15, { mouth: 'flat', shirt: '#5c6b8a' }) + '<text x="138" y="40" font-size="30" font-weight="900" fill="' + LINE + '">…</text>';
  ART.joined_in = kid(100, 186, 1.0, { mouth: 'flat', shirt: '#9fb6c8', hair: '#2a2a2a' }) +
    '<rect x="30" y="56" width="30" height="36" rx="6" fill="#e5484d' + L4 + '/><path d="M20 182 H180" stroke="#a7b2c8" stroke-width="6" stroke-linecap="round"/>';
  ART.skipped_hw = '<rect x="28" y="70" width="144" height="96" rx="10" fill="#3b6fd8' + L4 + '/>' + paper(60, 82, 80, 76, 3) +
    '<rect x="110" y="20" width="72" height="44" rx="6" fill="#5c6b8a' + L4 + '/><rect x="118" y="28" width="56" height="28" rx="3" fill="#9fb6c8"/>';
  ART.ran_hall = '<path d="M10 176 H190" stroke="#9c6a40" stroke-width="10" stroke-linecap="round"/>' + kid(100, 176, .85, { mouth: 'o', shirt: '#ffd23f', hair: '#d9a400' }) +
    '<path d="M40 70 l-10 -8 M160 70 l10 -8 M168 90 l14 0" stroke="' + LINE + '" stroke-width="4" stroke-linecap="round"/>';
  ART.chatting = '<rect x="10" y="20" width="56" height="110" rx="4" fill="#2f9e55' + L4 + '/>' + kid(116, 186, 1.15, { mouth: 'flat', shirt: '#2f9e55', hair: '#6e7781', glasses: true });
  ART.kanji_practice = '<rect x="30" y="20" width="140" height="150" rx="6" fill="#fff' + L4 + '/>' +
    '<path d="M76 20 V170 M124 20 V170 M30 70 H170 M30 120 H170" stroke="#9fb6c8" stroke-width="3"/><path d="M40 44 H66 M53 32 V60" stroke="' + LINE + '" stroke-width="4" stroke-linecap="round"/>' +
    '<path d="M150 10 L176 70" stroke="#e0a800" stroke-width="10" stroke-linecap="round"/>';
  ART.weak_kanji = paper(40, 14, 120, 160, 6) + '<circle cx="134" cy="40" r="12" fill="none" stroke="#e5484d" stroke-width="5"/>' +
    '<path d="M110 58 l14 12 M124 58 l-14 12 M110 94 l14 12 M124 94 l-14 12 M110 130 l14 12 M124 130 l-14 12" stroke="#e5484d" stroke-width="5" stroke-linecap="round"/>';
  ART.lost_game = kid(60, 186, .9, { mouth: 'laugh', shirt: '#e5484d', armsUp: true }) + kid(140, 186, .9, { mouth: 'laugh', shirt: '#e5484d', hair: '#d9a400', armsUp: true }) + bl(100, 26, 14);
  ART.saw_exclusion = kid(40, 184, .72, { mouth: 'smile', shirt: '#9b7fe0' }) + kid(96, 184, .72, { mouth: 'smile', shirt: '#f08c3a', hair: '#d9a400' }) +
    '<path d="M128 30 V180" stroke="#a7b2c8" stroke-width="4" stroke-dasharray="8 8"/>' + kid(164, 184, .68, { mouth: 'flat', shirt: '#9fb6c8', hair: '#2a2a2a' });
  ART.whisper_group = kid(64, 184, .95, { mouth: 'laugh', shirt: '#2f9e55', hair: '#2a2a2a' }) + kid(140, 184, .95, { mouth: 'smile', shirt: '#f08c3a', hair: '#d9a400' }) +
    '<ellipse cx="102" cy="92" rx="10" ry="14" fill="#f6cfa8' + L4 + '/>' + bubble(140, 6, 50, 30, '<circle cx="158" cy="21" r="3" fill="' + LINE + '"/><circle cx="172" cy="21" r="3" fill="' + LINE + '"/>');
  ART.alone_kid = kid(90, 186, 1.1, { mouth: 'flat', shirt: '#9b7fe0' }) +
    '<path d="M60 128 L100 118 L140 128 V160 L100 150 L60 160 Z" fill="#2f9e55' + L4 + '/><path d="M100 118 V150" stroke="' + LINE + '" stroke-width="3"/>';
  ART.duty_fight = kid(60, 186, .95, { mouth: 'angry', shirt: '#fff' }) + kid(140, 186, .95, { mouth: 'angry', shirt: '#fff', hair: '#2a2a2a' }) +
    '<path d="M80 170 Q100 150 120 170 Z" fill="#a7b2c8' + L4 + '/><path d="M86 160 h28" stroke="#e0a800" stroke-width="5"/>';
  ART.line_cut = kid(40, 186, .75, { mouth: 'o', shirt: '#3b6fd8' }) + kid(100, 186, .75, { mouth: 'smile', shirt: '#f08c3a', hair: '#d9a400' }) +
    '<rect x="146" y="90" width="48" height="20" rx="4" fill="#d9dee8' + L4 + '/><path d="M170 90 V70" stroke="' + LINE + '" stroke-width="6"/><path d="M170 112 v20" stroke="#7fd3f0" stroke-width="4" stroke-dasharray="6 6"/>';
  ART.ball_grab = kid(48, 186, .9, { mouth: 'angry', shirt: '#3b6fd8' }) + kid(152, 186, .9, { mouth: 'angry', shirt: '#9b7fe0', hair: '#2a2a2a' }) +
    '<path d="M70 130 L92 128 M130 130 L108 128" stroke="' + LINE + '" stroke-width="14" stroke-linecap="round"/><path d="M70 130 L92 128 M130 130 L108 128" stroke="' + SKIN + '" stroke-width="7" stroke-linecap="round"/>' + bl(100, 128, 16);
  ART.duty_skip = kid(84, 186, 1.05, { mouth: 'laugh', shirt: '#f08c3a', hair: '#d9a400', armsUp: true }) +
    '<path d="M150 20 L172 140" stroke="#e0a800" stroke-width="8" stroke-linecap="round"/><path d="M158 140 H192 L186 176 H164 Z" fill="#ffd23f' + L4 + '/>';
  ART.relay = '<rect x="0" y="150" width="200" height="40" fill="#2f9e55"/><path d="M0 168 H200" stroke="#fff" stroke-width="4"/>' +
    kid(30, 150, .5, { mouth: 'laugh', shirt: '#e5484d', armsUp: true }) + kid(75, 150, .5, { mouth: 'laugh', shirt: '#3b6fd8', hair: '#2a2a2a' }) + kid(120, 150, .5, { mouth: 'laugh', shirt: '#ffd23f', armsUp: true }) + kid(168, 150, .5, { mouth: 'laugh', shirt: '#f08c3a', hair: '#d9a400' });
  ART.baton_practice = '<path d="M10 176 H190" stroke="#c4651b" stroke-width="8"/>' +
    '<path d="M20 60 L84 100 M182 70 L118 104" stroke="' + LINE + '" stroke-width="18" stroke-linecap="round"/><path d="M20 60 L84 100 M182 70 L118 104" stroke="' + SKIN + '" stroke-width="10" stroke-linecap="round"/>' +
    '<rect x="78" y="144" width="48" height="16" rx="8" fill="#e5484d' + L4 + ' transform="rotate(14 102 152)"/><path d="M70 130 l-6 -8 M134 130 l6 -8" stroke="' + LINE + '" stroke-width="4" stroke-linecap="round"/>';
  ART.team_pick = '<rect x="40" y="6" width="120" height="44" rx="4" fill="#2f9e55' + L4 + '/><path d="M54 22 H90 M110 22 H146 M54 36 H84 M110 36 H140" stroke="#fff" stroke-width="4"/>' +
    kid(40, 186, .68, { mouth: 'angry', shirt: '#e5484d' }) + kid(100, 186, .68, { mouth: 'o', shirt: '#fff', hair: '#d9a400' }) + kid(160, 186, .68, { mouth: 'angry', shirt: '#e5484d', hair: '#2a2a2a' });

  function svg(id) {
    if (!ART[id]) return null;
    return '<svg viewBox="0 0 200 190" xmlns="http://www.w3.org/2000/svg" role="img">' + ART[id] + '</svg>';
  }

  root.SST_ILLUST = { svg: svg };
})(this);
