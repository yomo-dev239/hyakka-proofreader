/**
 * テキストファイルを校正する CLI
 *
 * 実行: npx tsx scripts/proofread-file.ts <テキストファイル>
 * 観点別の結果を <入力>.result.txt に、差分レビュー用の HTML を <入力>.review.html に保存する。
 */
import { readFileSync, writeFileSync } from "node:fs";
import { config } from "dotenv";
import { PERSPECTIVES } from "../shared/types.ts";
import type { Finding } from "../shared/types.ts";
import { proofread } from "../server/proofread.ts";
import {
  PERSPECTIVE_LABEL,
  locateFindings,
  buildReviewHtml,
} from "./review.ts";

config();

const inputPath = process.argv[2];
if (!inputPath) {
  console.error("使い方: npx tsx scripts/proofread-file.ts <テキストファイル>");
  process.exit(1);
}

const base = inputPath.replace(/\.[^/.]+$/, "");
const txtPath = `${base}.result.txt`;
const htmlPath = `${base}.review.html`;

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
    lines.push(`■ ${PERSPECTIVE_LABEL[perspective]}（${items.length} 件）`);
    for (const f of items) {
      lines.push(`  ・[重要度:${f.severity}] 「${f.quote}」`);
      lines.push(`     指摘: ${f.comment}`);
      lines.push(`     置換: 「${f.quote}」→「${f.replacement}」`);
    }
  }
  return lines.join("\n") + "\n";
}

const findings = await proofread(text);

writeFileSync(txtPath, formatReport(findings), "utf8");
writeFileSync(
  htmlPath,
  buildReviewHtml(inputPath, text, locateFindings(text, findings)),
  "utf8",
);

console.log(`指摘 ${findings.length} 件`);
console.log(`テキスト結果: ${txtPath}`);
console.log(`差分レビュー（ブラウザで開く）: ${htmlPath}`);
