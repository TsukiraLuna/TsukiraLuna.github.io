#!/usr/bin/env node
/**
 * LaTeX 讲义 → 博客文章 · 探雷脚本
 *
 * 用法：
 *   node tools/latex-to-blog-probe.mjs <file.tex>
 *   node tools/latex-to-blog-probe.mjs --check-output <slug>
 *
 * 为什么需要它：KaTeX 对不认识的宏包命令、自定义宏、不支持的环境
 * **一律静默失败** —— 构建全绿、页面能开，但公式是错的。
 * 这个脚本在转换前把所有风险点列出来，转换后检查渲染健康度。
 *
 * 设计原则：只做静态分析与产物检查，不改任何文件。
 */

import fs from "node:fs";
import path from "node:path";

/* ============================================================
 * 一、KaTeX 兼容性知识库
 * ============================================================ */

/**
 * 定理类环境名。KaTeX 完全没有对应物，必须人工改写。
 *
 * 为什么单独列出：这类环境常由 `\newtcbtheorem`（tcolorbox）或
 * `\newtheorem`（amsthm）定义 —— 命令出现在**另一条命令的参数里**，
 * 而不是 `\usepackage`，所以宏包检测抓不到。只能按环境名兜。
 * 实测案例：抽象代数用 tcolorbox 定了 68 个 definition、62 个 proposition。
 */
const THEOREM_ENVS = new Set([
  "definition", "theorem", "lemma", "corollary", "proposition",
  "property", "example", "remark", "axiom", "claim", "conjecture",
  "exercise", "solution", "proof", "note", "assumption",
]);

/** XeLaTeX 专有的字体切换宏 —— 与字体设置一同整块删除，不算需要"展开"的自定义宏 */
const FONT_MACROS = new Set(["\\songti", "\\heiti", "\\kaishu", "\\fangsong"]);

/** 已知在 KaTeX 下**失效**的宏包命令。
 * "失效"包括三种：报 katex-error、原样显示成斜体字母、整块环境崩坏。
 */
const PACKAGE_RISKS = {
  physics: {
    level: "high",
    commands: ["\\dv", "\\pdv", "\\vb", "\\va", "\\vu", "\\qty", "\\abs", "\\norm", "\\eval", "\\order", "\\comm", "\\anticomm"],
    fix: "\\dv{x} → \\frac{\\mathrm{d}}{\\mathrm{d}x}；\\pdv{f}{x} → \\frac{\\partial f}{\\partial x}；\\vb{a} → \\vec{a}；\\qty{...} → \\left(...\\right)",
    note: "本轮实测：这些命令不报错也不渲染，命令名会原样留在页面上，是最隐蔽的失败。",
  },
  siunitx: {
    level: "high",
    commands: ["\\SI", "\\si", "\\num", "\\qty", "\\ang", "\\unit"],
    fix: "直接写字面量：\\SI{9.8}{m/s^2} → 9.8 m/s²",
    note: "KaTeX 无单位排版能力，也无需——网页里直接写文本更清晰。",
  },
  tcolorbox: {
    level: "high",
    commands: [],
    envs: ["tcolorbox", "definition", "theorem", "lemma", "corollary", "proposition", "property", "example", "remark"],
    fix: "**定义 1.1** 加粗标题行 + 正文，或 `> ` 引用块",
    note: "定理类环境没有对应物。需要用 Markdown 表达，样式交给主题。",
  },
  amsthm: {
    level: "medium",
    commands: ["\\newtheorem"],
    envs: ["theorem", "lemma", "corollary", "proof", "definition", "remark"],
    fix: "同上：加粗标题行 + 正文",
    note: "`\\begin{proof}` 可改为 *证明.* 斜体起头。",
  },
  booktabs: {
    level: "low",
    commands: ["\\toprule", "\\midrule", "\\bottomrule", "\\cmidrule"],
    fix: "删除这些命令，用标准 Markdown 表格（表头 + `---` 分隔行）",
    note: "观感反而更好，主题的 typography 会接管样式。",
  },
  multirow: {
    level: "medium",
    commands: ["\\multirow", "\\multicolumn"],
    fix: "Markdown 表格不支持跨行/跨列，需拆成多列或改用列表",
  },
  needspace: {
    level: "low",
    commands: ["\\needspace"],
    fix: "直接删除（分页控制对网页无意义）",
  },
  enumitem: {
    level: "low",
    commands: ["\\begin{enumerate}", "\\begin{itemize}"],
    fix: "改为 Markdown 的 1. / - 列表；`[label=...]` 等选项要删掉",
  },
  xcolor: {
    level: "medium",
    commands: ["\\definecolor", "\\color", "\\textcolor"],
    fix: "\\definecolor 定义的自定义色名 KaTeX 不认，改用内置色名：\\color{red}",
    note: "KaTeX 只支持内置色：red/blue/green/black/white/gray/orange/purple 等。",
  },
  geometry: { level: "low", commands: ["\\geometry"], fix: "删除（网页布局无关）" },
  fancyhdr: { level: "low", commands: [], fix: "删除（页眉页脚对网页无意义）" },
  hyperref: { level: "low", commands: ["\\href", "\\url"], fix: "\\href{url}{text} → [text](url)" },
};

/** KaTeX 无对应物的命令 —— 需要人工改写 */
const STRUCTURAL_COMMANDS = {
  "\\label": "删除（博客没有公式编号体系）",
  "\\eqref": "改写成文字引用，如「上式」「式 (3)」",
  "\\ref": "改写成文字引用",
  "\\cite": "改写成文字引用或链接",
  "\\include": "把被包含的文件内容合并进来",
  "\\input": "把被输入的文件内容合并进来",
  "\\includegraphics": "图片需另传到 public/blog/<slug>/，正文改 Markdown 图片语法",
  "\\tableofcontents": "删除（主题自动生成目录）",
  "\\maketitle": "删除（frontmatter 接管）",
  "\\frontmatter": "删除",
  "\\mainmatter": "删除",
  "\\appendix": "手动改成新的 `##` 章节",
};

/** 环境映射表 */
const ENV_MAP = {
  equation: "$$...$$（去掉环境包裹）",
  "equation*": "$$...$$",
  align: "$$\\begin{aligned}...\\end{aligned}$$（KaTeX 无 align）",
  "align*": "$$\\begin{aligned}...\\end{aligned}$$",
  gather: "$$\\begin{gathered}...\\end{gathered}$$",
  multline: "改用 aligned 手工断行",
  split: "可保留（KaTeX 支持）",
  cases: "可保留（KaTeX 支持）",
  pmatrix: "可保留", bmatrix: "可保留", vmatrix: "可保留", matrix: "可保留",
  aligned: "可保留（这对是最常用的组合）",
  array: "可保留（表格，注意不能用在 Markdown 表格里）",
  theorem: "改为加粗标题行 + 正文",
  proof: "改为 *证明.* 斜体起头",
};

/* ============================================================
 * 二、工具
 * ============================================================ */

const OK = "\u2713";   // ✓
const BAD = "\u2717";  // ✗
const WARN = "!";

function readTex(file) {
  if (!fs.existsSync(file)) {
    console.error(`${BAD} 文件不存在：${file}`);
    process.exit(1);
  }
  return fs.readFileSync(file, "utf8");
}

/** 去掉注释（保留 \% 转义），避免注释里的命令被计入 */
function stripComments(tex) {
  return tex
    .split(/\r?\n/)
    .map((line) => {
      let out = "";
      for (let i = 0; i < line.length; i++) {
        if (line[i] === "%" && line[i - 1] !== "\\") break;
        out += line[i];
      }
      return out;
    })
    .join("\n");
}

/** 统计所有反斜杠命令出现次数 */
function commandCounts(tex) {
  const counts = new Map();
  for (const m of tex.matchAll(/\\([A-Za-z]+)/g)) {
    const name = "\\" + m[1];
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return counts;
}

/**
 * 从 `open` 位置（指向 `{`）起，返回花括号配平后的结束下标。
 * 找不到配平则返回 -1。
 *
 * 为什么不用正则：`\newcommand{\sig}[1]{\sigma(#1)}` 这类定义带嵌套花括号，
 * 正则的 `\{([^]*?)\}` 会在第一层 `}` 就截断，尾巴上的 `(?=\s*(?:\\|$))`
 * 断言又会因定义后面跟着普通文字而整体失配 —— 结果是**部分宏被静默漏掉**。
 * 漏报比误报危险得多，所以这里老老实实配平。
 */
function matchBrace(s, open) {
  if (s[open] !== "{") return -1;
  let depth = 0;
  for (let i = open; i < s.length; i++) {
    const ch = s[i];
    if (ch === "\\") { i++; continue; } // 跳过转义字符，如 \{ \}
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/**
 * 扫描 \newcommand / \renewcommand / \DeclareMathOperator 定义。
 * 返回 [{ name, argc, def, starred }]。
 */
function scanMacros(preamble) {
  const macros = [];
  // LaTeX 宏名允许 @（内部宏常用，如 \thetcb@cnt@definition），故字符类要含 @
  const re = /\\(newcommand|renewcommand|DeclareMathOperator)\s*(\*?)\s*\{?\s*\\([A-Za-z@]+)\s*\}?/g;
  for (const m of preamble.matchAll(re)) {
    const name = "\\" + m[3];
    let cursor = m.index + m[0].length;

    // 可选参数个数：[n] 或 [n][default]
    let argc = null;
    while (preamble[cursor] === "[") {
      const close = preamble.indexOf("]", cursor);
      if (close < 0) break;
      const inner = preamble.slice(cursor + 1, close).trim();
      const n = Number.parseInt(inner, 10);
      if (argc === null && Number.isInteger(n)) argc = String(n);
      cursor = close + 1;
      while (/\s/.test(preamble[cursor] ?? "")) cursor++;
    }

    // 定义体：下一个配平的花括号
    while (cursor < preamble.length && preamble[cursor] !== "{") {
      // 允许定义体前有空白；遇到别的命令说明这个宏没有花括号定义体
      if (preamble[cursor] === "\\") break;
      cursor++;
    }
    let def = "";
    if (preamble[cursor] === "{") {
      const close = matchBrace(preamble, cursor);
      if (close > 0) def = preamble.slice(cursor + 1, close).trim().replace(/\s+/g, " ");
    }

    macros.push({ name, argc, def: def.slice(0, 70), starred: m[2] === "*" });
  }
  return macros;
}

/* ============================================================
 * 三、探雷模式
 * ============================================================ */

function probe(file) {
  const raw = readTex(file);
  const tex = stripComments(raw);
  const bodyStart = tex.indexOf("\\begin{document}");
  const preamble = bodyStart >= 0 ? tex.slice(0, bodyStart) : tex;
  const body = bodyStart >= 0 ? tex.slice(bodyStart) : tex;

  let issues = 0;
  const line = (s = "") => console.log(s);
  const head = (s) => {
    line();
    line("─".repeat(64));
    line(s);
    line("─".repeat(64));
  };

  line(`\n\u{1F50D} LaTeX 探雷报告：${path.basename(file)}`);
  line(`   路径：${file}`);

  /* ---------- 1. 文档规模 ---------- */
  head("1. 文档规模");
  const bodyLines = body.split(/\r?\n/).length;
  line(`   总行数：${raw.split(/\r?\n/).length}  正文行数：${bodyLines}`);
  line(`   文件大小：${(raw.length / 1024).toFixed(1)} KB`);

  /* ---------- 2. 结构 ---------- */
  head("2. 章节结构（→ 转成 Markdown 标题）");
  const chapters = [...body.matchAll(/\\chapter\*?\{([^}]*)\}/g)].map((m) => m[1]);
  const sections = [...body.matchAll(/\\section\*?\{([^}]*)\}/g)].map((m) => m[1]);
  const subsections = [...body.matchAll(/\\subsection\*?\{([^}]*)\}/g)].map((m) => m[1]);
  line(`   \\chapter：${chapters.length} 个   \\section：${sections.length} 个   \\subsection：${subsections.length} 个`);
  if (chapters.length) {
    line();
    for (const c of chapters) line(`   ## ${c}`);
  }
  if (!chapters.length && !sections.length) {
    line(`   ${WARN} 未发现章节命令 —— 可能不是 ElegantBook 结构，需人工确认`);
  }

  /* ---------- 3. 宏包 ---------- */
  head("3. 宏包与风险");
  const pkgs = new Set();
  for (const m of preamble.matchAll(/\\usepackage(?:\[[^\]]*\])?\{([^}]+)\}/g)) {
    for (const p of m[1].split(",")) pkgs.add(p.trim());
  }
  const pkgList = [...pkgs];
  line(`   涉及宏包（${pkgList.length}）：${pkgList.join(", ") || "（无）"}`);
  line();
  let pkgIssues = 0;
  for (const p of pkgList) {
    const risk = PACKAGE_RISKS[p];
    if (!risk) {
      line(`   ${OK} ${p} —— 未在风险库中，正文命令仍需抽查`);
      continue;
    }
    pkgIssues++;
    const tag = risk.level === "high" ? `${BAD} 高风险` : risk.level === "medium" ? `${WARN} 中风险` : `${WARN} 低风险`;
    line(`   ${tag}  ${p}`);
    line(`        原因：${risk.note ?? "需改写"}`);
    if (risk.commands?.length) line(`        命令：${risk.commands.join(" ")}`);
    if (risk.envs?.length) line(`        环境：${risk.envs.map((e) => `\\begin{${e}}`).join(" ")}`);
    line(`        改法：${risk.fix}`);
  }
  if (!pkgIssues) line(`   ${OK} 未命中风险库`);

  /* ---------- 4. 自定义宏 ---------- */
  head("4. 自定义宏（KaTeX 一律不认识，必须展开）");
  const custom = scanMacros(preamble).filter((m) => !FONT_MACROS.has(m.name));
  if (!custom.length) {
    line(`   ${OK} 无自定义宏`);
  } else {
    for (const c of custom) {
      line(`   ${BAD} ${c.name}${c.argc ? `[${c.argc} 参数]` : ""}  →  展开为：${c.def}`);
    }
    line(`\n   共 ${custom.length} 个，全部需要手工展开。`);
  }
  /* ---------- 5. 字体设置 ---------- */
  head("5. XeLaTeX 专有设置（整块可删）");
  const fontCmds = ["\\setCJKmainfont", "\\setCJKsansfont", "\\setCJKmonofont", "\\setCJKfamilyfont", "\\defaultfontfeatures"];
  const found = fontCmds.filter((c) => preamble.includes(c));
  if (found.length) {
    line(`   ${OK} 发现 ${found.length} 处中文字体设置 —— 网页不需要，转换时整块删除`);
    line(`        ${found.join(" ")}`);
  } else {
    line(`   ${OK} 无`);
  }

  /* ---------- 6. 数学环境 ---------- */
  head("6. 数学环境");
  const envs = new Map();
  for (const m of body.matchAll(/\\begin\{([^}]+)\}/g)) {
    // document 是整篇的包裹，不是需要处理的内容环境
    if (m[1] === "document") continue;
    envs.set(m[1], (envs.get(m[1]) ?? 0) + 1);
  }
  const mathEnvs = [...envs.entries()].filter(([e]) =>
    ["equation", "equation*", "align", "align*", "gather", "multline", "split", "cases", "pmatrix", "bmatrix", "vmatrix", "matrix", "aligned", "array", "eqnarray"].includes(e),
  );
  const otherEnvs = [...envs.entries()].filter(([e]) => !mathEnvs.some(([x]) => x === e));
  if (mathEnvs.length) {
    line("   数学环境：");
    for (const [e, n] of mathEnvs.sort((a, b) => b[1] - a[1])) {
      const map = ENV_MAP[e];
      // 可保留的（cases/matrix/aligned）标 ✓；需包裹改写的（equation/align）标 → 而非 ✗ ——
      // 那是机械替换，不构成风险
      const mark = !map || map.includes("可保留") ? `${OK} 可保留` : `→ 需包裹`;
      line(`     ${mark}  \\begin{${e}}  ×${n}${map ? `   → ${map}` : ""}`);
    }
  } else {
    line(`   ${WARN} 未发现数学环境（可能全部用 $...$ 行内）`);
  }
  if (otherEnvs.length) {
    line("\n   其他环境（定理/列表等，KaTeX 无对应物，需人工改写）：");
    for (const [e, n] of otherEnvs.sort((a, b) => b[1] - a[1]).slice(0, 15)) {
      const known = ENV_MAP[e];
      const highRisk = THEOREM_ENVS.has(e);
      const mark = highRisk ? BAD : known ? WARN : WARN;
      line(`     ${mark}  \\begin{${e}}  ×${n}${known ? `   → ${known}` : highRisk ? "   → 改为加粗标题行 + 正文" : ""}`);
    }
  }

  /* ---------- 7. 公式数量 ---------- */
  head("7. 公式数量（用于转换后核对）");
  const displayEq = (body.match(/\$\$[\s\S]*?\$\$/g) ?? []).length;
  const bracketEq = (body.match(/\\\[[\s\S]*?\\\]/g) ?? []).length;
  const eqEnvCount = [...envs.entries()]
    .filter(([e]) => e.startsWith("equation") || e.startsWith("align") || e.startsWith("gather") || e.startsWith("multline"))
    .reduce((s, [, n]) => s + n, 0);
  const inlineEq = (body.match(/(?<!\$)\$(?!\$)[^$\n]+\$(?!\$)/g) ?? []).length;
  line(`   块级：equation/align 环境 ${eqEnvCount} 个，\\[ \\] ${bracketEq} 个，$$ ${displayEq} 个`);
  line(`   行内：$...$ 约 ${inlineEq} 个`);
  line(`\n   ${WARN} 转换后应与此数量级相当。若博客产物里公式数明显偏少，说明有公式未被识别。`);

  /* ---------- 8. 结构命令 ---------- */
  head("8. 需要人工改写的结构命令");
  const counts = commandCounts(body);
  let structIssues = 0;
  for (const [cmd, fix] of Object.entries(STRUCTURAL_COMMANDS)) {
    const n = counts.get(cmd);
    if (n) {
      structIssues++;
      line(`   ${BAD} ${cmd}  ×${n}   → ${fix}`);
    }
  }
  if (!structIssues) line(`   ${OK} 无`);

  /* ---------- 9. 结论 ---------- */
  head("结论");
  const blockers = [];
  if (custom.length) blockers.push(`${custom.length} 个自定义宏需展开`);
  for (const p of pkgList) {
    const risk = PACKAGE_RISKS[p];
    if (risk?.level === "high") blockers.push(`宏包 ${p} 的命令需改写`);
  }
  const theoremEnvHits = [...envs.keys()].filter((e) => THEOREM_ENVS.has(e));
  if (theoremEnvHits.length) {
    const total = theoremEnvHits.reduce((s, e) => s + (envs.get(e) ?? 0), 0);
    blockers.push(`${theoremEnvHits.length} 类定理环境共 ${total} 处需改写（${theoremEnvHits.slice(0, 4).join("/")}${theoremEnvHits.length > 4 ? "…" : ""}）`);
  }
  if (structIssues) blockers.push(`${structIssues} 类结构命令需人工处理`);

  if (blockers.length) {
    line(`   ${BAD} 转换前需处理 ${blockers.length} 项：`);
    for (const b of blockers) line(`      · ${b}`);
  } else {
    line(`   ${OK} 未发现阻碍项，可直接进入转换。`);
  }
  line(`\n   完整规则表见 tools/latex-to-blog.md`);
  line();

  return blockers.length;
}

/* ============================================================
 * 四、产物检查模式
 * ============================================================ */

function checkOutput(slug) {
  const file = path.join(process.cwd(), "out", "blog", slug, "index.html");
  console.log(`\n\u{1F50E} 渲染健康度检查：${slug}`);
  console.log(`   ${file}\n`);

  if (!fs.existsSync(file)) {
    console.error(`${BAD} 找不到产物文件。先运行 npm run build:verify。`);
    process.exit(1);
  }

  const html = fs.readFileSync(file, "utf8");
  const artIdx = html.indexOf("<article");
  const art = artIdx >= 0 ? html.slice(artIdx) : html;

  const katexError = (art.match(/katex-error/g) ?? []).length;
  const hasKatexHtml = art.includes("katex-html");
  const formulas = [...art.matchAll(/<annotation encoding="application\/x-tex">([\s\S]*?)<\/annotation>/g)];
  const menclose = (art.match(/menclose/g) ?? []).length;
  const mtables = (art.match(/mtable/g) ?? []).length;
  const mathcolor = (art.match(/mathcolor/g) ?? []).length;
  const sizeKB = Math.round(html.length / 1024);

  const row = (label, value, ok) =>
    console.log(`   ${ok ? OK : BAD}  ${label.padEnd(26)} ${value}`);

  row("katex-error 次数", katexError, katexError === 0);
  row("katex-html 存在", hasKatexHtml, hasKatexHtml);
  row("成功渲染公式数", formulas.length, formulas.length > 0);
  row("\\boxed 方框 (menclose)", menclose, true);
  row("对齐/矩阵 (mtable)", mtables, true);
  row("红色标记 (mathcolor)", mathcolor, true);
  row("页面体积", `${sizeKB} KB`, sizeKB < 3000);

  console.log();
  if (katexError > 0) {
    console.log(`   ${BAD} 有 ${katexError} 处公式渲染失败，必须修复。`);
    console.log(`      常见原因：宏包命令未改写、自定义宏未展开、环境不支持。`);
  } else if (!hasKatexHtml) {
    console.log(`   ${BAD} 未发现 KaTeX 输出 —— 公式可能根本没被当作数学处理。`);
  } else {
    console.log(`   ${OK} 公式渲染健康。仍需人工抽查排版（长公式溢出、颜色对比度）。`);
  }
  if (sizeKB > 3000) {
    console.log(`   ${WARN} 体积偏大（${sizeKB} KB）。章节多时建议按章拆成多篇。`);
  }
  console.log();

  return katexError;
}

/* ============================================================
 * 五、入口
 * ============================================================ */

const args = process.argv.slice(2);

if (args[0] === "--check-output") {
  const slug = args[1];
  if (!slug) {
    console.error("用法：node tools/latex-to-blog-probe.mjs --check-output <slug>");
    process.exit(1);
  }
  process.exit(checkOutput(slug) > 0 ? 1 : 0);
}

if (!args[0] || args[0] === "-h" || args[0] === "--help") {
  console.log(`
LaTeX 讲义 → 博客文章 · 探雷脚本

用法：
  node tools/latex-to-blog-probe.mjs <file.tex>              分析源码里的转换风险
  node tools/latex-to-blog-probe.mjs --check-output <slug>   检查构建产物的公式渲染

为什么需要：KaTeX 对不认识的宏包命令、自定义宏、不支持的环境一律**静默失败** ——
构建全绿但公式是错的。本脚本把风险点提前列出，并在转换后验证渲染健康度。

完整规则表与流程见 tools/latex-to-blog.md
`);
  process.exit(0);
}

process.exit(probe(args[0]) > 0 ? 2 : 0);
