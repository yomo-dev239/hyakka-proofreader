# 百科校正ツール（hyakka-proofreader）

ニコニコ大百科・ピクシブ百科辞典のような「ネット記事系」百科サイト向けの校正ツール。
Wikipedia的な堅苦しさではなく、わかりやすさ・読みやすさ・ユーモアを尊重したうえで、
気になる箇所を **観点別に「引用 → 指摘 → 提案」** として返す。

## 解決したい課題

1. 誤字脱字・漢字変換ミス
2. Wikipediaのような堅苦しさ
3. 主観が混じりすぎる文章の添削
4. 情報の重複、冗長すぎる情報の添削

現状は **CLI 専用**（ブラウザ UI は未実装）。

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

4. 結果が観点別（誤字脱字・構文の乱れ・過剰な主観 など）にコンソール表示され、
   あわせて `articles/example.result.txt` に保存される。

## スクリプト

| コマンド            | 内容                             |
| ------------------- | -------------------------------- |
| `npm run proofread` | `.txt` を校正（`-- <ファイル>`） |
| `npm run typecheck` | 型チェック                       |
| `npm run lint`      | ESLint                           |
| `npm run format`    | Prettier で整形                  |
| `npm test`          | テスト実行（Vitest）             |
