import { describe, it, expect } from "vitest";
import { splitIntoChunks } from "./chunk.ts";

describe("splitIntoChunks", () => {
  it("上限以下なら 1 チャンクのまま返す", () => {
    expect(splitIntoChunks("短いテキスト", 100)).toEqual(["短いテキスト"]);
  });

  it("複数行を上限内に分割し、改行で結合すると原文に戻る", () => {
    const text = ["あいうえお", "かきくけこ", "さしすせそ", "たちつてと"].join(
      "\n",
    );
    const chunks = splitIntoChunks(text, 12);
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(12);
    expect(chunks.join("\n")).toBe(text);
  });

  it("長い 1 行は文末で分割される", () => {
    const line = "これは長い文です。".repeat(5);
    const chunks = splitIntoChunks(line, 10);
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(10);
  });

  it("文末が無い超長文はハードカットされる", () => {
    const chunks = splitIntoChunks("あ".repeat(25), 10);
    expect(chunks).toEqual(["あ".repeat(10), "あ".repeat(10), "あ".repeat(5)]);
  });
});
