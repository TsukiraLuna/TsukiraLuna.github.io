#!/usr/bin/env node
/**
 * 规范化 MDX 里的显示公式 `$$...$$`。
 *
 * ## 为什么必须有这个工具
 *
 * remark-math 只把**独占行**的 `$$` 当作显示公式的定界符。行内出现的 `$$` 会
 * 让解析结果高度依赖上下文，产生两类真实踩过的坑：
 *
 * ① 整行单行 `$$X$$`
 *    → 渲染成**行内**公式（居中块变成行内），且与正文同行时布局错乱。
 *
 * ② `$$` 与内容同行、闭合 `$$` 在**续行尾**（最阴的一类）
 *    ```
 *    $$\nabla f=\left(\frac{\partial f}{\partial x_1},\ldots,
 *      \frac{\partial f}{\partial x_n}\right)^{T}.$$
 *    ```
 *    → 单独出现时能编过；但**紧随其后**只要有含 `{` 的行内公式，
 *      MDX 就会把 `{` 当 JSX 表达式解析，报
 *      `Could not parse expression with acorn`，**整个构建失败**，
 *      而错误行号指向的是**下一行**，不是真凶。
 *
 * ③ `$$` 与内容同行、闭合 `$$` 在**独立行**（如 ② 被粗暴拆分后的产物）
 *    → 显示块被当成普通文本，KaTeX 只拿到残缺片段，
 *      `\right)` 找不到配对的 `\left(`，渲染成 katex-error（构建**不报错**）。
 *
 * **规范形态**（本脚本产出的唯一形态）：
 *
 *     $$
 *     公式内容（可多行）
 *     $$
 *
 * ## 用法
 *
 *   node tools/check-mdx-math.mjs <file.mdx> [...]        # 只检查
 *   node tools/check-mdx-math.mjs <file.mdx> --fix        # 规范化显示公式
 */

import fs from "node:fs";

const argv = process.argv.slice(2);
const FIX = argv.includes("--fix");
const files = argv.filter((a) => !a.startsWith("--"));
if (!files.length) {
  console.error("用法：node tools/check-mdx-math.mjs <file.mdx> [...] [--fix]");
  process.exit(2);
}

/* ============================================================
 * 一、规范化：把所有显示公式收敛成「$$ 独占行」
 * ============================================================ */

/**
 * 把一行里的 `$$` 解析出来。
 * 返回 { lines, next } —— lines 是替换后的若干行，next 是下一条待处理的行下标。
 * 若该行没有显示公式，返回 null。
 */
function convertDisplayAt(lines, i, indent, body) {
  const open = body.indexOf("$$");
  if (open < 0) return null;
  const before = body.slice(0, open);
  // 定界符行（整行只有 $$）不处理，由主循环维护状态
  if (/^\s*\$\$\s*$/.test(body)) return null;

  const afterOpen = body.slice(open + 2);
  const inlineClose = afterOpen.indexOf("$$");

  // —— 情形 ①：整行就是 `$$X$$`（同行闭合，且 $$ 之后无内容）——
  if (inlineClose >= 0 && body.slice(open + 2 + inlineClose + 2).trim() === "") {
    const content = afterOpen.slice(0, inlineClose);
    if (!content.trim()) return null;
    const out = [];
    if (before.trim()) out.push(indent + before.trimEnd());
    out.push(indent + "$$");
    out.push(indent + content.trim());
    out.push(indent + "$$");
    return { lines: out, next: i + 1 };
  }

  // —— 情形 ②/③：`$$` 后有内容，闭合在别处 ——
  // 先看同行有没有第二个 `$$`
  let closeLine;
  let closeCol;
  if (inlineClose >= 0) {
    closeLine = i;
    closeCol = open + 2 + inlineClose;
  } else {
    closeLine = -1;
    for (let j = i + 1; j < lines.length; j++) {
      const b = lines[j].replace(/^(\s*>\s?)+/, "");
      if (/^\s*\$\$\s*$/.test(b)) { closeLine = j; closeCol = -1; break; }
      const c = b.indexOf("$$");
      if (c >= 0) { closeLine = j; closeCol = c; break; }
    }
    if (closeLine < 0) return null; // 没闭合，交给 checker 报错
  }

  // 收集内容
  const firstContent =
    closeLine === i
      ? afterOpen.slice(0, closeCol - (open + 2))
      : afterOpen;

  // 判定是否为 ③：开头的 `$$` 只是「残缺块的首行」，真正的块在更后面
  // （特征：首行内容在多行块的中间被硬切断 —— 行尾不留空白、且不含 $$
  //   而后续还存在另一个独立 $$。这里用更直接的办法：
  //   若「首行内容 + 后续行」拼起来在同一行就闭合不上，且 closeLine 的
  //   `$$` 前面紧跟 `}` 或 `)` 这类收尾字符，按③处理由主循环逐块归一。）
  void firstContent;

  const out = [];
  if (before.trim()) out.push(indent + before.trimEnd());
  out.push(indent + "$$");

  if (closeLine === i) {
    out.push(indent + afterOpen.slice(0, closeCol - (open + 2)).trim());
    out.push(indent + "$$");
    const tail = body.slice(closeCol + 2);
    if (tail.trim()) out.push(indent + tail.trimEnd());
    return { lines: out, next: i + 1 };
  }

  // 多行：首行内容 + 中间行
  const first = afterOpen.trim();
  if (first) out.push(indent + first);
  for (let j = i + 1; j < closeLine; j++) out.push(lines[j].trimEnd());
  if (closeCol >= 0) {
    const b = lines[closeLine].replace(/^(\s*>\s?)+/, "");
    const head = b.slice(0, closeCol);
    if (head.trim()) out.push(lines[closeLine].slice(0, lines[closeLine].length - b.length) + head.trimEnd());
    out.push(indent + "$$");
    const tail = b.slice(closeCol + 2);
    if (tail.trim()) out.push(indent + tail.trimEnd());
  } else {
    out.push(indent + "$$");
  }
  return { lines: out, next: closeLine + 1 };
}

function normalize(lines) {
  const out = [];
  let changed = 0;
  let openFence = false;
  let inFence = false;

  for (let i = 0; i < lines.length; ) {
    const line = lines[i];
    // 跳过代码围栏内的内容
    if (/^\s*```/.test(line)) { inFence = !inFence; out.push(line); i++; continue; }
    if (inFence) { out.push(line); i++; continue; }

    const body = line.replace(/^(\s*>\s?)+/, "");
    const indent = line.slice(0, line.length - body.length);

    if (/^\s*\$\$\s*$/.test(body)) { openFence = !openFence; out.push(line); i++; continue; }

    const r = convertDisplayAt(lines, i, indent, body);
    if (r) { out.push(...r.lines); changed++; i = r.next; continue; }

    out.push(line);
    i++;
  }
  return { lines: out, changed };
}

/* ============================================================
 * 二、检查
 * ============================================================ */

function dollarPositions(s) {
  const out = [];
  for (let i = 0; i < s.length; i++) {
    if (s[i] === "\\") { i++; continue; }
    if (s[i] === "$") out.push(i);
  }
  return out;
}

const isFence = (body) => /^\$\$+$/.test(body.trim());
const OK = "\u2713";

let totalErrors = 0;

for (const file of files) {
  let src = fs.readFileSync(file, "utf8");
  const hadTrailing = src.endsWith("\n");

  if (FIX) {
    const { lines, changed } = normalize(src.split("\n"));
    if (changed) {
      const text = lines.join("\n");
      fs.writeFileSync(file, hadTrailing ? text : text.replace(/\n$/, ""), "utf8");
      console.log(`  --fix：规范化 ${changed} 处显示公式`);
      src = fs.readFileSync(file, "utf8");
    }
  }

  const lines = src.split("\n");
  const problems = [];
  let displayOpen = false;
  let inFence = false;

  lines.forEach((line, i) => {
    const n = i + 1;
    if (/^\s*```/.test(line)) { inFence = !inFence; return; }
    if (inFence) return;

    const body = line.replace(/^(\s*>\s?)+/, "");
    const prefixLen = line.length - body.length;
    const fence = isFence(body);

    // 规则 1：`$$` 未独占一行（规范形态要求 `$$` 单独成行）
    if (!fence) {
      const hasDD = /(?<!\$)\$\$(?!\$)/.test(body);
      if (hasDD) {
        problems.push([n, "warn", "`$$` 未独占一行（应为独立的 `$$` 行）", line.trim()]);
      }
    }
    // 规则 2：三连及以上 `$`
    if (/\${3,}/.test(body)) {
      problems.push([n, "error", "出现 3 个及以上连续 `$`（定界符错乱）", line.trim()]);
    }

    // 规则 3：正文模式（不在任何数学模式内）的 \textcolor
    const dollars = dollarPositions(body);
    for (const mm of line.matchAll(/\\textcolor\{red\}/g)) {
      const rel = mm.index - prefixLen;
      const before = dollars.filter((p) => p < rel).length;
      if (!(displayOpen || before % 2 === 1) && !fence) {
        problems.push([n, "error", "`\\textcolor{red}` 裸写在正文（渲染期 ReferenceError）", line.trim()]);
      }
    }
    // 规则 4：\textcolor 参数里嵌 `$`
    for (const mm of line.matchAll(/\\textcolor\{red\}\{([^}]*)\}/g)) {
      if (/(?<!\\)\$/.test(mm[1])) {
        problems.push([n, "error", "`\\textcolor{red}{…}` 参数内嵌 `$`（KaTeX 不支持嵌套）", line.trim()]);
      }
    }

    if (fence) displayOpen = !displayOpen;
  });

  const errs = problems.filter((p) => p[1] === "error").length;
  totalErrors += errs;

  if (!problems.length) {
    console.log(`  ${OK} ${file}`);
  } else {
    console.log(`\n  ${file}  —— ${errs} 个 error / ${problems.length - errs} 个 warn`);
    for (const [n, lvl, msg, snippet] of problems) {
      console.log(`    [${lvl}] 第 ${n} 行：${msg}`);
      console.log(`           ${snippet.slice(0, 110)}`);
    }
  }
}

console.log(`\n合计 ${totalErrors} 个 error`);
process.exit(totalErrors ? 1 : 0);
