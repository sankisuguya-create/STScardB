# ドット絵（32×32）の元データを作り、src/sprites.js を書き出す。python3 scripts/sprites.py
# 形を色で塗ってから、外側の輪郭（k）を自動で付ける。かげ・ハイライトは同系の2色で入れる。
# かいぶつの姿（_m）と現実の姿（_r）を持つ。オーラは sprites.js 側で足す
import json, math

N = 32

class G:
    def __init__(self): self.g = [['.'] * N for _ in range(N)]
    def put(self, x, y, c):
        x, y = int(round(x)), int(round(y))
        if 0 <= x < N and 0 <= y < N: self.g[y][x] = c
    def get(self, x, y):
        return self.g[y][x] if 0 <= x < N and 0 <= y < N else '.'
    def ell(self, cx, cy, rx, ry, c, shade=None, light=None):
        for y in range(N):
            for x in range(N):
                dx, dy = (x + .5 - cx) / rx, (y + .5 - cy) / ry
                d = dx * dx + dy * dy
                if d <= 1:
                    col = c
                    if shade and dy > .35 and d > .45: col = shade
                    if light and dx < -.2 and dy < -.2 and d < .55 and d > .15: col = light
                    self.g[y][x] = col
    def rect(self, x, y, w, h, c):
        for yy in range(y, y + h):
            for xx in range(x, x + w): self.put(xx, yy, c)
    def poly(self, pts, c):
        xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
        for y in range(int(min(ys)), int(max(ys)) + 1):
            for x in range(int(min(xs)), int(max(xs)) + 1):
                if inside(x + .5, y + .5, pts): self.put(x, y, c)
    def line(self, x0, y0, x1, y1, c, w=1):
        n = int(max(abs(x1 - x0), abs(y1 - y0)) * 2) + 1
        for i in range(n + 1):
            t = i / n; x = x0 + (x1 - x0) * t; y = y0 + (y1 - y0) * t
            for ox in range(w):
                for oy in range(w): self.put(x + ox - w // 2, y + oy - w // 2, c)
    def px(self, pts, c):
        for x, y in pts: self.put(x, y, c)
    def outline(self, c='k'):
        add = []
        for y in range(N):
            for x in range(N):
                if self.g[y][x] != '.': continue
                if any(self.get(x + dx, y + dy) not in '.' for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))): add.append((x, y))
        for x, y in add: self.g[y][x] = c
        return self
    def out(self): return [''.join(r) for r in self.g]

def inside(x, y, pts):
    c = False; j = len(pts) - 1
    for i in range(len(pts)):
        xi, yi = pts[i]; xj, yj = pts[j]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi + 1e-9) + xi: c = not c
        j = i
    return c

# --- 子ども（中心 cx、足もと by、大きさ k=1 で 高さ約22） ---
def kid(g, cx, by, hair='n', hair2='N', shirt='b', shirt2='B', mouth='smile', k=1.0, arms=None, eyes='dot', brows=None, glasses=False, hat=None):
    hr = 6 * k
    hy = by - 22 * k + hr
    # からだ
    g.poly([(cx - 6 * k, by - 1), (cx - 5 * k, by - 9 * k), (cx - 3 * k, by - 11 * k), (cx + 3 * k, by - 11 * k), (cx + 5 * k, by - 9 * k), (cx + 6 * k, by - 1)], shirt)
    g.rect(int(cx - 6 * k), int(by - 3 * k), int(12 * k) + 1, 2, shirt2)
    if arms == 'up':
        g.line(cx - 5 * k, by - 9 * k, cx - 9 * k, by - 16 * k, 's', 2); g.line(cx + 5 * k, by - 9 * k, cx + 9 * k, by - 16 * k, 's', 2)
    elif arms == 'push':
        g.line(cx - 5 * k, by - 8 * k, cx - 10 * k, by - 9 * k, 's', 2); g.line(cx + 5 * k, by - 8 * k, cx + 10 * k, by - 9 * k, 's', 2)
    # あたま
    g.ell(cx, hy, hr, hr, 's', shade='S')
    # かみ
    for y in range(N):
        for x in range(N):
            dx, dy = (x + .5 - cx) / hr, (y + .5 - hy) / hr
            if dx * dx + dy * dy <= 1.05 and dy < -.25 + .15 * abs(dx): g.put(x, y, hair)
    g.px([(int(cx - 2 * k), int(hy - hr + 1)), (int(cx + 1 * k), int(hy - hr + 2))], hair2)
    if hat:
        g.rect(int(cx - hr - 1), int(hy - hr * .5), int(hr * 2) + 3, 1, hat)
        g.ell(cx, hy - hr * .6, hr * .95, hr * .55, hat)
    # かお
    ey = int(hy + 1 * k)
    exl, exr = int(cx - 2.5 * k), int(cx + 2.5 * k)
    if eyes == 'dot': g.px([(exl, ey), (exr, ey), (exl, ey - 1), (exr, ey - 1)], 'k')
    if eyes == 'red': g.px([(exl, ey), (exr, ey)], 'r'); g.px([(exl, ey - 1), (exr, ey - 1)], 'k')
    if glasses:
        for ex in (exl, exr): g.px([(ex - 1, ey - 2), (ex, ey - 2), (ex + 1, ey - 2), (ex - 1, ey + 1), (ex, ey + 1), (ex + 1, ey + 1), (ex - 2, ey - 1), (ex - 2, ey), (ex + 2, ey - 1), (ex + 2, ey)], 'k')
    if brows == 'angry': g.px([(exl - 1, ey - 3), (exl, ey - 2), (exr + 1, ey - 3), (exr, ey - 2)], 'k')
    g.px([(exl - 1, ey + 2), (exr + 1, ey + 2)], 'p' if False else 'R')
    my = int(hy + 4 * k)
    if mouth == 'smile': g.px([(int(cx) - 1, my), (int(cx), my + 1), (int(cx) + 1, my)], 'k')
    elif mouth == 'laugh': g.px([(int(cx) - 2, my), (int(cx) - 1, my), (int(cx), my), (int(cx) + 1, my), (int(cx) + 2, my), (int(cx) - 1, my + 1), (int(cx), my + 1), (int(cx) + 1, my + 1)], 'r'); g.px([(int(cx) - 2, my - 1), (int(cx) + 2, my - 1)], 'k')
    elif mouth == 'o': g.px([(int(cx), my), (int(cx), my + 1)], 'r'); g.px([(int(cx) - 1, my), (int(cx) + 1, my), (int(cx) - 1, my + 1), (int(cx) + 1, my + 1)], 'k')
    elif mouth == 'angry': g.px([(int(cx) - 2, my + 1), (int(cx) - 1, my), (int(cx), my), (int(cx) + 1, my), (int(cx) + 2, my + 1)], 'k')
    elif mouth == 'flat': g.px([(int(cx) - 1, my), (int(cx), my), (int(cx) + 1, my)], 'k')

def teeth(g, x0, x1, y, h=2):
    for x in range(x0, x1 + 1):
        for yy in range(y, y + h): g.put(x, yy, 'k')
    for x in range(x0 + 1, x1, 2):
        g.put(x, y, 'w'); g.put(x, y + h - 1, 'w' if h > 2 else 'k')
    for x in range(x0 + 1, x1): g.put(x, y + 1, 'r') if h > 2 else None

S = {}

# ===== かいぶつの姿 =====
g = G()  # ハテナ だいまじん
g.ell(16, 22, 12, 9, 'd', shade='D', light='p')
g.poly([(4, 26), (2, 30), (8, 28)], 'd'); g.poly([(28, 26), (30, 30), (24, 28)], 'd')
# ？の角
for (x, y) in [(13, 2), (14, 1), (15, 1), (16, 1), (17, 1), (18, 2), (19, 3), (19, 4), (19, 5), (18, 6), (17, 7), (16, 8), (16, 9), (16, 10)]:
    g.rect(x - 1, y, 2, 1, 'y')
g.rect(15, 11, 2, 2, 'Y')
g.px([(10, 18), (11, 19), (12, 19), (13, 20)], 'k'); g.px([(22, 18), (21, 19), (20, 19), (19, 20)], 'k')
g.rect(10, 20, 3, 2, 'r'); g.rect(19, 20, 3, 2, 'r'); g.px([(11, 20), (20, 20)], 'Y')
teeth(g, 10, 22, 24, 3)
S['dunno_m'] = g.outline().out()

g = G()  # ドンッと ぶつかる かいぶつ
for i in range(10):
    a = i / 10 * math.tau
    g.poly([(16 + math.cos(a - .25) * 9, 17 + math.sin(a - .25) * 9), (16 + math.cos(a) * 15, 17 + math.sin(a) * 14), (16 + math.cos(a + .25) * 9, 17 + math.sin(a + .25) * 9)], 'o')
g.ell(16, 17, 11, 10, 'o', shade='O', light='y')
g.px([(9, 12), (10, 13), (11, 13), (12, 14), (13, 14)], 'k'); g.px([(23, 12), (22, 13), (21, 13), (20, 14), (19, 14)], 'k')
g.rect(10, 15, 3, 2, 'r'); g.rect(19, 15, 3, 2, 'r')
teeth(g, 9, 23, 20, 4)
g.ell(4, 22, 3.5, 3, 'o', shade='O'); g.ell(28, 22, 3.5, 3, 'o', shade='O')
S['bumped_m'] = g.outline().out()

g = G()  # ひとりぼっちの きり
g.ell(16, 13, 11, 10, 'c', shade='C', light='w')
g.rect(5, 13, 23, 9, 'c'); g.rect(5, 19, 23, 3, 'C')
for x0 in (5, 11, 17, 23):
    g.poly([(x0, 22), (x0 + 5, 22), (x0 + 2.5, 27)], 'C')
g.ell(11, 13, 2.5, 3.5, 'k'); g.ell(21, 13, 2.5, 3.5, 'k'); g.px([(11, 13), (21, 13)], 'r')
g.px([(12, 19), (13, 18), (14, 18), (15, 18), (16, 18), (17, 18), (18, 18), (19, 19)], 'k')
for x, y in [(4, 29), (5, 29), (6, 28), (26, 30), (27, 30), (28, 29)]: g.put(x, y, 'C')
S['left_out_m'] = g.outline().out()

g = G()  # チクチクことばの むれ
g.ell(16, 18, 14, 11, 'g', shade='q', light='G')
for x0 in range(4, 28, 4): g.poly([(x0, 10), (x0 + 2, 2), (x0 + 4, 10)], 'g')
g.px([(7, 13), (8, 14), (9, 14), (10, 15), (11, 15)], 'k'); g.px([(25, 13), (24, 14), (23, 14), (22, 15), (21, 15)], 'k')
g.rect(8, 16, 4, 2, 'r'); g.rect(21, 16, 4, 2, 'r')
teeth(g, 7, 25, 21, 4)
g.px([(2, 6), (3, 7), (29, 6), (28, 7)], 'r')
S['teased_m'] = g.outline().out()

g = G()  # 見つめる 大目玉
g.ell(16, 16, 15, 12, 'd', shade='D')
g.ell(16, 16, 12, 9, 'w', shade='W')
for a in range(0, 360, 40):
    r = math.radians(a)
    g.line(16 + math.cos(r) * 11, 16 + math.sin(r) * 8, 16 + math.cos(r) * 7, 16 + math.sin(r) * 5, 'r')
g.ell(16, 16, 6, 6, 'r', shade='R')
g.ell(16, 16, 3, 3.5, 'k'); g.px([(14, 14), (15, 14)], 'w')
g.rect(2, 5, 28, 2, 'D'); g.rect(2, 25, 28, 2, 'D')
S['presentation_m'] = g.outline().out()

g = G()  # あばれる 大あらし
g.ell(10, 10, 8, 7, 'g', shade='q', light='G'); g.ell(21, 9, 9, 8, 'g', shade='q', light='G'); g.ell(16, 14, 13, 6, 'g', shade='q')
g.px([(9, 9), (10, 10), (11, 10)], 'k'); g.px([(22, 9), (21, 10), (20, 10)], 'k')
g.rect(9, 11, 3, 2, 'r'); g.rect(19, 11, 3, 2, 'r')
teeth(g, 11, 21, 15, 3)
g.poly([(9, 20), (13, 20), (10, 25), (13, 25), (7, 31), (9, 26), (6, 26)], 'y')
g.poly([(21, 20), (25, 20), (22, 24), (25, 24), (20, 30), (21, 25), (18, 25)], 'y')
S['fight_near_m'] = g.outline().out()

g = G()  # あまい声の かげ
g.ell(16, 9, 6, 7, 'd', shade='D')
g.poly([(9, 14), (23, 14), (28, 31), (4, 31)], 'd')
g.poly([(9, 16), (3, 24), (5, 25), (11, 19)], 'D'); g.poly([(23, 16), (29, 24), (27, 25), (21, 19)], 'D')
g.rect(12, 8, 3, 2, 'r'); g.rect(18, 8, 3, 2, 'r')
g.px([(13, 13), (14, 14), (15, 14), (16, 14), (17, 14), (18, 13)], 'r')
S['stranger_m'] = g.outline().out()

# ===== 現実の姿 =====
g = G()  # プリント1まい
g.rect(6, 3, 20, 26, 'w'); g.rect(6, 27, 20, 2, 'W')
for y in (7, 10, 13): g.rect(9, y, 14, 1, 'G')
g.rect(9, 18, 6, 1, 'G'); g.rect(9, 22, 6, 1, 'G')
for x, y in [(18, 17), (19, 16), (20, 16), (21, 16), (22, 17), (22, 18), (21, 19), (20, 20), (20, 21), (20, 24)]: g.put(x, y, 'b')
g.rect(22, 3, 4, 4, 'W')
S['dunno_r'] = g.outline().out()

g = G(); kid(g, 16, 31, hair='n', hair2='N', shirt='e', shirt2='E', mouth='o', arms='up', k=1.25)
g.px([(26, 6), (27, 5), (28, 9), (29, 9)], 'k'); S['bumped_r'] = g.outline().out()

g = G(); kid(g, 8, 29, hair='n', hair2='N', shirt='o', shirt2='O', mouth='laugh'); kid(g, 24, 29, hair='y', hair2='Y', shirt='b', shirt2='B', mouth='laugh')
g.ell(16, 27, 3, 3, 'r', shade='R', light='w'); S['left_out_r'] = g.outline().out()

g = G(); kid(g, 9, 30, hair='n', hair2='N', shirt='g', shirt2='q', mouth='laugh'); kid(g, 23, 30, hair='k', hair2='g', shirt='P', shirt2='p', mouth='laugh')
S['teased_r'] = g.outline().out()

g = G(); kid(g, 6, 31, hair='n', hair2='N', shirt='b', shirt2='B', k=.85); kid(g, 26, 31, hair='y', hair2='Y', shirt='o', shirt2='O', k=.85); kid(g, 16, 29, hair='k', hair2='g', shirt='e', shirt2='E', k=.9)
S['presentation_r'] = g.outline().out()

g = G(); kid(g, 9, 31, hair='k', hair2='g', shirt='r', shirt2='R', mouth='angry', brows='angry', arms='push', k=1.1); kid(g, 23, 31, hair='n', hair2='N', shirt='g', shirt2='q', mouth='angry', brows='angry', arms='push', k=1.1)
g.poly([(15, 3), (18, 3), (16, 7), (18, 7), (14, 12), (15, 8), (13, 8)], 'y'); S['fight_near_r'] = g.outline().out()

g = G(); kid(g, 16, 31, hair='G', hair2='g', shirt='q', shirt2='D', mouth='smile', k=1.3, glasses=True, hat='d'); S['stranger_r'] = g.outline().out()


# ===== 3層ぶんの 課題 =====
def face(g, cx, ey, w=6, mouth_y=None, teethw=None):
    g.px([(cx - w - 1, ey - 2), (cx - w, ey - 1), (cx - w + 1, ey - 1)], 'k'); g.px([(cx + w + 1, ey - 2), (cx + w, ey - 1), (cx + w - 1, ey - 1)], 'k')
    g.rect(cx - w - 1, ey, 3, 2, 'r'); g.rect(cx + w - 1, ey, 3, 2, 'r')
    if mouth_y: teeth(g, cx - (teethw or 6), cx + (teethw or 6), mouth_y, 3)

g = G()  # 100点の 大まじん（テスト）
g.rect(5, 4, 22, 25, 'w'); g.rect(5, 26, 22, 3, 'W')
g.poly([(5, 4), (1, 0), (9, 4)], 'w'); g.poly([(27, 4), (31, 0), (23, 4)], 'w')
g.ell(16, 7, 9, 2, 'r'); g.px([(10, 7), (11, 7), (13, 7), (14, 7), (17, 7), (18, 7), (20, 7), (21, 7)], 'w')
face(g, 16, 13, 5, 20, 7)
for y in (25,): g.rect(8, y, 16, 1, 'G')
g.ell(3, 18, 2, 4, 'w'); g.ell(29, 18, 2, 4, 'w')
S['test_m'] = g.outline().out()
g = G(); g.rect(5, 2, 22, 28, 'w'); g.rect(5, 28, 22, 2, 'W')
g.rect(8, 5, 8, 2, 'G'); g.rect(19, 4, 6, 4, 'W'); g.px([(20, 5), (21, 6), (22, 5), (23, 4)], 'r')
for i, y in enumerate((11, 16, 21)):
    g.rect(8, y, 2, 2, 'G'); g.rect(11, y, 12, 1, 'G'); g.rect(11, y + 2, 8, 1, 'G')
S['test_r'] = g.outline().out()

g = G()  # しゅくだい 大なだれ
for i, (x, y) in enumerate([(4, 20), (8, 14), (13, 8), (17, 13), (21, 19), (10, 24), (18, 24)]):
    g.poly([(x, y), (x + 9, y - 2), (x + 11, y + 6), (x + 2, y + 8)], 'w' if i % 2 else 'W')
face(g, 16, 17, 5, 22, 6)
S['homework_m'] = g.outline().out()
g = G(); g.rect(6, 12, 18, 16, 'W'); g.rect(8, 9, 18, 16, 'w')
for y in (12, 15, 18, 21): g.rect(11, y, 12, 1, 'G')
g.rect(22, 4, 3, 10, 'y'); g.px([(23, 14), (23, 15)], 's')
S['homework_r'] = g.outline().out()

g = G()  # なくしものの ぬま
g.ell(16, 22, 15, 8, 'e', shade='E', light='c')
g.ell(16, 21, 10, 4, 'k')
g.poly([(9, 16), (11, 6), (13, 16)], 'E'); g.poly([(19, 16), (21, 4), (23, 16)], 'E')
g.rect(11, 18, 2, 2, 'r'); g.rect(20, 18, 2, 2, 'r')
g.px([(5, 13), (4, 12), (27, 14), (28, 13)], 'w')
S['forgot_item_m'] = g.outline().out()
g = G(); g.rect(6, 10, 20, 18, 'r'); g.rect(6, 25, 20, 3, 'R'); g.rect(8, 6, 16, 6, 'R'); g.rect(9, 8, 14, 3, 'k')
g.rect(10, 16, 12, 6, 'R'); g.rect(14, 18, 4, 2, 'y')
S['forgot_item_r'] = g.outline().out()

g = G()  # ギザギザ ハートの 竜
g.ell(11, 14, 7, 7, 'r', shade='R'); g.ell(21, 14, 7, 7, 'r', shade='R')
g.poly([(4, 16), (28, 16), (16, 30)], 'r'); g.poly([(10, 22), (22, 22), (16, 30)], 'R')
g.line(16, 8, 14, 13, 'k', 1); g.line(14, 13, 18, 17, 'k', 1); g.line(18, 17, 15, 24, 'k', 1)
for x in (6, 10, 22, 26): g.poly([(x - 2, 9), (x, 3), (x + 2, 9)], 'R')
g.rect(8, 15, 3, 2, 'y'); g.rect(21, 15, 3, 2, 'y'); g.px([(9, 15), (22, 15)], 'k')
teeth(g, 11, 21, 20, 3)
S['friend_fight_m'] = g.outline().out()
g = G(); kid(g, 9, 31, hair='n', hair2='N', shirt='b', shirt2='B', mouth='angry', brows='angry'); kid(g, 23, 31, hair='y', hair2='Y', shirt='o', shirt2='O', mouth='angry', brows='angry')
S['friend_fight_r'] = g.outline().out()

g = G()  # もやもや 二面ぐも
g.ell(10, 15, 9, 8, 'P', shade='p', light='w'); g.ell(22, 15, 9, 8, 'c', shade='C', light='w'); g.ell(16, 20, 12, 6, 'G')
face(g, 10, 14, 3); face(g, 22, 14, 3)
g.px([(8, 19), (9, 18), (10, 18), (11, 19)], 'k'); g.px([(20, 18), (21, 19), (22, 19), (23, 18)], 'k')
S['misunder_m'] = g.outline().out()
g = G(); kid(g, 8, 31, hair='n', hair2='N', shirt='e', shirt2='E', mouth='o'); kid(g, 24, 31, hair='k', hair2='g', shirt='P', shirt2='p', mouth='flat')
g.ell(12, 5, 6, 4, 'w'); g.px([(10, 5), (12, 5), (14, 5)], 'g'); g.ell(22, 4, 5, 3, 'w'); g.px([(21, 3), (22, 4), (21, 5)], 'b')
S['misunder_r'] = g.outline().out()

g = G()  # ひそひそ こうもり
g.poly([(16, 12), (2, 6), (5, 14), (1, 20), (9, 18), (16, 24)], 'd'); g.poly([(16, 12), (30, 6), (27, 14), (31, 20), (23, 18), (16, 24)], 'd')
g.ell(16, 17, 6, 7, 'd', shade='D')
g.poly([(11, 11), (12, 6), (14, 11)], 'd'); g.poly([(18, 11), (20, 6), (21, 11)], 'd')
g.rect(12, 15, 2, 2, 'r'); g.rect(18, 15, 2, 2, 'r'); g.px([(14, 20), (15, 21), (16, 20), (17, 21), (18, 20)], 'w')
S['rumor_m'] = g.outline().out()
g = G(); kid(g, 10, 31, hair='n', hair2='N', shirt='g', shirt2='q', mouth='smile'); kid(g, 22, 31, hair='y', hair2='Y', shirt='P', shirt2='p', mouth='smile')
g.ell(16, 16, 2, 3, 's')
S['rumor_r'] = g.outline().out()

g = G()  # しっぱい ループ大へび
for i in range(36):
    a = i / 36 * math.tau
    g.ell(16 + math.cos(a) * 10, 17 + math.sin(a) * 10, 3.2, 3.2, 'e' if i % 6 else 'y')
g.ell(25, 9, 5, 4, 'e', shade='E'); g.rect(25, 7, 2, 2, 'r'); g.px([(29, 11), (30, 12), (30, 10)], 'r')
S['practice_m'] = g.outline().out()
g = G(); kid(g, 14, 31, hair='n', hair2='N', shirt='b', shirt2='B', mouth='flat', k=1.2)
g.rect(22, 8, 2, 16, 'W'); g.px([(22, 12), (22, 16), (22, 20)], 'k'); g.line(19, 20, 22, 18, 's', 2)
S['practice_r'] = g.outline().out()

g = G()  # バラバラ 四つ頭
for cx, cy, col, sh in [(9, 9, 'o', 'O'), (23, 9, 'b', 'B'), (9, 22, 'e', 'E'), (23, 22, 'P', 'p')]:
    g.ell(cx, cy, 6, 6, col, shade=sh)
    g.rect(cx - 3, cy - 1, 2, 2, 'r'); g.rect(cx + 1, cy - 1, 2, 2, 'r'); g.px([(cx - 2, cy + 3), (cx - 1, cy + 3), (cx, cy + 3), (cx + 1, cy + 3), (cx + 2, cy + 3)], 'k')
g.ell(16, 16, 4, 4, 'd')
S['team_m'] = g.outline().out()
g = G(); g.ell(16, 26, 13, 4, 'n', shade='N')
kid(g, 6, 24, hair='n', hair2='N', shirt='o', shirt2='O', mouth='o', k=.8); kid(g, 16, 22, hair='k', hair2='g', shirt='b', shirt2='B', mouth='flat', k=.8); kid(g, 26, 24, hair='y', hair2='Y', shirt='e', shirt2='E', mouth='o', k=.8)
S['team_r'] = g.outline().out()

# ===== 22課題ぶんの 専用の絵 =====
def eyes2(g, x0, x1, y, c='r'):
    g.rect(x0, y, 2, 2, c); g.rect(x1, y, 2, 2, c)
def flame(g, cx, by, w, h, c1='r', c2='o', c3='y'):
    g.poly([(cx - w, by), (cx - w * .8, by - h * .5), (cx - w * .4, by - h * .7), (cx - w * .2, by - h), (cx + w * .1, by - h * .6), (cx + w * .5, by - h * .85), (cx + w * .7, by - h * .45), (cx + w, by)], c1)
    g.ell(cx, by - h * .25, w * .7, h * .3, c2); g.ell(cx, by - h * .15, w * .35, h * .18, c3)
def ball(g, cx, cy, r=3):
    g.ell(cx, cy, r, r, 'r', shade='R', light='w')

# しかえし 火の玉
g = G(); flame(g, 16, 30, 13, 28)
g.px([(9, 15), (10, 16), (11, 16), (12, 17)], 'k'); g.px([(23, 15), (22, 16), (21, 16), (20, 17)], 'k'); eyes2(g, 10, 20, 17, 'k')
teeth(g, 11, 21, 22, 3); g.ell(3, 26, 2.5, 3, 'o'); g.ell(29, 24, 2, 3, 'o')
S['payback_m'] = g.outline().out()
g = G(); kid(g, 16, 31, hair='k', hair2='g', shirt='r', shirt2='R', mouth='angry', brows='angry', k=1.25)
g.px([(4, 4), (5, 5), (6, 4), (4, 6), (6, 6)], 'r'); S['payback_r'] = g.outline().out()

# うわさの 黒い けむり
g = G()
for cx, cy, r in [(10, 20, 7), (20, 18, 8), (15, 11, 7), (24, 9, 5), (7, 10, 4)]: g.ell(cx, cy, r, r * .9, 'D', shade='k', light='d')
g.rect(11, 15, 2, 2, 'y'); g.rect(19, 15, 2, 2, 'y'); g.px([(13, 21), (14, 22), (15, 21), (16, 22), (17, 21), (18, 22)], 'w')
for x, y in [(3, 28), (6, 30), (27, 28), (29, 26)]: g.put(x, y, 'd')
S['bad_rep_m'] = g.outline().out()
g = G(); kid(g, 6, 31, hair='y', hair2='Y', shirt='g', shirt2='q', mouth='flat', k=.8); kid(g, 16, 31, hair='n', hair2='N', shirt='o', shirt2='O', mouth='flat', k=.8); kid(g, 26, 31, hair='k', hair2='g', shirt='P', shirt2='p', mouth='o', k=.8)
g.ell(12, 4, 3, 2, 'G'); g.ell(20, 4, 3, 2, 'G'); S['bad_rep_r'] = g.outline().out()

# つめたい かぜの かべ
g = G(); g.rect(3, 4, 26, 25, 'c'); g.rect(3, 25, 26, 4, 'C')
for y in (8, 14, 20): g.rect(3, y, 26, 1, 'C')
for i, y in enumerate((5, 11, 17, 23)):
    for x in range(4 + (i % 2) * 4, 29, 8): g.rect(x, y, 1, 3, 'C')
eyes2(g, 9, 21, 12, 'b'); g.px([(10, 11), (22, 11)], 'w'); g.rect(12, 18, 8, 1, 'k')
for x, y in [(1, 8), (0, 9), (30, 14), (31, 15), (1, 20), (30, 22)]: g.put(x, y, 'w')
S['cold_class_m'] = g.outline().out()
g = G(); kid(g, 7, 31, hair='n', hair2='N', shirt='e', shirt2='E', mouth='flat', k=.85); kid(g, 25, 31, hair='y', hair2='Y', shirt='b', shirt2='B', mouth='flat', k=.85); kid(g, 16, 29, hair='k', hair2='g', shirt='o', shirt2='O', mouth='o', k=.8)
g.px([(14, 3), (16, 2), (18, 3)], 'b'); S['cold_class_r'] = g.outline().out()

# あばれる 火の 手
g = G(); g.rect(10, 18, 12, 13, 'o'); g.ell(16, 16, 10, 8, 'o', shade='O', light='y')
for i, x in enumerate((7, 12, 17, 22)): g.rect(x, 3 + (i % 2) * 2, 4, 10, 'o'); g.ell(x + 2, 4 + (i % 2) * 2, 2, 2, 'y')
g.poly([(5, 18), (1, 10), (4, 9), (8, 15)], 'o')
flame(g, 16, 31, 6, 6, 'r', 'y', 'w'); eyes2(g, 11, 19, 15, 'k'); g.rect(13, 20, 6, 1, 'k')
S['got_rough_m'] = g.outline().out()
g = G(); kid(g, 16, 31, hair='y', hair2='Y', shirt='b', shirt2='B', mouth='flat', k=1.25)
g.line(10, 21, 19, 19, 's', 3); g.ell(20, 19, 2, 2, 'r'); S['got_rough_r'] = g.outline().out()

# とげとげ ことばの つる
g = G()
for i in range(28):
    t = i / 27; x = 16 + math.sin(t * 9) * 9; y = 30 - t * 26
    g.ell(x, y, 2.2, 2.2, 'e')
    if i % 3 == 0: g.poly([(x, y - 1), (x + (4 if i % 2 else -4), y - 3), (x, y + 1)], 'E')
g.ell(16, 7, 6, 5, 'e', shade='E'); eyes2(g, 12, 18, 6); teeth(g, 12, 20, 9, 2)
g.ell(5, 16, 3, 2, 'P'); g.ell(27, 22, 3, 2, 'P')
S['said_too_much_m'] = g.outline().out()
g = G(); kid(g, 16, 31, hair='n', hair2='N', shirt='g', shirt2='q', mouth='flat', k=1.25)
for x in (13, 16, 19): g.put(x, 1, 'k')
S['said_too_much_r'] = g.outline().out()

# わらい声の むれ
g = G()
for cx, cy, col, sh in [(8, 10, 'y', 'Y'), (24, 10, 'o', 'O'), (16, 21, 'y', 'Y'), (6, 24, 'o', 'O'), (26, 24, 'y', 'Y')]:
    g.ell(cx, cy, 6, 5.5, col, shade=sh)
    g.px([(cx - 3, cy - 1), (cx - 2, cy - 2), (cx - 1, cy - 1), (cx + 1, cy - 1), (cx + 2, cy - 2), (cx + 3, cy - 1)], 'k')
    g.poly([(cx - 3, cy + 1), (cx + 3, cy + 1), (cx, cy + 4)], 'r')
S['joined_in_m'] = g.outline().out()
g = G(); kid(g, 16, 31, hair='k', hair2='g', shirt='c', shirt2='C', mouth='flat', k=1.1)
g.rect(5, 8, 5, 6, 'r'); g.rect(5, 8, 5, 1, 'R'); g.ell(26, 28, 3, 1, 'G'); S['joined_in_r'] = g.outline().out()

# サボりの おばけ
g = G(); g.ell(16, 13, 11, 10, 'W', shade='G', light='w')
g.poly([(5, 13), (27, 13), (28, 29), (24, 25), (20, 30), (16, 25), (12, 30), (8, 25), (4, 29)], 'W')
g.rect(9, 12, 5, 1, 'k'); g.rect(19, 12, 5, 1, 'k'); g.ell(16, 19, 3, 2, 'k')
g.rect(22, 2, 7, 5, 'g'); g.rect(23, 3, 5, 3, 'b'); g.px([(25, 7), (24, 8)], 'g')
for x, y in [(3, 5), (4, 4), (5, 5), (6, 4), (4, 7), (5, 7)]: g.put(x, y, 'b')
S['skipped_hw_m'] = g.outline().out()
g = G(); g.rect(4, 8, 24, 18, 'b'); g.rect(4, 8, 24, 3, 'B'); g.rect(9, 13, 14, 10, 'w')
for y in (15, 18, 21): g.rect(11, y, 10, 1, 'W')
g.rect(18, 4, 10, 6, 'g'); g.rect(19, 5, 8, 4, 'c')
S['skipped_hw_r'] = g.outline().out()

# ろうかを かける つむじ風
g = G()
for i in range(6):
    y = 6 + i * 4; w = 13 - i * 1.6
    g.ell(16 + (i % 2) * 2 - 1, y, w, 2.2, 'c' if i % 2 else 'W')
g.ell(16, 13, 6, 4, 'c', shade='C'); eyes2(g, 12, 18, 12); g.rect(14, 15, 4, 1, 'k')
for y in (10, 18, 24): g.line(1, y, 4, y, 'C')
g.rect(3, 29, 26, 2, 'n')
S['ran_hall_m'] = g.outline().out()
g = G(); kid(g, 16, 31, hair='y', hair2='Y', shirt='y', shirt2='Y', mouth='o', k=.9)
g.rect(2, 30, 28, 2, 'N'); g.px([(5, 10), (4, 9), (27, 10), (28, 9), (26, 12)], 'k'); S['ran_hall_r'] = g.outline().out()

# おしゃべり ことり
g = G(); g.ell(14, 19, 10, 9, 'y', shade='Y', light='w')
g.ell(18, 10, 7, 6, 'y', shade='Y'); g.poly([(24, 9), (31, 11), (24, 13)], 'o')
g.rect(18, 8, 2, 2, 'k'); g.poly([(4, 18), (0, 12), (8, 15)], 'Y'); g.poly([(8, 20), (16, 16), (20, 24)], 'Y')
g.poly([(10, 27), (8, 31), (12, 29)], 'O'); g.poly([(16, 27), (16, 31), (19, 29)], 'O')
for x, y in [(26, 3), (28, 2), (29, 5), (31, 4), (25, 17), (28, 18)]: g.put(x, y, 'k')
S['chatting_m'] = g.outline().out()
g = G(); kid(g, 16, 31, hair='G', hair2='g', shirt='e', shirt2='E', mouth='flat', k=1.25, glasses=True)
g.rect(1, 4, 6, 14, 'e'); g.rect(1, 4, 6, 1, 'E'); S['chatting_r'] = g.outline().out()

# 漢字の 山おばけ
g = G(); g.poly([(1, 31), (16, 3), (31, 31)], 'G'); g.poly([(16, 3), (31, 31), (20, 31)], 'g')
g.poly([(12, 10), (16, 3), (20, 10)], 'w')
for (x, y) in [(9, 26), (14, 20), (20, 25), (17, 13)]:
    g.rect(x, y, 4, 1, 'k'); g.rect(x + 1, y - 1, 1, 4, 'k'); g.rect(x, y + 2, 4, 1, 'k')
eyes2(g, 11, 19, 16); teeth(g, 12, 20, 28, 2)
S['kanji_practice_m'] = g.outline().out()
g = G(); g.rect(4, 5, 24, 24, 'w'); g.rect(4, 26, 24, 3, 'W')
for x in (10, 16, 22): g.rect(x, 5, 1, 21, 'c')
for y in (11, 17, 23): g.rect(4, y, 24, 1, 'c')
g.rect(6, 7, 3, 1, 'k'); g.rect(7, 6, 1, 4, 'k')
g.line(20, 2, 28, 14, 'y', 2); g.put(28, 15, 'k')
S['kanji_practice_r'] = g.outline().out()

# にがて漢字の むれ
g = G()
for cx, cy in [(8, 9), (24, 9), (16, 20), (6, 25), (26, 25)]:
    g.rect(cx - 5, cy - 5, 10, 10, 'w'); g.rect(cx - 5, cy + 3, 10, 2, 'W')
    g.rect(cx - 3, cy - 3, 6, 1, 'k'); g.rect(cx, cy - 4, 1, 7, 'k'); g.rect(cx - 2, cy, 5, 1, 'k')
    g.put(cx - 3, cy + 1, 'r'); g.put(cx + 3, cy + 1, 'r')
g.line(1, 1, 30, 30, 'r'); S['weak_kanji_m'] = g.outline().out()
g = G(); g.rect(4, 3, 24, 27, 'w'); g.rect(4, 28, 24, 2, 'W')
for y in (7, 13, 19, 25):
    g.rect(7, y, 10, 1, 'G'); g.line(20, y - 1, 24, y + 2, 'r'); g.line(24, y - 1, 20, y + 2, 'r')
g.ell(23, 7, 3, 3, 'r'); g.ell(23, 7, 2, 2, 'w')
S['weak_kanji_r'] = g.outline().out()

# くやしさの ほのお
g = G(); flame(g, 16, 31, 14, 30, 'R', 'r', 'o')
g.px([(9, 16), (10, 17), (11, 17), (12, 18)], 'k'); g.px([(23, 16), (22, 17), (21, 17), (20, 18)], 'k'); eyes2(g, 10, 20, 18, 'y')
g.px([(11, 25), (12, 24), (13, 24), (14, 24), (15, 24), (16, 24), (17, 24), (18, 24), (19, 24), (20, 25)], 'k')
g.px([(10, 21), (10, 22), (21, 21), (21, 22)], 'c')
S['lost_game_m'] = g.outline().out()
g = G(); kid(g, 9, 31, hair='y', hair2='Y', shirt='r', shirt2='R', mouth='laugh', arms='up', k=.95); kid(g, 23, 31, hair='n', hair2='N', shirt='r', shirt2='R', mouth='laugh', arms='up', k=.95)
ball(g, 16, 4, 3); S['lost_game_r'] = g.outline().out()

# 見て見ぬふりの きり
g = G(); g.ell(16, 16, 15, 12, 'W', shade='c', light='w'); g.rect(1, 18, 30, 8, 'W')
for x0 in (2, 9, 16, 23): g.poly([(x0, 25), (x0 + 6, 25), (x0 + 3, 30)], 'c')
g.rect(7, 13, 6, 2, 'G'); g.rect(19, 13, 6, 2, 'G'); g.rect(6, 12, 8, 1, 'C'); g.rect(18, 12, 8, 1, 'C')
g.rect(13, 20, 6, 1, 'C')
S['saw_exclusion_m'] = g.outline().out()
g = G(); kid(g, 6, 31, hair='n', hair2='N', shirt='P', shirt2='p', mouth='smile', k=.8); kid(g, 15, 31, hair='y', hair2='Y', shirt='o', shirt2='O', mouth='smile', k=.8)
kid(g, 27, 31, hair='k', hair2='g', shirt='c', shirt2='C', mouth='flat', k=.75); g.rect(21, 4, 1, 26, 'G')
S['saw_exclusion_r'] = g.outline().out()

# ひそひそ こうもりの むれ
g = G()
for cx, cy, s in [(16, 18, 1.0), (7, 7, .6), (25, 7, .6)]:
    g.poly([(cx, cy - 4 * s), (cx - 14 * s, cy - 9 * s), (cx - 11 * s, cy), (cx - 15 * s, cy + 4 * s), (cx, cy + 7 * s)], 'D')
    g.poly([(cx, cy - 4 * s), (cx + 14 * s, cy - 9 * s), (cx + 11 * s, cy), (cx + 15 * s, cy + 4 * s), (cx, cy + 7 * s)], 'D')
    g.ell(cx, cy, 5 * s, 6 * s, 'd'); g.put(cx - 2 * s, cy - 1, 'y'); g.put(cx + 2 * s, cy - 1, 'y')
g.px([(14, 22), (15, 21), (16, 22), (17, 21), (18, 22)], 'w')
S['whisper_group_m'] = g.outline().out()
g = G(); kid(g, 10, 31, hair='k', hair2='g', shirt='e', shirt2='E', mouth='laugh', k=1.0); kid(g, 23, 31, hair='y', hair2='Y', shirt='o', shirt2='O', mouth='smile', k=1.0)
g.ell(16, 13, 2, 3, 's'); g.ell(28, 3, 3, 2, 'w'); g.px([(27, 3), (29, 3)], 'k'); S['whisper_group_r'] = g.outline().out()

# とおくの 小さな かげ
g = G(); g.ell(16, 28, 14, 3, 'G')
g.ell(16, 18, 5, 8, 'D', shade='k'); g.ell(16, 10, 4, 4, 'D')
g.put(14, 10, 'c'); g.put(18, 10, 'c')
for x, y in [(4, 6), (8, 3), (24, 4), (28, 8), (3, 16), (29, 18)]: g.put(x, y, 'c')
S['alone_kid_m'] = g.outline().out()
g = G(); kid(g, 12, 31, hair='n', hair2='N', shirt='P', shirt2='p', mouth='flat', k=1.1)
g.poly([(11, 21), (19, 18), (27, 21), (27, 27), (19, 25), (11, 27)], 'e'); g.line(19, 18, 19, 25, 'E')
S['alone_kid_r'] = g.outline().out()

# ずるい！の 大うず
g = G()
for i in range(60):
    a = i / 60 * math.tau * 2.6; r = 2 + i * .22
    g.ell(16 + math.cos(a) * r, 16 + math.sin(a) * r, 2, 2, 'b' if i % 8 < 5 else 'c')
g.ell(16, 16, 4, 4, 'B'); eyes2(g, 13, 17, 15, 'y')
g.rect(28, 2, 2, 6, 'r'); g.rect(28, 9, 2, 2, 'r'); g.rect(2, 24, 2, 5, 'r'); g.rect(2, 30, 2, 1, 'r')
S['duty_fight_m'] = g.outline().out()
g = G(); kid(g, 9, 30, hair='n', hair2='N', shirt='w', shirt2='W', mouth='angry', brows='angry', arms='push', hat='w'); kid(g, 23, 30, hair='k', hair2='g', shirt='w', shirt2='W', mouth='angry', brows='angry', arms='push', hat='w')
g.ell(16, 29, 4, 2, 'G'); S['duty_fight_r'] = g.outline().out()

# わりこみ ムシ
g = G()
for i, x in enumerate((6, 12, 18, 24)): g.ell(x, 19, 4.5, 4.5, 'e' if i % 2 else 'E')
g.ell(27, 15, 5, 5, 'e', shade='E'); g.rect(26, 13, 2, 2, 'r'); g.rect(29, 13, 1, 2, 'r')
g.line(26, 10, 23, 3, 'k'); g.line(29, 10, 31, 3, 'k')
for x in (6, 12, 18, 24): g.line(x, 23, x - 2, 28, 'k'); g.line(x, 23, x + 2, 28, 'k')
g.poly([(4, 4), (14, 4), (14, 1), (19, 6), (14, 11), (14, 8), (4, 8)], 'y')
S['line_cut_m'] = g.outline().out()
g = G(); kid(g, 8, 31, hair='n', hair2='N', shirt='b', shirt2='B', mouth='o', k=.85); kid(g, 18, 31, hair='y', hair2='Y', shirt='o', shirt2='O', mouth='smile', k=.85)
g.rect(24, 14, 8, 4, 'W'); g.rect(27, 10, 2, 4, 'G'); g.put(28, 18, 'c'); g.put(28, 20, 'c')
S['line_cut_r'] = g.outline().out()

# ひっぱりあいの 大だこ
g = G(); g.ell(16, 11, 10, 9, 'P', shade='p', light='w')
for i, x in enumerate((7, 11, 16, 21, 25)):
    g.line(x, 18, x + (-6 if x < 16 else 6 if x > 16 else 0), 28 - (i % 2) * 2, 'P', 3)
ball(g, 4, 28, 3.5); ball(g, 28, 28, 3.5)
g.px([(10, 8), (11, 9), (12, 9)], 'k'); g.px([(22, 8), (21, 9), (20, 9)], 'k'); eyes2(g, 10, 20, 10); g.ell(16, 15, 2, 1.5, 'k')
S['ball_grab_m'] = g.outline().out()
g = G(); kid(g, 7, 31, hair='n', hair2='N', shirt='b', shirt2='B', mouth='angry', brows='angry', arms='push', k=.95); kid(g, 25, 31, hair='k', hair2='g', shirt='P', shirt2='p', mouth='angry', brows='angry', arms='push', k=.95)
ball(g, 16, 22, 4); S['ball_grab_r'] = g.outline().out()

# さぼり だらけ だぬき
g = G(); g.ell(16, 21, 11, 9, 'N', shade='n', light='W'); g.ell(16, 11, 9, 7, 'N', shade='n')
g.poly([(7, 7), (8, 1), (12, 5)], 'n'); g.poly([(25, 7), (24, 1), (20, 5)], 'n')
g.ell(12, 11, 3, 2.5, 'D'); g.ell(20, 11, 3, 2.5, 'D'); g.rect(10, 11, 3, 1, 'w'); g.rect(19, 11, 3, 1, 'w')
g.ell(16, 15, 2, 1.5, 'k'); g.ell(16, 23, 6, 5, 'W')
g.line(27, 30, 31, 12, 'Y', 2); g.rect(28, 26, 4, 5, 'y')
S['duty_skip_m'] = g.outline().out()
g = G(); kid(g, 13, 31, hair='y', hair2='Y', shirt='o', shirt2='O', mouth='laugh', arms='up', k=1.05)
g.line(22, 3, 28, 20, 'Y', 2); g.poly([(26, 20), (31, 20), (31, 27), (25, 27)], 'y'); S['duty_skip_r'] = g.outline().out()

# 大かんせいの 大波
g = G(); g.poly([(0, 31), (0, 20), (6, 10), (14, 4), (24, 4), (30, 10), (26, 12), (22, 10), (20, 14), (24, 20), (31, 22), (31, 31)], 'b')
g.poly([(0, 31), (0, 24), (10, 22), (20, 26), (31, 25), (31, 31)], 'B')
g.poly([(14, 4), (24, 4), (30, 10), (26, 12), (22, 8), (16, 7)], 'w')
eyes2(g, 8, 15, 14, 'y'); g.ell(12, 20, 4, 2.5, 'k')
for x, y in [(2, 3), (4, 2), (28, 16), (30, 17)]: g.put(x, y, 'w')
S['relay_m'] = g.outline().out()
g = G()
for i, x in enumerate((4, 10, 16, 22, 28)): kid(g, x, 22, hair='nkyNg'[i], hair2='N', shirt='rbyeo'[i], shirt2='RBYEO'[i], mouth='laugh', arms='up' if i % 2 else None, k=.55)
g.rect(0, 25, 32, 7, 'e'); g.rect(0, 28, 32, 1, 'w')
S['relay_r'] = g.outline().out()

# バトン落としの つむじ風
g = G()
for i in range(7):
    y = 4 + i * 3.6; w = 14 - i * 1.7
    g.ell(16 + math.sin(i) * 2, y, w, 2, 'G' if i % 2 else 'c')
g.ell(16, 11, 5, 3.5, 'c', shade='C'); eyes2(g, 13, 17, 10)
g.rect(3, 22, 3, 8, 'r'); g.rect(26, 2, 3, 8, 'y'); g.put(4, 22, 'w'); g.put(27, 2, 'w')
S['baton_practice_m'] = g.outline().out()
g = G(); g.line(3, 6, 14, 14, 's', 3); g.line(29, 8, 19, 15, 's', 3)
g.line(13, 25, 22, 29, 'r', 3); g.ell(16, 30, 6, 1, 'G')
for x, y in [(9, 20), (10, 21), (22, 21), (23, 20)]: g.put(x, y, 'k')
g.rect(0, 30, 32, 2, 'O'); S['baton_practice_r'] = g.outline().out()

# ぎすぎす 四つ頭
g = G()
for cx, cy, col, sh in [(9, 9, 'r', 'R'), (23, 9, 'o', 'O'), (9, 22, 'g', 'q'), (23, 22, 'd', 'D')]:
    g.ell(cx, cy, 6, 6, col, shade=sh)
    for a in range(0, 360, 60):
        r = math.radians(a); g.poly([(cx + math.cos(r - .3) * 5, cy + math.sin(r - .3) * 5), (cx + math.cos(r) * 8, cy + math.sin(r) * 8), (cx + math.cos(r + .3) * 5, cy + math.sin(r + .3) * 5)], col)
    g.px([(cx - 3, cy - 2), (cx - 2, cy - 1), (cx + 3, cy - 2), (cx + 2, cy - 1)], 'k'); g.rect(cx - 2, cy, 1, 1, 'y'); g.rect(cx + 2, cy, 1, 1, 'y')
    g.px([(cx - 2, cy + 3), (cx - 1, cy + 2), (cx, cy + 3), (cx + 1, cy + 2), (cx + 2, cy + 3)], 'k')
g.line(14, 14, 18, 18, 'y'); g.line(18, 14, 14, 18, 'y')
S['team_pick_m'] = g.outline().out()
g = G(); g.rect(6, 1, 20, 9, 'e'); g.rect(6, 8, 20, 2, 'E'); g.rect(9, 3, 5, 1, 'w'); g.rect(18, 3, 5, 1, 'w'); g.rect(9, 6, 4, 1, 'w'); g.rect(18, 6, 6, 1, 'w')
kid(g, 6, 31, hair='n', hair2='N', shirt='r', shirt2='R', mouth='angry', brows='angry', k=.75); kid(g, 16, 31, hair='y', hair2='Y', shirt='w', shirt2='W', mouth='o', k=.75); kid(g, 26, 31, hair='k', hair2='g', shirt='r', shirt2='R', mouth='angry', brows='angry', k=.75)
S['team_pick_r'] = g.outline().out()

# ===== 自分・アイテム =====
g = G(); kid(g, 16, 31, hair='n', hair2='N', shirt='b', shirt2='B', mouth='smile', k=1.3); S['hero'] = g.outline().out()
g = G(); kid(g, 16, 31, hair='k', hair2='g', shirt='P', shirt2='p', mouth='smile', k=1.3, glasses=True); S['hero_hanoko'] = g.outline().out()
g = G(); kid(g, 16, 31, hair='o', hair2='O', shirt='y', shirt2='Y', mouth='laugh', k=1.3); S['hero_tario'] = g.outline().out()
g = G(); kid(g, 16, 31, hair='n', hair2='N', shirt='e', shirt2='E', mouth='flat', k=1.3); g.rect(9, 8, 15, 2, 'r'); S['hero_musuhi'] = g.outline().out()
g = G(); kid(g, 16, 31, hair='y', hair2='Y', shirt='b', shirt2='B', mouth='smile', k=1.3); S['hero_hayatsu'] = g.outline().out()
g = G(); kid(g, 16, 31, hair='g', hair2='q', shirt='c', shirt2='C', mouth='flat', k=1.3); S['hero_kitori'] = g.outline().out()
g = G(); kid(g, 16, 31, hair='G', hair2='g', shirt='e', shirt2='E', mouth='smile', k=1.3, glasses=True); S['teacher'] = g.outline().out()
g = G(); kid(g, 9, 30, hair='y', hair2='Y', shirt='o', shirt2='O', mouth='laugh'); kid(g, 23, 30, hair='n', hair2='N', shirt='b', shirt2='B', mouth='laugh'); S['friend'] = g.outline().out()
g = G(); kid(g, 11, 31, hair='k', hair2='g', shirt='P', shirt2='p', mouth='smile', k=1.25); kid(g, 24, 31, hair='n', hair2='N', shirt='b', shirt2='B', mouth='smile', k=.8); S['family'] = g.outline().out()
g = G()
g.poly([(3, 9), (15, 7), (15, 25), (3, 27)], 'r'); g.poly([(17, 7), (29, 9), (29, 27), (17, 25)], 'r')
g.poly([(5, 10), (15, 9), (15, 23), (5, 25)], 'w'); g.poly([(17, 9), (27, 10), (27, 25), (17, 23)], 'w')
for y in (13, 16, 19): g.line(7, y, 13, y - 1, 'G'); g.line(19, y - 1, 25, y, 'G')
g.rect(15, 7, 2, 20, 'R'); g.rect(22, 3, 3, 8, 'y')
S['book'] = g.outline().out()
g = G(); g.rect(7, 4, 18, 24, 'b'); g.rect(9, 6, 14, 20, 'w'); g.rect(7, 4, 3, 24, 'B')
for y in (10, 14, 18, 22): g.rect(12, y, 9, 1, 'G')
g.line(22, 2, 28, 16, 'y', 2); g.px([(28, 17)], 'k')
S['diary'] = g.outline().out()

for k, v in S.items():
    assert len(v) == N and all(len(r) == N for r in v), k

PAL = {'k': '#12172a', 'w': '#ffffff', 'W': '#d9dee8', 'p': '#8e6ad8', 'P': '#b79cf0', 'y': '#ffd23f', 'Y': '#e0a800', 'r': '#e5484d', 'R': '#b52a32',
       'g': '#5c6b8a', 'q': '#45526e', 'G': '#a7b2c8', 'o': '#f08c3a', 'O': '#c4651b', 's': '#f6cfa8', 'S': '#e3ae85', 'b': '#3b6fd8', 'B': '#2a52a8',
       'n': '#7a4b2a', 'N': '#9c6a40', 'e': '#2f9e55', 'E': '#21763f', 'c': '#9fb6c8', 'C': '#7690a6', 'd': '#3d2f63', 'D': '#2a1f47'}
used = set(ch for v in S.values() for row in v for ch in row) - {'.'}
assert used <= set(PAL), used - set(PAL)

js = """// 自動生成（scripts/sprites.py）。直接編集しない
// ドット絵（32×32）の描画。課題は form 0=かいぶつ／1=現実の姿＋ぶきみなオーラ（2=SVG の絵は illust.js）
(function (root) {
  'use strict';
  var PAL = %s;
  var ART = %s;
  var N = %d, M = 3, SIZE = N + M * 2;
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
    ring(g, '#5a1e8c'); ring(g, 'rgba(120,50,190,0.6)'); ring(g, 'rgba(120,50,190,0.3)');
    return g;
  }
  // 主人公の ストレスの 見た目：mood 0=ふつう／1=汗／2=汗＋顔色が わるい／3=まっさお（動けない）
  var SKIN = { '#f6cfa8': 1, '#e3ae85': 1 };
  var PALE = ['#f1dcc4', '#d9e3d0', '#c9d3dd'];
  function stressLook(g, key, mood) {
    var art = ART[key], top = N, left = N, right = -1;
    for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) if (art[r][c] === 's') { if (r < top) top = r; if (c < left) left = c; if (c > right) right = c; }
    if (top === N) return g;
    if (mood >= 2) {
      var pale = PALE[mood - 2] || PALE[2];
      for (var y = 0; y < SIZE; y++) for (var x = 0; x < SIZE; x++) if (SKIN[g[y][x]]) g[y][x] = pale;
      // 笑顔を 消す（口の 赤を 顔色に）
      for (var r3 = top; r3 < top + 14 && r3 < N; r3++) for (var c3 = left; c3 <= right; c3++) if (art[r3][c3] === 'r') g[r3 + M][c3 + M] = pale;
      // 目の下の くま
      for (var r2 = top; r2 < top + 12 && r2 < N; r2++) for (var c2 = left; c2 <= right; c2++) if (art[r2][c2] === 'k' && art[r2 - 1] && art[r2 - 1][c2] === 'k' && art[r2 + 1] && art[r2 + 1][c2] === 's') g[r2 + 1 + M][c2 + M] = '#9aa4c8';
    }
    if (mood >= 3) {
      // 青い たて線（どんより）
      for (var c4 = left + 1; c4 <= right - 1; c4 += 2) for (var r4 = top + 1; r4 < top + 4; r4++) if (art[r4] && art[r4][c4] === 's') g[r4 + M][c4 + M] = '#5b6fb5';
    }
    if (mood >= 1) {
      var drops = mood >= 2 ? [[right + 2, top + 2], [right + 3, top + 5], [left - 3, top + 3]] : [[right + 2, top + 3]];
      drops.forEach(function (d) {
        var dx = d[0] + M, dy = d[1] + M;
        [[0, 0], [0, 1], [-1, 1], [1, 1], [-1, 2], [0, 2], [1, 2], [0, 3]].forEach(function (o) { var yy = dy + o[1], xx = dx + o[0]; if (g[yy] && xx >= 0 && xx < SIZE) g[yy][xx] = o[1] === 0 ? '#ffffff' : '#7fd3f0'; });
      });
    }
    return g;
  }
  function draw(cv, key, form, mood) {
    cv.width = SIZE; cv.height = SIZE;
    var x = cv.getContext('2d');
    x.clearRect(0, 0, SIZE, SIZE);
    var g = grid(key);
    if (form === 1) g = aura(g);
    if (mood) g = stressLook(g, key, mood);
    for (var yy = 0; yy < SIZE; yy++) for (var xx = 0; xx < SIZE; xx++) if (g[yy][xx]) { x.fillStyle = g[yy][xx]; x.fillRect(xx, yy, 1, 1); }
    if (form === 1) {
      x.globalCompositeOperation = 'source-atop'; x.fillStyle = 'rgba(70,20,110,0.28)'; x.fillRect(0, 0, SIZE, SIZE);
      x.globalCompositeOperation = 'source-over';
    }
  }
  function enemyKey(id, form) { return id + (form === 0 ? '_m' : '_r'); }
  root.SST_SPRITES = { draw: draw, enemyKey: enemyKey, has: function (k) { return !!ART[k]; } };
})(this);
""" % (json.dumps(PAL), json.dumps(S, ensure_ascii=False), N)
open('src/sprites.js', 'w').write(js)
print('sprites', len(S))
