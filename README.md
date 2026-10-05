# こころの冒険（STScardB）

SST 用のデッキ構築ゲーム（お試し版）。毎日の「こまった」を課題とし、手札の選択肢でこたえる。GAS で配る。

- 設計と判断の理由：[docs/design.md](docs/design.md)
- 文面の一覧（担任の確認用・自動生成）：[docs/content.md](docs/content.md)

## 手元で遊ぶ

`dist/index.html` をブラウザで開く。GAS がなくても動く（保存先は localStorage）。

## GAS に貼る

1. Apps Script で新しいプロジェクトを作る。
2. `dist/Code.gs` の中身を `コード.gs` に貼る。
3. HTML ファイル `index` を作り、`dist/index.html` の中身を貼る。
4. デプロイ → 新しいデプロイ → ウェブアプリ。実行ユーザーは「ウェブアプリにアクセスしているユーザー」、アクセスできるユーザーは「（学校のドメイン）内の全員」。
5. 変更した時は、**2つのファイルを同じコミットからまとめて貼り直し**、デプロイを「新しいバージョン」で更新する。

途中経過は、児童本人の UserProperties に保存する（ほかの児童や教師からは見えない）。

## 直す・確かめる

```bash
node scripts/build.mjs        # src から dist と docs/content.md を作る（src を直したら必ず実行）
npm test                      # dist が最新か・規則の検査・合格基準（シミュレータ1000回×3方針）
node tests/sim.cjs 1000       # 攻略しやすさの数値を見る
node tests/ui.cjs shots       # 1366×768・タッチで通しプレイし、画面を shots/ に撮る（要 playwright）
```

- 数値と文面は `src/data.js` だけを直す。
- 難しさは `RULES.hpScale`（問題の大きさ）と `RULES.stressScale`（心の余裕の減り方）で調整する。
- `dist/` と `docs/content.md` は直接編集しない。
