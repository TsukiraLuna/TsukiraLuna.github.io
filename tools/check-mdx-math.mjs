#!/usr/bin/env node
/**
 * 检查 MDX 里数学定界符的写法是否会造成构建失败或静默渲染错。
 *
 * 三条已知问题（都用仓库真实插件链实测过，不是推测）：
 *
 *   1. `$$` 与正文同行，如 `$$F(S)(T)=X$$` → remark-math 当**行内**公式
 *      （katex-display=0），且若其中夹了孤立 `$` 则直接
 *      `Could not parse expression with acorn`，整个构建失败。
 *   2. `\textcolor{red}{…}` 裸写在**正文**里（不在任何数学模式内）→
 *      解析通过但渲染期 `ReferenceError: red is not defined`，整页生成失败。
 *   3. `\textcolor{red}{$…$}` —— 参数里嵌 `$` → acorn 报错。
 *
 * 关键实现点：必须**跨行跟踪 `$$` 显示块**。`$$` 独占一行时，块内那一行开头
 * 没有 `$`，只看「本行前面有几个 $」会把块内的 `\textcolor` 误判成正文模式。
 *
 * 用法：
 *   node tools/check-mdx-math.mjs <file.mdx> [...]        # 只报告
 *   node tools/check-mdx-math.mjs <file.mdx> --fix        # 顺手把行内 `$$X$$` 展开成独占行
 */

import fs from "node:fs";

const argv = process.argv.slice(2);
const FIX = argv.includes("--fix");
const files = argv.filter((a) => !a.startsWith("--"));
if (!files.length) {
  console.error("用法：node tools/check-mdx-math.mjs <file.mdx> [...] [--fix]");
  process.exit(2);
}

/** 未被 `\` 转义的 `$` 的位置 */
function dollarPositions(s) {
  const out = [];
  for (let i = 0; i < s.length; i++) {
    if (s[i] === "\\") { i++; continue; }
    if (s[i] === "$") out.push(i);
  }
  return out;
}

/** `$$` 独占一行的围栏（允许引用块前缀与前后空白） */
const isFence = (body) => /^\$\$+$/.test(body.trim());

let totalErrors = 0;
let totalWarns = 0;

for (const file of files) {
  const src = fs.readFileSync(file, "utf8");
  const lines = src.split("\n");
  const problems = [];
  let displayOpen = false;

  lines.forEach((line, i) => {
    const n = i + 1;
    const body = line.replace(/^(\s*>\s?)+/, "");
    const prefixLen = line.length - body.length;
    const fence = isFence(body);

    // 规则 1a：`$$` 与正文同行（该行同时是开与闭，且中间有非空白内容）
    if (!fence && !displayOpen) {
      const m = /\$\$(?!\s*$)(.+?)(?<!\\)\$\$\s*$/.exec(body);
      if (m && m[1].trim()) {
        problems.push([n, "warn", "`$$` 与正文同行（会渲染成行内公式，非行间）", line.trim()]);
      }
    }
    // 规则 1b：三连及以上 `$`
    if (/\${3,}/.test(body)) {
      problems.push([n, "error", "出现 3 个及以上连续 `$`（定界符错乱）", line.trim()]);
    }

    // 规则 2：正文模式的 \textcolor（显示块内、或本行 `$` 数为奇数 → 数学模式）
    const dollars = dollarPositions(body);
    for (const m of line.matchAll(/\\textcolor\{red\}/g)) {
      const rel = m.index - prefixLen;
      const before = dollars.filter((p) => p < rel).length;
      const inMath = displayOpen || before % 2 === 1;
      if (!inMath && !fence) {
        problems.push([n, "error", "`\\textcolor{red}` 裸写在正文（渲染期 ReferenceError）", line.trim()]);
      }
    }
    // 规则 3：\textcolor 参数里嵌 `$`
    for (const m of line.matchAll(/\\textcolor\{red\}\{([^}]*)\}/g)) {
      if (/(?<!\\)\$/.test(m[1])) {
        problems.push([n, "error", "`\\textcolor{red}{…}` 参数内嵌 `$`（KaTeX 不支持嵌套）", line.trim()]);
      }
    }

    if (fence) displayOpen = !displayOpen;
  });

  const errs = problems.filter((p) => p[1] === "error").length;
  const warns = problems.filter((p) => p[1] === "warn").length;
  totalErrors += errs;
  totalWarns += warns;

  console.log(`\n${file}  (${lines.length} 行)`);
  if (!problems.length) {
    console.log("  ✓ 未发现数学定界符问题");
  } else {
    console.log(`  ${errs} 个 error / ${warns} 个 warn`);
    for (const [n, lvl, msg, snippet] of problems) {
      console.log(`  [${lvl}] 第 ${n} 行：${msg}`);
      console.log(`         ${snippet.slice(0, 120)}`);
    }
  }

  // --fix：把「`$$X$$` 独占行」这一条安全地展开
  if (FIX) {
    const out = [];
    let changed = 0;
    let open = false;
    for (const line of lines) {
      const body = line.replace(/^(\s*>\s?)+/, "");
      const lead = line.slice(0, line.length - body.length);
      const fence = isFence(body);
      if (!fence && !open) {
        const m = /^(.*?)\$\$(.+?)(?<!\\)\$\$\s*$/.exec(body);
        if (m && m[2].trim() && !/\${3,}/.test(body) && !/(?<!\\)\$(?!\$)/.test(m[2])) {
          const [, before, inner] = m;
          if (before.trim()) out.push(lead + before.trimEnd());
          out.push(lead + "$$");
          out.push(lead + inner.trim());
          out.push(lead + "$$");
          changed++;
          continue;
        }
      }
      out.push(line);
      if (fence) open = !open;
    }
    if (changed) {
      fs.writeFileSync(file, out.join("\n"), "utf8");
      console.log("  --fix：展开 " + changed + " 处行内 $$X$$");
    }
  }
}

console.log(`\n合计 ${totalErrors} 个 error / ${totalWarns} 个 warn`);
process.exit(totalErrors ? 1 : 0);
