# 百科校正ツール（hyakka-proofreader）

ニコニコ大百科・ピクシブ百科辞典のような「ネット記事系」百科サイト向けの校正ツール。
Wikipedia的な堅苦しさではなく、わかりやすさ・読みやすさ・ユーモアを尊重したうえで、
気になる箇所を **観点別に「引用 → 指摘 → 提案」** として返す。

## 解決したい課題

1. 誤字脱字・漢字変換ミス
2. Wikipediaのような堅苦しさ
3. 主観が混じりすぎる文章の添削
4. 情報の重複、冗長すぎる情報の添削

## 技術スタック

| カテゴリ       | 技術                                             |
| -------------- | ------------------------------------------------ |
| フレームワーク | [React](https://ja.react.dev/) (Vite)            |
| 言語           | [TypeScript](https://www.typescriptlang.org/ja/) |
| スタイル       | [Tailwind CSS](https://tailwindcss.com/)         |
| リンター       | [ESLint](https://eslint.org/)                    |
| フォーマッタ   | [Prettier](https://prettier.io/)                 |

## セットアップ

```sh
npm install
npm run dev
```

## スクリプト

| コマンド            | 内容                    |
| ------------------- | ----------------------- |
| `npm run dev`       | 開発サーバー起動        |
| `npm run build`     | 型チェック + 本番ビルド |
| `npm run typecheck` | 型チェックのみ          |
| `npm run lint`      | ESLint                  |
| `npm run format`    | Prettier で整形         |
