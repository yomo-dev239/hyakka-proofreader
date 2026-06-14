import { z } from "zod";
import type Anthropic from "@anthropic-ai/sdk";
import { PERSPECTIVES, SEVERITIES } from "../shared/types.ts";
import type { Finding } from "../shared/types.ts";

/** LLM 出力（tool_use の input）を検証するスキーマ */
export const findingSchema = z.object({
  perspective: z.enum(PERSPECTIVES),
  quote: z.string().min(1),
  comment: z.string().min(1),
  suggestion: z.string(),
  severity: z.enum(SEVERITIES),
});

export const findingsSchema = z.object({
  findings: z.array(findingSchema),
});

/** tool_use.input（unknown）を検証して Finding[] にする（不正なら例外） */
export function parseFindings(input: unknown): Finding[] {
  let normalized = input;
  // LLM がまれに findings を「配列の JSON 文字列」で返す場合にパースする
  if (
    normalized &&
    typeof normalized === "object" &&
    "findings" in normalized &&
    typeof (normalized as { findings: unknown }).findings === "string"
  ) {
    try {
      normalized = {
        ...(normalized as object),
        findings: JSON.parse((normalized as { findings: string }).findings),
      };
    } catch {
      // パースできなければそのまま検証に渡す（下で例外になる）
    }
  }
  return findingsSchema.parse(normalized).findings;
}

/** Anthropic に構造化出力を強制させるためのツール定義 */
export const FINDINGS_TOOL: Anthropic.Tool = {
  name: "report_findings",
  description:
    "校正で見つかった指摘の一覧を報告する。問題がなければ findings は空配列にする。",
  input_schema: {
    type: "object",
    properties: {
      findings: {
        type: "array",
        items: {
          type: "object",
          properties: {
            perspective: {
              type: "string",
              enum: [...PERSPECTIVES],
              description: "校正の観点",
            },
            quote: {
              type: "string",
              description: "原文から一字一句そのまま抜き出した該当箇所",
            },
            comment: { type: "string", description: "なぜ問題かの説明" },
            suggestion: { type: "string", description: "修正案" },
            severity: { type: "string", enum: [...SEVERITIES] },
          },
          required: [
            "perspective",
            "quote",
            "comment",
            "suggestion",
            "severity",
          ],
          additionalProperties: false,
        },
      },
    },
    required: ["findings"],
    additionalProperties: false,
  },
};
