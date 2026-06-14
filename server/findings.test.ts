import { describe, it, expect } from "vitest";
import { parseFindings, FINDINGS_TOOL } from "./findings.ts";

const validFinding = {
  perspective: "typo",
  quote: "誤字れす",
  comment: "「れす」は「です」の誤変換と思われます",
  replacement: "です",
  severity: "high",
};

describe("parseFindings", () => {
  it("正常な findings を検証して返す", () => {
    const result = parseFindings({ findings: [validFinding] });
    expect(result).toHaveLength(1);
    expect(result[0]?.perspective).toBe("typo");
    expect(result[0]?.replacement).toBe("です");
  });

  it("空配列を許容する", () => {
    expect(parseFindings({ findings: [] })).toEqual([]);
  });

  it("未知の観点を弾く", () => {
    expect(() =>
      parseFindings({
        findings: [{ ...validFinding, perspective: "unknown" }],
      }),
    ).toThrow();
  });

  it("必須フィールド欠落を弾く", () => {
    expect(() =>
      parseFindings({ findings: [{ perspective: "typo" }] }),
    ).toThrow();
  });

  it("findings 自体が無いと弾く", () => {
    expect(() => parseFindings({})).toThrow();
  });
});

describe("FINDINGS_TOOL", () => {
  it("ツール名が report_findings である", () => {
    expect(FINDINGS_TOOL.name).toBe("report_findings");
  });
});
