/**
 * 校正結果を自己完結 HTML（差分表示・採用トグル・修正版生成）にする
 *
 * サーバーやビルドは不要で、生成した単一 HTML をブラウザで開くだけで動く。
 * 各指摘の quote を原文から検索して位置を特定し、採用した指摘だけを適用した
 * 修正版テキストをブラウザ側で組み立てる。差分をクリックすると指摘と提案の詳細を表示する。
 */
import type { Finding, Perspective } from "../shared/types.ts";

/** 観点コードの日本語ラベル */
export const PERSPECTIVE_LABEL: Record<Perspective, string> = {
  typo: "誤字脱字",
  syntax: "構文の乱れ",
  subjectivity: "過剰な主観",
  redundancy: "冗長な情報",
  duplication: "重複した情報",
  unsourced: "出典なき断定",
  insider: "過度な内輪ノリ",
};

export type LocateStatus = "ok" | "ambiguous" | "notfound";

export type LocatedFinding = {
  finding: Finding;
  start: number;
  end: number;
  status: LocateStatus;
};

/** 各指摘の quote を原文から探して文字オフセットを特定する */
export function locateFindings(
  text: string,
  findings: Finding[],
): LocatedFinding[] {
  return findings.map((finding) => {
    const { quote } = finding;
    const first = quote ? text.indexOf(quote) : -1;
    if (first === -1) {
      return { finding, start: -1, end: -1, status: "notfound" as const };
    }
    const second = text.indexOf(quote, first + 1);
    const status: LocateStatus = second === -1 ? "ok" : "ambiguous";
    return { finding, start: first, end: first + quote.length, status };
  });
}

/** 既定で採用扱いにする観点（明確な誤りのみオン） */
const DEFAULT_ACCEPT: ReadonlySet<Perspective> = new Set(["typo", "syntax"]);

/** 文字列を HTML テキストとして安全化する */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** 値を script 埋め込み用に安全化する（</script> 対策で < をエスケープ） */
function toJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

const STYLE = `
:root { color-scheme: light dark; }
* { box-sizing: border-box; }
body { margin: 0; font: 15px/1.8 system-ui, "Hiragino Kaku Gothic ProN", "Noto Sans JP", sans-serif; color: #1f2328; background: #fff; }
header { padding: 16px 24px; border-bottom: 1px solid #d0d7de; }
h1 { font-size: 18px; margin: 0; }
h2 { font-size: 15px; margin: 0 0 8px; }
.meta { color: #656d76; font-size: 13px; margin: 4px 0 0; }
.panel { padding: 16px 24px; border-bottom: 1px solid #d0d7de; }
.panel-head { display: flex; align-items: center; justify-content: space-between; }
.hint { color: #656d76; font-size: 12px; margin: 0 0 8px; }
.actions button { font-size: 13px; padding: 4px 12px; margin-left: 8px; cursor: pointer; border: 1px solid #d0d7de; border-radius: 6px; background: #f6f8fa; }
#output { width: 100%; height: 220px; font-family: ui-monospace, monospace; font-size: 13px; white-space: pre; padding: 8px; }
#article { white-space: pre-wrap; word-break: break-word; border: 1px solid #d0d7de; border-radius: 6px; padding: 12px; background: #f6f8fa; }
.diff { border-radius: 3px; cursor: pointer; }
.diff input { vertical-align: middle; margin: 0 2px; cursor: pointer; }
.diff .tag { font-size: 10px; color: #fff; background: #8250df; border-radius: 3px; padding: 0 4px; margin-right: 2px; vertical-align: middle; }
.diff del { text-decoration: none; border-bottom: 1px dashed #8250df; }
.diff ins { display: none; background: #dafbe1; color: #116329; text-decoration: none; border-radius: 3px; padding: 0 2px; }
.diff.on del { background: #ffebe9; color: #82071e; text-decoration: line-through; border-bottom: none; }
.diff.on ins { display: inline; }
.popover { position: absolute; z-index: 10; width: 360px; max-width: calc(100vw - 24px); background: #fff; border: 1px solid #d0d7de; border-radius: 8px; box-shadow: 0 8px 24px rgba(0,0,0,.15); padding: 12px 14px; font-size: 13px; line-height: 1.7; }
.popover[hidden] { display: none; }
.popover .ph { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 6px; }
.popover .pclose { cursor: pointer; border: none; background: none; font-size: 16px; color: #656d76; padding: 0 4px; }
.popover .row { margin: 6px 0; }
.popover .k { color: #656d76; font-size: 11px; display: block; }
.popover del { background: #ffebe9; color: #82071e; }
.popover ins { background: #dafbe1; color: #116329; text-decoration: none; margin-left: 4px; }
.extra-item { border: 1px solid #d0d7de; border-radius: 6px; padding: 10px; margin-bottom: 8px; }
.extra-head { font-size: 12px; color: #9a6700; margin-bottom: 4px; }
.extra-item del { background: #ffebe9; color: #82071e; }
.extra-item ins { background: #dafbe1; color: #116329; text-decoration: none; margin-left: 4px; }
.cmt { color: #656d76; font-size: 13px; margin-top: 4px; }
@media (prefers-color-scheme: dark) {
  body { background: #0d1117; color: #e6edf3; }
  header, .panel { border-color: #30363d; }
  #article, .actions button { background: #161b22; border-color: #30363d; color: #e6edf3; }
  .popover { background: #161b22; border-color: #30363d; }
  .diff.on del, .extra-item del, .popover del { background: #3c1618; color: #ff9492; }
  .diff ins, .extra-item ins, .popover ins { background: #12261e; color: #7ee787; }
  .extra-item { border-color: #30363d; }
  .meta, .hint, .cmt, .popover .k, .popover .pclose { color: #8b949e; }
}
`.trim();

const SCRIPT = `
(function () {
  var article = document.getElementById("article");
  var extra = document.getElementById("extra");
  var output = document.getElementById("output");

  // status ok を start 昇順に並べ、範囲が重複するものは適用不可へ回す
  var ok = FINDINGS.filter(function (f) { return f.status === "ok"; })
    .sort(function (a, b) { return a.start - b.start; });
  var applyable = [];
  var lastEnd = 0;
  ok.forEach(function (f) {
    if (f.start >= lastEnd) { applyable.push(f); lastEnd = f.end; }
    else { f.status = "overlap"; }
  });

  // 指摘と提案の詳細を出すポップオーバー（単一要素を使い回す）
  var pop = document.createElement("div");
  pop.className = "popover";
  pop.hidden = true;
  document.body.appendChild(pop);
  var popFor = null;

  function row(key, valueNode) {
    var r = document.createElement("div");
    r.className = "row";
    var k = document.createElement("span");
    k.className = "k";
    k.textContent = key;
    r.appendChild(k);
    r.appendChild(valueNode);
    return r;
  }

  function openPopover(f, anchor) {
    popFor = f;
    pop.innerHTML = "";

    var head = document.createElement("div");
    head.className = "ph";
    var title = document.createElement("strong");
    title.textContent = f.label + " ・ 重要度: " + f.severity;
    var close = document.createElement("button");
    close.className = "pclose";
    close.type = "button";
    close.textContent = "✕";
    close.addEventListener("click", closePopover);
    head.appendChild(title);
    head.appendChild(close);

    var cmt = document.createElement("div");
    cmt.textContent = f.comment;

    var prop = document.createElement("div");
    var del = document.createElement("del");
    del.textContent = f.quote;
    var ins = document.createElement("ins");
    ins.textContent = f.replacement;
    prop.appendChild(del);
    prop.appendChild(ins);

    var acc = document.createElement("label");
    acc.className = "row";
    var box = document.createElement("input");
    box.type = "checkbox";
    box.checked = f.accept;
    box.addEventListener("change", function () { setAccept(f, box.checked); });
    acc.appendChild(box);
    acc.appendChild(document.createTextNode(" この提案を採用する"));
    pop._accBox = box;

    pop.appendChild(head);
    pop.appendChild(row("指摘", cmt));
    pop.appendChild(row("提案", prop));
    pop.appendChild(acc);

    var r = anchor.getBoundingClientRect();
    pop.hidden = false;
    var maxLeft = document.documentElement.clientWidth - pop.offsetWidth - 12;
    pop.style.top = window.scrollY + r.bottom + 6 + "px";
    pop.style.left = window.scrollX + Math.max(8, Math.min(r.left, maxLeft)) + "px";
  }

  function closePopover() {
    pop.hidden = true;
    popFor = null;
  }

  function setAccept(f, value) {
    f.accept = value;
    if (f._wrap) f._wrap.classList.toggle("on", value);
    if (f._cb) f._cb.checked = value;
    if (popFor === f && pop._accBox) pop._accBox.checked = value;
    recompute();
  }

  // 原文に差分ウィジェットを差し込んで描画する
  var cursor = 0;
  applyable.forEach(function (f) {
    if (f.start > cursor) {
      article.appendChild(document.createTextNode(ORIGINAL.slice(cursor, f.start)));
    }
    article.appendChild(makeWidget(f));
    cursor = f.end;
  });
  if (cursor < ORIGINAL.length) {
    article.appendChild(document.createTextNode(ORIGINAL.slice(cursor)));
  }

  function makeWidget(f) {
    var wrap = document.createElement("span");
    wrap.className = "diff" + (f.accept ? " on" : "");
    var cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = f.accept;
    cb.addEventListener("click", function (e) { e.stopPropagation(); });
    cb.addEventListener("change", function () { setAccept(f, cb.checked); });
    var tag = document.createElement("span");
    tag.className = "tag";
    tag.textContent = f.label;
    var del = document.createElement("del");
    del.textContent = f.quote;
    var ins = document.createElement("ins");
    ins.textContent = f.replacement;
    wrap.appendChild(cb);
    wrap.appendChild(tag);
    wrap.appendChild(del);
    wrap.appendChild(ins);
    wrap.addEventListener("click", function () { openPopover(f, wrap); });
    f._wrap = wrap;
    f._cb = cb;
    return wrap;
  }

  // 自動適用できない指摘（複数一致・範囲重複・未検出）を一覧表示する
  var extras = FINDINGS.filter(function (f) { return f.status !== "ok"; });
  if (extras.length) {
    document.getElementById("extra-panel").hidden = false;
    extras.forEach(function (f) {
      var reason =
        f.status === "noop" ? "提案なし（指摘のみ・現状維持の評価）" :
        f.status === "ambiguous" ? "同じ文字列が複数箇所にあり自動適用できません" :
        f.status === "overlap" ? "他の指摘と範囲が重複するため自動適用できません" :
        "原文中に該当箇所が見つかりませんでした";
      var item = document.createElement("div");
      item.className = "extra-item";
      var head = document.createElement("div");
      head.className = "extra-head";
      head.textContent = "[" + f.label + " / " + f.severity + "] " + reason;
      var body = document.createElement("div");
      if (f.status === "noop") {
        // 提案なしは偽の差分を出さず引用のみ見せる
        body.textContent = "引用: " + f.quote;
      } else {
        var del = document.createElement("del"); del.textContent = f.quote;
        var ins = document.createElement("ins"); ins.textContent = f.replacement;
        body.appendChild(del); body.appendChild(ins);
      }
      var cmt = document.createElement("div");
      cmt.className = "cmt";
      cmt.textContent = f.comment;
      item.appendChild(head); item.appendChild(body); item.appendChild(cmt);
      extra.appendChild(item);
    });
  }

  // 外側クリックや Esc でポップオーバーを閉じる
  document.addEventListener("click", function (e) {
    if (pop.hidden || pop.contains(e.target)) return;
    var el = e.target;
    while (el) {
      if (el.classList && el.classList.contains("diff")) return;
      el = el.parentNode;
    }
    closePopover();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closePopover();
  });

  function recompute() {
    var accepted = applyable.filter(function (f) { return f.accept; })
      .sort(function (a, b) { return b.start - a.start; });
    var out = ORIGINAL;
    accepted.forEach(function (f) {
      out = out.slice(0, f.start) + f.replacement + out.slice(f.end);
    });
    output.value = out;
  }

  document.getElementById("copy").addEventListener("click", function () {
    output.select();
    if (navigator.clipboard) navigator.clipboard.writeText(output.value);
  });
  document.getElementById("download").addEventListener("click", function () {
    var blob = new Blob([output.value], { type: "text/plain;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "corrected.txt";
    a.click();
    URL.revokeObjectURL(a.href);
  });

  recompute();
})();
`.trim();

/** 校正結果をレビューするための自己完結 HTML を組み立てる */
export function buildReviewHtml(
  inputPath: string,
  text: string,
  located: LocatedFinding[],
): string {
  const payload = located.map((item, index) => ({
    id: index,
    perspective: item.finding.perspective,
    label: PERSPECTIVE_LABEL[item.finding.perspective],
    severity: item.finding.severity,
    quote: item.finding.quote,
    replacement: item.finding.replacement,
    comment: item.finding.comment,
    start: item.start,
    end: item.end,
    // 置換前後が同じものは noop（提案なし・指摘のみ）として扱う
    status:
      item.finding.replacement === item.finding.quote ? "noop" : item.status,
    accept:
      item.status === "ok" &&
      item.finding.replacement !== item.finding.quote &&
      DEFAULT_ACCEPT.has(item.finding.perspective),
  }));

  return `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>校正レビュー — ${escapeHtml(inputPath)}</title>
    <style>
${STYLE}
    </style>
  </head>
  <body>
    <header>
      <h1>校正レビュー</h1>
      <p class="meta">${escapeHtml(inputPath)} / ${text.length.toLocaleString()} 文字 / 指摘 ${located.length} 件</p>
    </header>

    <section class="panel">
      <div class="panel-head">
        <h2>修正版テキスト</h2>
        <div class="actions">
          <button id="copy" type="button">コピー</button>
          <button id="download" type="button">ダウンロード</button>
        </div>
      </div>
      <textarea id="output" readonly></textarea>
    </section>

    <section class="panel">
      <h2>原文と差分</h2>
      <p class="hint">
        差分をクリックすると指摘と提案の詳細が出ます。チェックを入れた指摘だけが修正版に反映されます（誤字脱字・構文は既定でオン）。
      </p>
      <div id="article"></div>
    </section>

    <section class="panel" id="extra-panel" hidden>
      <h2>自動適用しない指摘（個別に確認）</h2>
      <div id="extra"></div>
    </section>

    <script>
      const ORIGINAL = ${toJson(text)};
      const FINDINGS = ${toJson(payload)};
${SCRIPT}
    </script>
  </body>
</html>
`;
}
