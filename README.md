# 百科校正ツール（hyakka-proofreader）

ニコニコ大百科・ピクシブ百科辞典のような「ネット記事系」百科サイト向けの校正ツール。
Wikipedia的な堅苦しさではなく、わかりやすさ・読みやすさ・ユーモアを尊重したうえで、
気になる箇所を **観点別に「引用 → 指摘 → 提案」** として返す。

現状は **CLI 専用**（ブラウザ UI は未実装）。

## チェックする観点

- 誤字脱字・漢字変換ミス
- 構文の乱れ（主述のねじれ・読みにくい係り受けなど）
- 重複した情報

Wikipedia 的な堅苦しさへは矯正せず、口語・ユーモアは「味」として尊重する。

## 技術スタック

| カテゴリ       | 技術                                         |
| -------------- | -------------------------------------------- |
| 言語           | TypeScript                                   |
| 実行           | Node.js + tsx（CLI）                         |
| LLM            | Anthropic API（Claude Sonnet 4.6・tool use） |
| リンター       | ESLint                                       |
| フォーマッタ   | Prettier                                     |
| ユニットテスト | Vitest                                       |

## セットアップ

```sh
npm install
```

## 使い方

`articles/` に置いたテキストファイルを校正し、観点別の提案を受け取る。

1. **API キーを設定**（初回のみ）

   ```sh
   cp .env.example .env
   # .env の ANTHROPIC_API_KEY に自分のキーを記入する
   ```

2. **校正したい文章を `articles/` に `.txt` で置く**（例: `articles/example.txt`）
   `articles/*.txt` は Git 管理対象外なので、原稿はコミットされない。

3. **校正を実行する**

   ```sh
   npx tsx scripts/proofread-file.ts articles/example.txt
   # または: npm run proofread -- articles/example.txt
   ```

4. 2 つの結果ファイルが出力される。
   - `articles/example.result.txt` … 観点別の指摘テキスト
   - `articles/example.review.html` … **差分レビュー**（ブラウザで開く）

5. `articles/example.review.html` をブラウザで開き、

   - 原文上で GitHub 風の差分（赤=削除 / 緑=追加）を確認する
   - 採用したい指摘にチェックを入れる（誤字脱字・構文は既定でオン）
   - 「修正版テキスト」をコピー／ダウンロードして、ピクシブ百科の記事に貼り付ける

## スクリプト

| コマンド            | 内容                             |
| ------------------- | -------------------------------- |
| `npm run proofread` | `.txt` を校正（`-- <ファイル>`） |
| `npm run typecheck` | 型チェック                       |
| `npm run lint`      | ESLint                           |
| `npm run format`    | Prettier で整形                  |
| `npm test`          | テスト実行（Vitest）             |
