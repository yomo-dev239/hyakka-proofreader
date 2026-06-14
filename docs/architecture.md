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
   ⑥ 観点別に整形してコンソール出力＋ <記事>.result.txt に保存
```

- 入力はピクシブ百科事典の記法を含みうるため、記法一覧（`server/pixivNotation.ts`）をプロンプトに渡し、記法そのものは指摘しない。
- 校正ロジック（`server/`）は HTTP に依存しない純粋な関数。将来 UI やサーバーを足す場合もこの中核を再利用できる。

## 2. 校正の仕様

- **モデル**: Claude Sonnet 4.6（`claude-sonnet-4-6`）。env `ANTHROPIC_MODEL` で切替可能。
- **構造化出力**: tool use で `Finding[]` を強制的に取得する。
- **観点**: 7 観点を 1 リクエストで一括取得する。
- **トーン方針**: 堅苦しさへ矯正しない（口語・ユーモア・読みやすさを尊重）。①誤字脱字は修正案を出す。②〜④（過剰な主観・冗長・重複・過度な内輪ノリ）は削除を迫らず指摘＋修正案にとどめ、採用は書き手が判断する。
- **入力**: プレーンテキスト。最大 20 万文字。空入力は弾く。
- **長文の分割**: 約 8,000 文字ごとに分割し、最大 3 並列で校正してマージする。env `CHUNK_CHARS`（分割サイズ）/ `PROOFREAD_CONCURRENCY`（並列数・既定 3）で調整可能。
- **出力**: 観点別にまとめてコンソール出力し、`<入力>.result.txt` に保存する。
- **位置特定**: `Finding` は `quote` 文字列のみ持つ（文字オフセットは持たない）。
- **セキュリティ**: API キーは `.env`。入力テキストはログに残さない。

## 3. ディレクトリ構成

```
hyakka-proofreader/
├── articles/              … 校正対象の原稿を置く（*.txt は gitignore）
│   └── .gitkeep
├── docs/
│   └── architecture.md    … 本書
├── scripts/
│   └── proofread-file.ts  … .txt を校正する CLI
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
