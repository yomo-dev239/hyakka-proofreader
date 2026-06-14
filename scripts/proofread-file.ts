/**
 * テキストファイルを校正する検証用 CLI
 *
 * 実行: npx tsx scripts/proofread-file.ts <テキストファイル> [出力先]
 * 結果はコンソールに表示しつつ、<入力>.result.txt（または指定した出力先）にも保存する。
 */
import { readFileSync, writeFileSync } from "node:fs";
import { config } from "dotenv";
import { PERSPECTIVES } from "../shared/types.ts";
import type { Finding, Perspective } from "../shared/types.ts";
import { proofread } from "../server/proofread.ts";

config();

const LABEL: Record<Perspective, string> = {
  typo: "誤字脱字",
  syntax: "構文の乱れ",
  subjectivity: "過剰な主観",
  redundancy: "冗長な情報",
  duplication: "重複した情報",
  unsourced: "出典なき断定",
  insider: "過度な内輪ノリ",
};

const inputPath = process.argv[2];
if (!inputPath) {
  console.error(
    "使い方: npx tsx scripts/proofread-file.ts <テキストファイル> [出力先]",
  );
  process.exit(1);
}
const outputPath =
  process.argv[3] ?? `${inputPath.replace(/\.[^/.]+$/, "")}.result.txt`;

const text = readFileSync(inputPath, "utf8");

/** 観点別グループで整形した結果テキストを組み立てる */
function formatReport(findings: Finding[]): string {
  const lines: string[] = [];
  lines.push(`入力: ${inputPath}（${text.length.toLocaleString()} 文字）`);
  lines.push(`指摘: 合計 ${findings.length} 件`);

  for (const perspective of PERSPECTIVES) {
    const items = findings.filter((f) => f.perspective === perspective);
    if (items.length === 0) continue;

    lines.push("");
    lines.push(`■ ${LABEL[perspective]}（${items.length} 件）`);
    for (const f of items) {
      lines.push(`  ・[重要度:${f.severity}] 「${f.quote}」`);
      lines.push(`     指摘: ${f.comment}`);
      lines.push(`     提案: ${f.suggestion}`);
    }
  }
  return lines.join("\n") + "\n";
}

const findings = await proofread(text);
const report = formatReport(findings);

console.log("\n" + report);
writeFileSync(outputPath, report, "utf8");
console.log(`結果を保存しました: ${outputPath}`);
