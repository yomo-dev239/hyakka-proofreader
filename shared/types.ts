/**
 * 校正ロジック（server/）と CLI（scripts/）で共有する型定義
 *
 * このツールの中核は「テキスト → 観点別の指摘リスト」という変換なので、
 * 永続エンティティは持たず、この Finding 群だけを扱う。
 */

/** 校正の観点（課題①〜④に対応） */
export const PERSPECTIVES = [
  "typo", // 誤字脱字・漢字変換ミス（課題①）
  "syntax", // 構文の乱れ
  "subjectivity", // 過剰な主観（課題③）
  "redundancy", // 冗長すぎる情報（課題④）
  "duplication", // 重複した情報（課題④）
  "unsourced", // 出典なき断定
  "insider", // 過度な内輪ノリ（課題②の裏返しで読みやすさは保つ）
] as const;

export type Perspective = (typeof PERSPECTIVES)[number];

/** 指摘の重要度 */
export const SEVERITIES = ["high", "medium", "low"] as const;

export type Severity = (typeof SEVERITIES)[number];

/** LLM が返す 1 件の指摘（「引用 → 指摘 → 提案」を 1 単位とする） */
export type Finding = {
  perspective: Perspective;
  /** フロントで原文から検索して強調するための引用（原文の一部をそのまま） */
  quote: string;
  /** なぜ問題かの説明 */
  comment: string;
  /** 修正案（誤字脱字以外は「消す」のではなく提案にとどめる） */
  suggestion: string;
  severity: Severity;
};

/** 入力テキストの文字数上限（超える長文は分割して校正する） */
export const MAX_TEXT_LENGTH = 200000;
