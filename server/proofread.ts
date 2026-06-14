import Anthropic from "@anthropic-ai/sdk";
import { MAX_TEXT_LENGTH } from "../shared/types.ts";
import type { Finding } from "../shared/types.ts";
import { FINDINGS_TOOL, parseFindings } from "./findings.ts";
import { SYSTEM_PROMPT, buildUserPrompt } from "./prompt.ts";
import { splitIntoChunks } from "./chunk.ts";

/** 既定モデル（env の ANTHROPIC_MODEL で上書き可能） */
const DEFAULT_MODEL = "claude-sonnet-4-6";

/** チャンクの同時実行数（env PROOFREAD_CONCURRENCY で上書き可能） */
const DEFAULT_CONCURRENCY = 3;

/** 1 チャンクを校正して tool use で構造化出力を得る */
async function proofreadChunk(
  client: Anthropic,
  model: string,
  text: string,
): Promise<Finding[]> {
  const message = await client.messages.create({
    model,
    max_tokens: 16000,
    system: SYSTEM_PROMPT,
    tools: [FINDINGS_TOOL],
    tool_choice: { type: "tool", name: FINDINGS_TOOL.name },
    messages: [{ role: "user", content: buildUserPrompt(text) }],
  });

  const toolUse = message.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("構造化出力（tool_use）が得られませんでした");
  }
  return parseFindings(toolUse.input);
}

/** 同時実行数を制限しつつ items を fn にかける簡易プール */
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker(): Promise<void> {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker()),
  );
  return results;
}

/** チャンク境界をまたいで重複した指摘を取り除く */
function dedupeFindings(findings: Finding[]): Finding[] {
  const seen = new Set<string>();
  const out: Finding[] = [];
  for (const f of findings) {
    const key = `${f.perspective}|${f.quote}|${f.replacement}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(f);
  }
  return out;
}

/** テキストを校正して観点別の指摘を返す */
export async function proofread(text: string): Promise<Finding[]> {
  if (text.length > MAX_TEXT_LENGTH) {
    throw new Error(`テキストが長すぎます（${MAX_TEXT_LENGTH} 文字以内）`);
  }

  // APIキーは環境変数 ANTHROPIC_API_KEY から自動で読む
  const client = new Anthropic();
  const model = process.env.ANTHROPIC_MODEL ?? DEFAULT_MODEL;

  const chunks = splitIntoChunks(text);
  if (chunks.length === 1) {
    return proofreadChunk(client, model, chunks[0]);
  }

  const concurrency = Number(
    process.env.PROOFREAD_CONCURRENCY ?? DEFAULT_CONCURRENCY,
  );
  // 1 チャンクが失敗しても全体を止めず警告して空扱いにする
  const perChunk = await mapWithConcurrency(
    chunks,
    concurrency,
    async (chunk, i) => {
      try {
        return await proofreadChunk(client, model, chunk);
      } catch (err) {
        console.warn(
          `チャンク ${i + 1}/${chunks.length} の校正に失敗:`,
          err instanceof Error ? err.message : err,
        );
        return [];
      }
    },
  );
  return dedupeFindings(perChunk.flat());
}
