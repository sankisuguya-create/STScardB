# ドット絵（16×16）の元データを作り、src/sprites.js を書き出す。
# かいぶつの姿（form 0）と現実の姿（form 2）を持つ。form 1 は現実の姿にオーラを足して描く（sprites.js 側）
import json

def blank(): return [['.'] * 16 for _ in range(16)]
def rect(g, x, y, w, h, c):
    for yy in range(y, y + h):
        for xx in range(x, x + w):
            if 0 <= xx < 16 and 0 <= yy < 16: g[yy][xx] = c
def box(g, x, y, w, h, fill, edge='k'):
    rect(g, x, y, w, h, edge); rect(g, x + 1, y + 1, w - 2, h - 2, fill)
def px(g, pts, c):
    for x, y in pts: g[y][x] = c
def out(g): return [''.join(r) for r in g]

KID = ['.kkkkk.', 'kHHHHHk', 'kHSSSHk', 'kSkSkSk', 'kSSSSSk', '.kSMSk.', '..kkk..', '.kTTTk.', 'kTTTTTk', 'kTTTTTk', '.kk.kk.']
def kid(g, x, y, hair='n', shirt='b', mouth='flat', eyes='dot'):
    # 7×11 の子ども（x,y は左上）
    for r, row in enumerate(KID):
        for c, ch in enumerate(row):
            if ch == '.': continue
            col = {'H': hair, 'S': 's', 'T': shirt, 'M': 'k', 'k': 'k'}[ch]
            if 0 <= x + c < 16 and 0 <= y + r < 16: g[y + r][x + c] = col
    if mouth == 'laugh': px(g, [(x + 2, y + 5), (x + 3, y + 5), (x + 4, y + 5)], 'r')
    elif mouth == 'o': px(g, [(x + 3, y + 5)], 'r')
    elif mouth == 'flat': px(g, [(x + 3, y + 5)], 's'); px(g, [(x + 3, y + 5)], 'k')
    if eyes == 'wide': px(g, [(x + 2, y + 3), (x + 4, y + 3)], 'k'); px(g, [(x + 1, y + 2), (x + 5, y + 2)], hair)

S = {}
# --- かいぶつの姿 ---
S['dunno_m'] = ['......kkkk......', '.....kyyyyk.....', '....kyykkyyk....', '.........kyk....', '.......kyyk.....', '.......kyk......', '.......kkk......', '....kkkkkkkkk...',
  '...kdddddddddk..', '..kdkkddddkkddk.', '..kdrrkdddkrrdk.', '..kdddddddddddk.', '..kdkwkwkwkwkdk.', '..kdkrrrrrrrkdk.', '..kddkkkkkkkddk.', '...kkkkkkkkkkk..']
S['bumped_m'] = ['.......k........', '......kok....k..', '..k..kooo..kok..', '..kokooooookok..', '...koooooooook..', '..kkkkoooookkkk.', '.koookrooookrok.', '.kooorrooookrrk.',
  '.koooooooooooook', '..kokwkwkwkwkok.', '..kokrrrrrrrkok.', '...kokwkwkwkok..', '....koooooook...', '.....kkkkkkk....', '....kk.....kk...', '................']
S['left_out_m'] = ['................', '.....kkkkkk.....', '....kgggggggk...', '...kgGGgggGggk..', '...kgkkkgkkkgk..', '...kgkrkgkrkgk..', '...kgkkkgkkkggk.', '...kggggggggggk.',
  '...kgggkkkkgggk.', '...kggkgggkggk..', '...kgggggggggk..', '....kgk.kgk.kgk.', '.....k...k...k..', '................', '..........kkk...', '.........kgggk..']
S['teased_m'] = ['...k...k...k....', '..kgk.kgk.kgk...', '.kgggkgggkgggk..', 'kgGGgggGgggGggk.', 'kgkkgggggggkkgk.', 'kggrrkgggkrrggk.', 'kggrkkgggkkrggk.', 'kgggggggggggggk.',
  'kggkkkkkkkkkggk.', 'kgkwkwkwkwkwkgk.', 'kggkrrrrrrrkggk.', 'kgkwkwkwkwkwkgk.', '.kggkkkkkkkggk..', '..kggggggggk....', '...kkkkkkkk.....', '................']
S['presentation_m'] = ['.....kkkkkk.....', '...kkddddddkk...', '..kddddddddddk..', '.kddwwrwwwwrddk.', '.kdwwwwrwwrwwdk.', 'kddwwwkkkkwwwddk', 'kdrwwkrrrrkwwrdk', 'kddwwkrkkrkwwddk',
  'kddwwkrrrrkwwddk', 'kdrwwwkkkkwwwrdk', '.kdwwrwwwwrwwdk.', '.kddwwwrwwwwddk.', '..kddddddddddk..', '...kkddddddkk...', '.....kkkkkk.....', '................']

# --- 現実の姿 ---
g = blank(); box(g, 2, 1, 11, 14, 'w')
for yy in (3, 5, 7): rect(g, 4, yy, 6, 1, 'G')
px(g, [(8, 9), (9, 9), (10, 9), (10, 10), (9, 11), (9, 13)], 'b')
rect(g, 4, 9, 3, 1, 'G'); rect(g, 4, 11, 3, 1, 'G')
S['dunno_r'] = out(g)

g = blank(); kid(g, 4, 3, hair='n', shirt='e', mouth='o', eyes='wide')
px(g, [(3, 11), (11, 11)], 's'); px(g, [(2, 10), (12, 10)], 's')
S['bumped_r'] = out(g)

g = blank(); kid(g, 0, 4, hair='n', shirt='o', mouth='laugh'); kid(g, 9, 4, hair='y', shirt='b', mouth='laugh')
box(g, 6, 12, 4, 4, 'r')
S['left_out_r'] = out(g)

g = blank(); kid(g, 0, 4, hair='n', shirt='g', mouth='laugh', eyes='dot'); kid(g, 9, 4, hair='k', shirt='P', mouth='laugh', eyes='dot')
S['teased_r'] = out(g)

g = blank(); kid(g, 0, 5, hair='n', shirt='b'); kid(g, 9, 5, hair='y', shirt='o'); kid(g, 4, 3, hair='k', shirt='e')
S['presentation_r'] = out(g)

# --- 自分・アイテム ---
S['hero'] = ['................', '.....kkkkkk.....', '....knnnnnnk....', '...knnnnnnnnk...', '...knssssssnk...', '...ksskssksk....', '...kssssssssk...', '....kssrrssk....',
  '.....kkkkkk.....', '....kbbbbbbk....', '...kbbbbbbbbk...', '..ksbbbbbbbbsk..', '...kbbbbbbbbk...', '....kkkkkkkk....', '....kk....kk....', '................']
g = blank(); kid(g, 4, 3, hair='G', shirt='e'); px(g, [(5, 6), (7, 6), (9, 6)], 'k'); S['teacher'] = out(g)
g = blank(); kid(g, 0, 4, hair='y', shirt='o', mouth='laugh'); kid(g, 9, 4, hair='n', shirt='b', mouth='laugh'); S['friend'] = out(g)
g = blank(); kid(g, 0, 2, hair='k', shirt='P'); kid(g, 9, 5, hair='n', shirt='b'); S['family'] = out(g)
S['book'] = ['................', '................', '..kkkkkk.kkkkk..', '.krrrrrrkrrrrrk.', '.krwwwwrkrwwwrk.', '.krrrrrrkrrrrrk.', '.krwwwwrkrwwwrk.', '.krrrrrrkrrrrrk.',
  '.krwwwwrkrwwwrk.', '.krrrrrrkrrrrrk.', '.kkkkkkkkkkkkkk.', '..kyyyyyyyyyyk..', '...kkkkkkkkkk...', '................', '................', '................']

for k, v in S.items():
    assert len(v) == 16 and all(len(r) == 16 for r in v), k

PAL = {'k': '#12172a', 'w': '#ffffff', 'p': '#8e6ad8', 'P': '#b79cf0', 'y': '#ffd23f', 'r': '#e5484d', 'g': '#5c6b8a', 'G': '#a7b2c8', 'o': '#f08c3a',
       's': '#f4c9a0', 'b': '#3b5bdb', 'n': '#7a4b2a', 'e': '#2b8a3e', 'c': '#7fd3e0', 'd': '#3d2f63'}

js = """// 自動生成（scripts/sprites.py）。直接編集しない
// ドット絵の描画。課題は form 0=かいぶつ／1=現実の姿＋ぶきみなオーラ／2=ふつうの現実
(function (root) {
  'use strict';
  var PAL = %s;
  var ART = %s;
  var N = 16, M = 2, SIZE = N + M * 2;
  function grid(key) {
    var art = ART[key], g = [];
    for (var y = 0; y < SIZE; y++) { g.push([]); for (var x = 0; x < SIZE; x++) g[y].push(null); }
    for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) { var ch = art[r][c]; if (ch !== '.') g[r + M][c + M] = PAL[ch]; }
    return g;
  }
  function aura(g) {
    var ring = function (src, color) {
      var out = [];
      for (var y = 0; y < SIZE; y++) for (var x = 0; x < SIZE; x++) {
        if (src[y][x]) continue;
        if ((y > 0 && src[y - 1][x]) || (y < SIZE - 1 && src[y + 1][x]) || (x > 0 && src[y][x - 1]) || (x < SIZE - 1 && src[y][x + 1])) out.push([x, y]);
      }
      out.forEach(function (p) { src[p[1]][p[0]] = color; });
    };
    ring(g, '#5a1e8c'); ring(g, 'rgba(120,50,190,0.45)');
    return g;
  }
  function draw(cv, key, form) {
    cv.width = SIZE; cv.height = SIZE;
    var x = cv.getContext('2d');
    x.clearRect(0, 0, SIZE, SIZE);
    var g = grid(key);
    if (form === 1) g = aura(g);
    for (var yy = 0; yy < SIZE; yy++) for (var xx = 0; xx < SIZE; xx++) if (g[yy][xx]) { x.fillStyle = g[yy][xx]; x.fillRect(xx, yy, 1, 1); }
    if (form === 1) {
      x.globalCompositeOperation = 'source-atop'; x.fillStyle = 'rgba(70,20,110,0.28)'; x.fillRect(0, 0, SIZE, SIZE);
      x.globalCompositeOperation = 'source-over';
    }
  }
  // 課題の id と form から、使う絵を決める
  function enemyKey(id, form) { return id + (form === 0 ? '_m' : '_r'); }
  root.SST_SPRITES = { draw: draw, enemyKey: enemyKey, has: function (k) { return !!ART[k]; } };
})(this);
""" % (json.dumps(PAL), json.dumps(S, ensure_ascii=False))
open('src/sprites.js', 'w').write(js)
print('sprites', len(S))
