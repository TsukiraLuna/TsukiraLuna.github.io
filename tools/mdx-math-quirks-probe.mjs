#!/usr/bin/env node
/** 聚焦验证：行内 textcolor 的三种写法到底哪个真的渲染成红色。 */
import { evaluate } from "@mdx-js/mdx";
import { renderToStaticMarkup } from "react-dom/server";
import * as runtime from "react/jsx-runtime";
import React from "react";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

const cases = {
  B: "则 $\\textcolor{red}{\\text{自反性}}$：$a\\in A$。",
  C: "则 $\\textcolor{red}{R\\ \\text{称为}\\ A\\ \\text{上的等价关系}}$，记为 $a\\sim b$。",
  K: "则 $\\textcolor{red}{\\text{自反性}}$。",
};

for (const [k, body] of Object.entries(cases)) {
  const mod = await evaluate(body, {
    ...runtime,
    remarkPlugins: [remarkMath],
    rehypePlugins: [[rehypeKatex, { strict: "ignore", throwOnError: false }]],
  });
  const html = renderToStaticMarkup(React.createElement(mod.default));
  const tex = [...html.matchAll(/<annotation encoding="application\/x-tex">([\s\S]*?)<\/annotation>/g)].map((m) => m[1]);
  console.log(`\n=== 用例 ${k} ===`);
  console.log(`源码: ${body}`);
  console.log(`katex-error: ${(html.match(/katex-error/g) ?? []).length}`);
  console.log(`mathcolor : ${(html.match(/mathcolor/gi) ?? []).length}`);
  console.log(`KaTeX 收到的 TeX: ${JSON.stringify(tex)}`);
}
