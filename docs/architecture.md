# アーキテクチャ

## 1. 全体構成とデータフロー

```
[CLI] scripts/proofread-file.ts <記事.txt>
   │  ① ファイルを読み込む
   ▼
[校正ロジック] server/proofread.ts
   │  ② 長文はチャンクに分割（約 8,000 字・最大 3 並列）
   │  ③ 各チャンクを tool use（構造化出力）で Anthropic API に投げる
   ▼
[Anthropic API]  ← API キーは .env から読む（リモート呼び出し）
   │  ④ Finding[] を構造化して返す
   ▼
[校正ロジック]
   │  ⑤ 各チャンクの結果をマージ（重複除去）
   ▼
[CLI]
   ⑥ 各指摘の quote を原文から検索して位置を特定
   ⑦ 観点別テキスト（<記事>.result.txt）と、差分レビュー用 HTML（<記事>.review.html）を出力
```

レビュー HTML はサーバー不要の単一ファイルで、ブラウザで開くと GitHub 風の差分表示・指摘ごとの採用トグル・採用分だけを適用した修正版テキストの生成（コピー / ダウンロード）ができる。

- 入力はピクシブ百科事典の記法を含みうるため、記法一覧（`server/pixivNotation.ts`）をプロンプトに渡し、記法そのものは指摘しない。
- 校正ロジック（`server/`）は HTTP に依存しない純粋な関数。将来 UI やサーバーを足す場合もこの中核を再利用できる。

## 2. 校正の仕様

- **モデル**: Claude Sonnet 4.6（`claude-sonnet-4-6`）。env `ANTHROPIC_MODEL` で切替可能。
- **構造化出力**: tool use で `Finding[]` を強制的に取得する。
- **観点**: 3 観点（誤字脱字・構文の乱れ・重複した情報）を 1 リクエストで一括取得する。
- **トーン方針**: 堅苦しさへ矯正しない（口語・ユーモア・読みやすさを尊重）。誤字脱字は修正案を出す。それ以外は削除を迫らず指摘＋修正案にとどめ、採用は書き手が判断する。
- **入力**: プレーンテキスト。最大 20 万文字。空入力は弾く。
- **長文の分割**: 約 8,000 文字ごとに分割し、最大 3 並列で校正してマージする。env `CHUNK_CHARS`（分割サイズ）/ `PROOFREAD_CONCURRENCY`（並列数・既定 3）で調整可能。
- **指摘の単位**: `Finding` は `quote`（引用）・`comment`（指摘）・`replacement`（置換後テキスト）・`severity` を持つ。`replacement` は全観点で出させ、採用すれば `quote` をそのまま置き換えられる完全な文字列とする。
- **出力**: `<入力>.result.txt`（観点別テキスト）と `<入力>.review.html`（差分レビュー）の 2 種。
- **位置特定**: 文字オフセットは LLM に出させず、CLI 側で `quote` を原文から検索して特定する（複数一致・未検出は自動適用の対象外として明示）。
- **修正版の適用**: レビュー HTML 上で採用した指摘だけを原文に適用する。既定では誤字脱字・構文をオン、それ以外はオフ。
- **セキュリティ**: API キーは `.env`。入力テキストはログに残さない。

## 3. ディレクトリ構成

```
hyakka-proofreader/
├── articles/              … 校正対象の原稿を置く（*.txt は gitignore）
│   └── .gitkeep
├── docs/
│   └── architecture.md    … 本書
├── scripts/
│   ├── proofread-file.ts  … .txt を校正する CLI
│   ├── review.ts          … 位置特定とレビュー HTML 生成
│   └── review.test.ts
├── server/                … 校正ロジック（HTTP には依存しない）
│   ├── proofread.ts       … 分割・並列・マージ・Anthropic 呼び出し
│   ├── chunk.ts           … 長文のチャンク分割
│   ├── chunk.test.ts
│   ├── findings.ts        … tool 定義（JSON Schema）＋ zod 検証
│   ├── findings.test.ts
│   ├── prompt.ts          … システムプロンプト
│   └── pixivNotation.ts   … ピクシブ百科記法の一覧
├── shared/
│   └── types.ts           … 校正ロジックと CLI で共有する型（Finding など）
├── .env.example
├── eslint.config.js
├── package.json
├── tsconfig.json          … プロジェクト参照（node / server）
├── tsconfig.node.json     … 設定ファイル用（vitest.config.ts）
├── tsconfig.server.json   … server / shared / scripts 用
└── vitest.config.ts
```
