/**
 * 校正ロジック（server/）と CLI（scripts/）で共有する型定義
 *
 * このツールの中核は「テキスト → 観点別の指摘リスト」という変換なので、
 * 永続エンティティは持たず、この Finding 群だけを扱う。
 */

/** 校正の観点 */
export const PERSPECTIVES = [
  "typo", // 誤字脱字・漢字変換ミス
  "syntax", // 構文の乱れ
  "duplication", // 重複した情報
] as const;

export type Perspective = (typeof PERSPECTIVES)[number];

/** 指摘の重要度 */
export const SEVERITIES = ["high", "medium", "low"] as const;

export type Severity = (typeof SEVERITIES)[number];

/** LLM が返す 1 件の指摘（引用・指摘・置換案を 1 単位とする） */
export type Finding = {
  perspective: Perspective;
  /** 原文から検索して位置を特定するための引用（一字一句そのまま） */
  quote: string;
  /** なぜ問題かの説明 */
  comment: string;
  /** quote をそのまま置き換える修正後テキスト（採用すれば原文に適用できる） */
  replacement: string;
  severity: Severity;
};

/** 入力テキストの文字数上限（超える長文は分割して校正する） */
export const MAX_TEXT_LENGTH = 200000;
