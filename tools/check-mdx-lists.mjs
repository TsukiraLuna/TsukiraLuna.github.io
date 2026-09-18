#!/usr/bin/env node
/**
 * 检查 MDX 里是否出现「缩进代码块」。
 *
 * 为什么需要：LaTeX 的 `\begin{enumerate}` 里如果某一项**只有公式、没有前置文字**，
 * 转成
 *     3.
 *
 *         $$
 *         x=y
 *         $$
 * remark 会把 `3.` 解析成**空列表项**，缩进的 `$$` 掉出列表、被当成
 * **缩进代码块** —— 页面上公式变成一段代码，而且构建**不报错**。
 * 正确写法是标记行紧接公式（中间不留空行）。
 *
 * 用法：node tools/check-mdx-lists.mjs <file.mdx> [...]
 */

import fs from "node:fs";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";

const files = process.argv.slice(2).filter((a) => !a.startsWith("--"));
if (!files.length) {
  console.error("用法：node tools/check-mdx-lists.mjs <file.mdx> [...]");
  process.exit(2);
}

let total = 0;

/** 递归收集指定 type 的节点 */
function walk(node, type, out = []) {
  if (node.type === type) out.push(node);
  for (const c of node.children ?? []) walk(c, type, out);
  return out;
}

for (const file of files) {
  const src = fs.readFileSync(file, "utf8");
  // 去掉 frontmatter，否则 --- 会被当成 thematicBreak/setext
  const body = src.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "");
  const tree = unified().use(remarkParse).use(remarkGfm).use(remarkMath).parse(body);
  const code = walk(tree, "code");
  const listItems = walk(tree, "listItem");
  const emptyItems = listItems.filter((it) => !it.children?.length);

  console.log(`\n${file}`);
  console.log(`  listItem: ${listItems.length}  |  code: ${code.length}  |  空列表项: ${emptyItems.length}`);

  const problems = code.length + emptyItems.length;
  total += problems;
  if (problems === 0) {
    console.log("  ✓ 无缩进代码块，无空列表项");
  } else {
    for (const c of code) {
      console.log(`  [error] 代码块（第 ${c.position?.start?.line} 行起）：${JSON.stringify(String(c.value).slice(0, 80))}`);
    }
    for (const it of emptyItems) {
      console.log(`  [error] 空列表项（第 ${it.position?.start?.line} 行）`);
    }
  }
}

console.log(`\n合计 ${total} 处问题`);
process.exit(total ? 1 : 0);
