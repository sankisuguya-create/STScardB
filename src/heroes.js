// 主人公の シルエット（64×64 ドット）。髪型・メガネ・はちまき などで 見分ける。
// ストレスの 見た目（mood）は シルエットの 上に かさねる：1=汗 / 2=汗2つ＋うつむき / 3=落ちこみ縦線＋うつむき / 4=動けない（灰色）
(function (root) {
  'use strict';
  var N = 64;

  function grid() { var g = []; for (var y = 0; y < N; y++) { g.push([]); for (var x = 0; x < N; x++) g[y].push(0); } return g; }
  function put(g, x, y, v) { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < N && y < N) g[y][x] = v; }
  function ell(g, cx, cy, rx, ry, v) {
    for (var y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (var x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      var dx = (x - cx) / rx, dy = (y - cy) / ry; if (dx * dx + dy * dy <= 1) put(g, x, y, v);
    }
  }
  function rect(g, x0, y0, w, h, v) { for (var y = y0; y < y0 + h; y++) for (var x = x0; x < x0 + w; x++) put(g, x, y, v); }
  function poly(g, pts, v) {
    var minY = Infinity, maxY = -Infinity;
    pts.forEach(function (p) { minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]); });
    for (var y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
      var xs = [];
      for (var i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        var a = pts[i], b = pts[j];
        if ((a[1] > y) !== (b[1] > y)) xs.push(a[0] + (y - a[1]) * (b[0] - a[0]) / (b[1] - a[1]));
      }
      xs.sort(function (p, q) { return p - q; });
      for (var k = 0; k + 1 < xs.length; k += 2) for (var x = Math.ceil(xs[k]); x <= Math.floor(xs[k + 1]); x++) put(g, x, y, v);
    }
  }

  function line(g, x0, y0, x1, y1, w, v) {
    var n = Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))) * 2 + 1;
    for (var i = 0; i <= n; i++) { var t = i / n; ell(g, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, w / 2, w / 2, v); }
  }
  // デフォルメ体型：大きめの 頭・耳・なで肩
  function chibi(g, dy, o) {
    var sw = o.shoulder || 14;
    ell(g, 32, 50, sw, 7, 1); rect(g, 32 - sw, 50, sw * 2 + 1, 14, 1);  // 肩と 胴
    rect(g, 29, 38 + dy * 0.5, 7, 8, 1);                                 // くび
    ell(g, 32, 28 + dy, 12, 12.5, 1);                                    // 頭
    ell(g, 20, 30 + dy, 2, 3, 1); ell(g, 44, 30 + dy, 2, 3, 1);          // 耳
  }
  // 体（肩・胴）と 頭。dy＝うつむき（頭を 下げる）
  function body(g, o) {
    var sw = o.shoulder || 15, top = 44;
    poly(g, [[32 - sw, 63], [32 - sw, top + 6], [32 - sw + 5, top], [32 + sw - 5, top], [32 + sw, top + 6], [32 + sw, 63]], 1);
    rect(g, 28, top - 4, 8, 6, 1); // くび
  }
  function head(g, dy, r) { ell(g, 32, 28 + dy, r || 11, (r || 11) + 1, 1); }

  var LOOKS = {
    // A：ボブの 髪と 丸メガネ
    hanoko: function (g, dy) {
      body(g, { shoulder: 14 }); head(g, dy);
      ell(g, 32, 24 + dy, 13, 11, 1); rect(g, 19, 24 + dy, 4, 12, 1); rect(g, 41, 24 + dy, 4, 12, 1);
      return { glasses: true };
    },
    // B：ボリュームの ある つんつん頭。片手を あげて「おーい！」と あいさつ（人なつっこい）
    tario: function (g, dy) {
      chibi(g, dy, { shoulder: 14 });
      ell(g, 32, 22 + dy, 13, 8, 1);
      [[19, 22, 15, 15], [22, 18, 20, 10], [27, 16, 26, 8], [33, 15, 33, 7], [38, 16, 40, 8], [42, 18, 46, 11], [45, 22, 49, 16]].forEach(function (s) {
        poly(g, [[s[0] - 3, s[1] + 4 + dy], [s[2], s[3] + dy], [s[0] + 4, s[1] + 3 + dy]], 1);
      });
      line(g, 44, 49, 51, 40, 5, 1); line(g, 51, 40, 53, 31, 4.5, 1); ell(g, 53.5, 28, 3.2, 3.6, 1); // あげた うで と 手
      return {};
    },
    // C：スポーツがり＋なびく はちまき、広い 肩、にぎった こぶし（体を 動かすのが とくい）
    musuhi: function (g, dy) {
      chibi(g, dy, { shoulder: 17 });
      ell(g, 32, 20 + dy, 12, 6, 1);
      poly(g, [[43, 22 + dy], [55, 17 + dy], [52, 22 + dy], [58, 26 + dy], [45, 26 + dy]], 1); // はちまきの はし
      return { band: true };
    },
    // D：ととのった 横わけ（長い 前がみが 目に かかる）、えり付きの シャツ、すらっと 背が 高い
    hayatsu: function (g, dy) {
      chibi(g, dy - 2, { shoulder: 13 });
      poly(g, [[19, 30 + dy], [19, 20 + dy], [25, 13 + dy], [36, 11 + dy], [44, 15 + dy], [46, 24 + dy], [44, 22 + dy], [34, 22 + dy], [28, 31 + dy], [26, 24 + dy], [22, 31 + dy]], 1);
      poly(g, [[27, 44], [32, 50], [37, 44], [39, 46], [32, 54], [25, 46]], 0); // えりの すきま
      return { collar: true };
    },
    // E：長い髪と アホ毛、少し 小さい
    kitori: function (g, dy) {
      body(g, { shoulder: 13 }); head(g, dy + 1, 10);
      ell(g, 32, 26 + dy, 12, 11, 1); rect(g, 20, 27 + dy, 25, 19, 1);
      for (var t = 0; t < 6; t++) put(g, 33 + Math.round(Math.sin(t / 1.5) * 2), 14 + dy - t, 1), put(g, 34 + Math.round(Math.sin(t / 1.5) * 2), 14 + dy - t, 1);
      return {};
    },
    // Z：まるい 頭だけ
    plain: function (g, dy) { body(g, { shoulder: 15 }); head(g, dy); return {}; }
  };

  function draw(cv, look, mood) {
    mood = mood || 0;
    var fn = LOOKS[look] || LOOKS.plain;
    var dy = mood >= 3 ? 4 : mood >= 2 ? 2 : 0;
    var g = grid(), extra = fn(g, dy);
    cv.width = N; cv.height = N;
    var x = cv.getContext('2d');
    x.clearRect(0, 0, N, N);
    var ink = mood >= 4 ? '#4a4f5c' : '#10131f', rim = mood >= 3 ? '#5c6aa0' : '#a9bcf5';
    for (var yy = 0; yy < N; yy++) for (var xx = 0; xx < N; xx++) {
      if (!g[yy][xx]) continue;
      var edge = !(g[yy - 1] && g[yy - 1][xx]) || !(g[yy + 1] && g[yy + 1][xx]) || !g[yy][xx - 1] || !g[yy][xx + 1];
      x.fillStyle = edge && yy < 50 ? rim : ink; x.fillRect(xx, yy, 1, 1);
    }
    function px(cx, cy, c) { x.fillStyle = c; x.fillRect(cx, cy, 1, 1); }
    function hl(x0, x1, y, c) { for (var i = x0; i <= x1; i++) px(i, y, c); }
    // メガネ：レンズの ふちを 光らせる
    if (extra.glasses) {
      var gy = 29 + dy;
      [[25, gy], [36, gy]].forEach(function (p) {
        for (var a = 0; a < 24; a++) { var t = a / 24 * Math.PI * 2; px(Math.round(p[0] + 2 + Math.cos(t) * 3.4), Math.round(p[1] + Math.sin(t) * 3), '#d9e3ff'); }
      });
      hl(30, 33, gy - 1, '#d9e3ff');
    }
    if (extra.collar) { [[26, 45], [27, 46], [28, 47], [29, 48], [30, 49], [31, 50], [32, 51], [38, 45], [37, 46], [36, 47], [35, 48], [34, 49], [33, 50]].forEach(function (p) { px(p[0], p[1], rim); }); }
    // はちまき：線で 見せる
    if (extra.band) { hl(21, 43, 22 + dy, '#e8590c'); hl(21, 43, 23 + dy, '#e8590c'); }
    // 汗
    function drop(cx, cy) {
      [[0, 0], [0, 1], [-1, 2], [0, 2], [1, 2], [-1, 3], [0, 3], [1, 3], [0, 4]].forEach(function (o) { px(cx + o[0], cy + o[1], o[1] === 0 ? '#ffffff' : '#7fd3f0'); });
      px(cx - 1, cy + 2, '#ffffff');
    }
    if (mood >= 1) drop(46, 18 + dy);
    if (mood >= 2) { drop(50, 25 + dy); drop(15, 22 + dy); }
    // 落ちこみの 縦線（頭の 上から 顔に かかる）
    if (mood >= 3) {
      for (var i = 0; i < 6; i++) { var lx = 23 + i * 3.6, len = 8 + (i % 2) * 4; for (var j = 0; j < len; j++) px(Math.round(lx), 18 + dy + j, j % 4 === 3 ? 'rgba(0,0,0,0)' : '#8b7fd6'); }
    }
  }

  root.SST_HEROES = { draw: draw, has: function (look) { return !!LOOKS[look]; } };
})(this);
