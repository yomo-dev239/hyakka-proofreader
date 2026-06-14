/**
 * 長文を校正用のチャンクに分割する
 *
 * 行（改行）を最小単位として貪欲に詰め、文の途中では切らない。
 * 1 行が長すぎる場合のみ、文末（。！？）→ ハードカットの順でさらに分割する。
 */

/** 1 チャンクの目安文字数（env CHUNK_CHARS で上書き可能） */
export const DEFAULT_CHUNK_CHARS = 8000;

function splitLongLine(line: string, maxChars: number): string[] {
  const sentences = (line.match(/[^。！？]*[。！？]?/g) ?? [line]).filter(
    (s) => s.length > 0,
  );
  const out: string[] = [];
  let cur = "";
  for (const s of sentences) {
    if (s.length > maxChars) {
      if (cur !== "") {
        out.push(cur);
        cur = "";
      }
      for (let i = 0; i < s.length; i += maxChars) {
        out.push(s.slice(i, i + maxChars));
      }
      continue;
    }
    const candidate = cur + s;
    if (candidate.length > maxChars && cur !== "") {
      out.push(cur);
      cur = s;
    } else {
      cur = candidate;
    }
  }
  if (cur !== "") out.push(cur);
  return out;
}

export function splitIntoChunks(
  text: string,
  maxChars = DEFAULT_CHUNK_CHARS,
): string[] {
  if (text.length <= maxChars) return [text];

  // 改行単位に分解して長すぎる行はさらに分割する
  const units: string[] = [];
  for (const line of text.split("\n")) {
    if (line.length <= maxChars) {
      units.push(line);
    } else {
      units.push(...splitLongLine(line, maxChars));
    }
  }

  // 行を貪欲に詰めてチャンク化（改行で再結合）
  const chunks: string[] = [];
  let cur = "";
  for (const u of units) {
    const candidate = cur === "" ? u : `${cur}\n${u}`;
    if (candidate.length > maxChars && cur !== "") {
      chunks.push(cur);
      cur = u;
    } else {
      cur = candidate;
    }
  }
  if (cur !== "") chunks.push(cur);
  return chunks;
}
