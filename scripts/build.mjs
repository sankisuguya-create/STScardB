// src を1枚の dist/index.html にまとめ、gas/Code.gs を dist/ に写す。
// node scripts/build.mjs  /  --check で dist が最新かを確かめる
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
const r = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const js = ['src/data.js', 'src/engine.js', 'src/platform.js', 'src/sprites.js', 'src/ui.js'].map(r).join('\n').replace(/<\/script/gi, '<\\/script');
const html = r('src/index.template.html').replace('/*@@STYLE@@*/', () => r('src/style.css')).replace('/*@@SCRIPT@@*/', () => js);
import { createRequire } from 'node:module';
const D = createRequire(import.meta.url)('../src/data.js');
const out = { 'dist/index.html': html, 'dist/Code.gs': r('gas/Code.gs'), 'docs/content.md': contentMd(D) };
const check = process.argv.includes('--check');
let stale = 0;
for (const [p, body] of Object.entries(out)) {
  const url = new URL('../' + p, import.meta.url);
  if (check) { if (!existsSync(url) || readFileSync(url, 'utf8') !== body) { console.error('古い: ' + p); stale++; } }
  else writeFileSync(url, body);
}
if (check && stale) process.exit(1);
console.log(check ? 'dist は最新' : 'dist を生成した');

// 担任の確認用：data.js の文面を一覧にする
function contentMd(D) {
  const L = ['# 文面一覧（自動生成・直接編集しない）', '', '正本は `src/data.js`。ここを見て直す箇所を決め、data.js を直して `node scripts/build.mjs` で作り直す。', ''];
  const fx = (c) => [c.solve && '解決' + c.solve, c.guard && 'ゆとり' + c.guard, c.heal && '余裕+' + c.heal, c.draw && '引く' + c.draw, c.reveal && '見方', c.trust && '信頼' + (c.trust > 0 ? '+' : '') + c.trust, c.curse && 'モヤモヤ', c.chance && D.CHANCE[c.chance].label, c.fail && '失敗→' + D.CARDS[c.fail].name, c.req && '条件 ' + JSON.stringify(c.req), c.ctx && '場面 ' + c.ctx.map((k) => D.CTX_LABEL[k]).join('・')].filter(Boolean).join('／');
  L.push('## カード', '', '| 名前 | せりふ・行動 | 種類 | 判定 | 元気 | 効果 |', '|---|---|---|---|---|---|');
  for (const c of Object.values(D.CARDS)) L.push(`| ${c.name} | ${c.line} | ${D.TYPE_LABEL[c.type]} | ${c.judge} | ${c.unplayable ? '-' : c.cost} | ${fx(c)} |`);
  L.push('', '## 支え（いつでも使える・使い切り）', '', '| 名前 | せりふ・行動 | 効果 |', '|---|---|---|');
  for (const u of Object.values(D.SUPPORTS)) L.push(`| ${u.name} | ${u.line} | ${u.note}${u.consult ? '（ひと休みで戻る）' : ''} |`);
  L.push('', '## 課題', '');
  for (const e of Object.values(D.ENEMIES)) {
    L.push(`### ${e.scene}（${e.kind}）`, '', `- 最初の見え方：${e.name}`);
    if (e.view) L.push(`- ほんとう：${e.view.name}（${e.view.truth === 'hostile' ? '本当に いやなこと' : 'わざとではない'}）`);
    L.push(`- つぎに起きそうなこと：${e.moves.map((m) => m.say).join('／')}`, `- 場面カード：${e.situ.map((id) => D.CARDS[id].name).join('、')}`, `- 相手から見ると：${e.other}`, '');
  }
  L.push('## できごと', '');
  for (const ev of Object.values(D.EVENTS)) {
    L.push(`### ${ev.title}`, '', ev.text, '');
    for (const o of ev.options) L.push(`- ${o.label}${o.req ? '（信頼' + o.req.trust + '以上）' : ''} → ${o.result}`);
    L.push('');
  }
  return L.join('\n');
}
