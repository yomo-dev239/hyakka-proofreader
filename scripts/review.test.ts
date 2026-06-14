import { describe, it, expect } from "vitest";
import type { Finding } from "../shared/types.ts";
import { locateFindings, buildReviewHtml } from "./review.ts";

function finding(quote: string, replacement: string): Finding {
  return {
    perspective: "typo",
    quote,
    comment: "テスト",
    replacement,
    severity: "high",
  };
}

describe("locateFindings", () => {
  const text = "今日はいい天気。明日も天気。";

  it("一意に見つかる quote は ok で位置を返す", () => {
    const [r] = locateFindings(text, [finding("いい天気", "良い天気")]);
    expect(r?.status).toBe("ok");
    expect(text.slice(r!.start, r!.end)).toBe("いい天気");
  });

  it("複数箇所に現れる quote は ambiguous", () => {
    const [r] = locateFindings(text, [finding("天気", "天候")]);
    expect(r?.status).toBe("ambiguous");
  });

  it("見つからない quote は notfound", () => {
    const [r] = locateFindings(text, [finding("存在しない", "x")]);
    expect(r?.status).toBe("notfound");
    expect(r?.start).toBe(-1);
  });
});

describe("buildReviewHtml", () => {
  it("原文と指摘を埋め込んだ HTML を返す", () => {
    const text = "今日はいい天気";
    const located = locateFindings(text, [finding("いい天気", "良い天気")]);
    const html = buildReviewHtml("articles/test.txt", text, located);
    expect(html).toContain("<!doctype html>");
    expect(html).toContain("良い天気");
    expect(html).toContain("ORIGINAL =");
  });

  it("</script> を含む原文を安全にエスケープする", () => {
    const text = "危険な </script> タグ";
    const html = buildReviewHtml("x.txt", text, []);
    expect(html).not.toContain("</script> タグ");
    expect(html).toContain("\\u003c/script>");
  });

  it("置換前後が同じ指摘は noop 扱いになる", () => {
    const text = "ジャンルに拘らずプレイする";
    const located = locateFindings(text, [finding("拘らず", "拘らず")]);
    const html = buildReviewHtml("x.txt", text, located);
    expect(html).toContain('"status":"noop"');
    expect(html).toContain('"accept":false');
  });
});
