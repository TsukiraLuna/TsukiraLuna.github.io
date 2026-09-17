# LaTeX 讲义 → 博客文章 转换流程

把 `E:\pdf workspace\` 下用 ElegantBook 排版的数学/物理笔记转成博客文章的操作规程。
本流程是 2026-09-16 转换《普通物理（一）复习笔记》时实际走通并验证过的，
其中的宏兼容性结论都经过真实构建检验，不是推测。

---

## 为什么要"流程"而不是"直接转"

KaTeX 不是 LaTeX。它有**三类静默失败**，都不会中断构建、也不会报错：

| 失败类型 | 症状 | 例 |
|---|---|---|
| 不认识的宏包命令 | 命令名原样显示成斜体字母，不报错 | `physics` 的 `\dv{x}` |
| 自定义宏 | 绿色/原样文本，不报错 | `\Pow`、`\sig{n}` |
| 环境不支持 | 整块排版崩坏或内容消失 | `tcolorbox` 定理框 |

**最危险的是"不报错"** —— 构建全绿、页面能开，但公式是错的。
所以流程的第一步永远是**先探雷，再转换**。

---

## 阶段 0：确认转录已完成

**先读 `pdf workspace\进度说明.md`**。它记录了原始扫描件转录到第几页。

- 若显示"尚未处理第 N 页及以后"，说明 `.tex` 只是**节选**，转成博客前要先决定是只发已完成部分，还是等转录补齐
- 真实案例：`测度论` 只转录了原扫描件第 1–6 页（§1 集类与测度），第 7 页起未处理

**区分两个 PDF**（很容易搞混）：

| 文件 | 特征 | 用途 |
|---|---|---|
| `E:\pdf workspace\<科目>\<科目>.pdf` | **7–8 MB，扫描图像**（含 `/Image`，无 `/Font`） | 手写原件，只供比对 |
| `E:\pdf workspace\<科目>\pdf workspace\<科目>.pdf` | **600–900 KB，矢量文本** | LaTeX 编译产物 |

判断方法：

```powershell
$f = 'E:\pdf workspace\测度论\测度论.pdf'
$head = -join ((Get-Content -LiteralPath $f -Encoding Byte -TotalCount 3000) | ForEach-Object { [char]$_ })
"扫描图像: $($head -match '/Image')"   # True → 是扫描件
```

---

## 阶段 1：探雷（不可跳过）

在博客仓库里运行：

```powershell
cd "F:\blog TsukiraLuna"
node tools/latex-to-blog-probe.mjs "E:\pdf workspace\测度论\pdf workspace\测度论.tex"
```

它输出文档结构、涉及宏包、自定义宏、**定理环境**、以及按风险分级的问题清单。
全部 ✗ 项清零后，才进入转换阶段。

脚本已内置的知识（都是实测得出，不是推测）：

- **高风险宏包**：`physics`、`siunitx`、`tcolorbox`
- **自定义宏**：用花括号配平扫描，能正确处理 `\sig[1]{\sigma(#1)}` 这类带嵌套花括号、
  以及 `\thetcb@cnt@definition` 这类含 `@` 的内部宏名
- **定理环境**：单独按环境名兜底 —— 因为 `\newtcbtheorem` / `\newtheorem` 的定义出现在
  **另一条命令的参数里**而不是 `\usepackage`，光查宏包会漏掉
- **XeLaTeX 字体宏**（`\songti` 等）：归入"整块删除"，不计为需展开的自定义宏

---

## 阶段 2：转换规则表

### 结构映射

| LaTeX | MDX |
|---|---|
| `\chapter{运动与力}` | `## 一、运动与力`（章节号手工递补） |
| `\section{速度与速率}` | `### 速度与速率` |
| `\subsection{...}` | `#### ...`（注意 `tocDepth` 默认只收录到 `###`） |
| `\textbf{重点}` | `**重点**` |
| `\emph{...}` | `*...*` |

frontmatter 用模板规范（见 `content/AGENTS.md`）：

```yaml
---
title: "普通物理（一）复习笔记"
pubDate: 2026-09-16
description: "一句话摘要"
tags: ["普通物理", "力学", "复习笔记"]
category: 数学
tocDepth: 2
---
```

### 数学环境

| LaTeX | MDX / KaTeX | 说明 |
|---|---|---|
| `\begin{equation}...\end{equation}` | `$$...$$` | |
| `\begin{align}...\end{align}` | `$$\begin{aligned}...\end{aligned}$$` | **KaTeX 没有 `align`** |
| `\[ ... \]` | `$$...$$` | |
| `$...$` | 原样 | |
| `\begin{equation}\label{eq:x}\end{equation}` | `$$...$$` | `\label`/`\eqref` 无对应，删掉并改文字引用 |
| `\boxed{...}` | 原样 | ✅ 渲染成真方框（MathML `menclose`） |
| `\text{中文}` | 原样 | ✅ 支持中文下标 |
| `\dfrac` | 原样 | ✅ 支持 |
| `\middle\|` 增广矩阵 | 原样 | ✅ 支持（但 `$$` 必须独占一行） |
| `\operatorname{diag}` | 原样 | ✅ 支持 |

### ⚠️ 多行公式必须让 `$$` 独占一行（本流程最容易踩的坑）

**症状有两种，根因是同一个**，别被错误信息带偏：

- 构建报 `[next-mdx-remote] error compiling MDX: Could not parse expression with acorn`
- 或页面里公式变成红色 `katex-error`，提示 `ParseError: Expected 'EOF', got '&'`

**根因**：MDX 把 `{` 当 JSX 表达式起始。若 `\end{aligned}` 与闭合的 `$$` 写在同一行
（`\end{aligned}$$`），解析器会尝试用 acorn 解析 `{...}` 的内容而失败。

**正确写法** —— `$$` 独占一行：

```markdown
$$
\begin{aligned}
x_n &= \frac{b_n}{u_{nn}},\\
x_i &= \frac{b_i}{u_{ii}}.
\end{aligned}
$$
```

**错误写法**：

```markdown
$$\begin{aligned}
x_n &= \frac{b_n}{u_{nn}},\\
\end{aligned}$$      ← 开头与结尾的 $$ 都没独占一行
```

**实测边界**（逐项验证过）：

| 写法 | 结果 |
|---|---|
| 单行 `$$Ux=b,$$` | ✅ 正常 |
| `$$` 独占行 → 内容 → `$$` 独占行 | ✅ 正常 |
| `$$\begin{aligned}` … `\end{aligned}$$` | ❌ 失败 |
| 多行块但闭合 `$$` 跟在 `\end{aligned}` 后 | ❌ 失败 |

**为什么容易漏**：单行公式（`$$x=1$$`）不需要这个处理，**只在多行公式上出问题**。
一份文档若前面几章恰好只有单行公式，会给人"格式没问题"的错觉。

**自检命令**，转完后应为 0 处：

```powershell
Select-String -Path 'content/blog/<slug>/index.mdx' -Pattern '\\end\{[a-z]+\}\$\$|\$\$\\begin\{'
```

> 另注：`$$` 前建议留空行（紧跟段落文字虽多数情况可渲染，但补齐更稳妥）。

### 颜色（原稿红笔重点）

原 `.tex` 用 `\definecolor{annotationred}{RGB}{200,30,30}` 定义自定义色，
KaTeX **只认内置色名**，必须改写：

| LaTeX | MDX |
|---|---|
| `\color{annotationred}{...}` | `\color{red}{...}` |
| `\textcolor{annotationred}{...}` | `\textcolor{red}{...}` |

> ⚠️ 纯红在夜间主题下偏刺眼。若觉得突兀，改用 `\boxed` 统一标记，
> 或彻底去掉颜色。这是**风格取舍，不是技术限制**。

### 宏包替换（探雷会逐个报出来）

| 宏包 | 失效命令 | 替代写法 |
|---|---|---|
| `physics` | `\dv{x}`、`\pdv{f}{x}` | `\frac{\mathrm{d}}{\mathrm{d}x}`、`\frac{\partial f}{\partial x}` |
| `physics` | `\vb{a}`、`\va{a}` | `\vec{a}` |
| `physics` | `\qty{...}` | `\left(...\right)` |
| `siunitx` | `\SI{9.8}{m/s^2}`、`\num{1e-3}` | 直接写字面：`9.8 m/s²` |
| `tcolorbox` | `\begin{definition}...\end{definition}` | `**定义 1.1**` 加粗行 + 正文，或 `> ` 引用块 |
| `booktabs` | `\toprule` `\midrule` `\bottomrule` | 删掉，用标准 Markdown 表格 |
| `needspace` | `\needspace{3\baselineskip}` | 删掉 |

### 自定义宏（必须展开）

`.tex` 里 `\newcommand` 定义的宏，KaTeX 一律不认识，必须手工展开：

| 定义 | 展开为 |
|---|---|
| `\newcommand{\Pow}{\mathcal P}` | `\mathcal P` |
| `\newcommand{\sig}[1]{\sigma(#1)}` | `\sigma(...)` |
| `\newcommand{\calC}{\mathcal C}` | `\mathcal C` |

**「中文字体设置」整段可以整块删掉**（`\defaultfontfeatures`、`\setCJKmainfont` 等），
那是 XeLaTeX 专有的，网页不需要：

```latex
% 这 12 行全部删除
\defaultfontfeatures{}
\setCJKmainfont[...]{SimSun}
\setCJKsansfont[...]{SimHei}
...
\newcommand{\songti}{\CJKfamily{zhsong}}
```

---

## 阶段 3：文章骨架

```markdown
---
title: "..."
pubDate: YYYY-MM-DD
description: "..."
tags: [...]
category: 数学
tocDepth: 2
---

> 本文由手写笔记扫描件转录整理而来，公式以红色标出原稿中的红笔重点标记。

## 一、<章标题>

### <节标题>

正文……

$$
公式
$$
```

首行那句出处说明按需保留——它是**给读者的交代**，也避免被误认为纯原创整理。

---

## 阶段 4：验证（三个层次，缺一不可）

### 4.1 构建

```powershell
npm run build:verify
```

看 `Generating static pages using N workers (N/N)` 与是否有 `katex` 相关报错。
**注意：构建成功不代表公式对**——这正是 KaTeX 静默失败的含义。

### 4.2 公式健康度（关键）

```powershell
node tools/latex-to-blog-probe.mjs --check-output general-physics-1
```

判定标准（本轮实测的基准值）：

| 指标 | 期望 | 说明 |
|---|---|---|
| `katex-error` 出现次数 | **必须为 0** | 非 0 说明有公式渲染失败，必须修 |
| `katex-html` 存在 | True | 证明 KaTeX 真的跑了 |
| 公式总数 | 与源码公式数一致 | 少了说明有公式没被识别 |

**不要用 `\dv` 这类字符串搜正文判断**——搜到的可能是 JSON-LD 里嵌入的 Markdown 原文，
会得出错误结论。（这个坑本轮踩过。）

### 4.3 人工抽查

打开 `out/blog/<slug>/index.html`，或用 `npm run dev` 看 <http://localhost:3000>，
**至少检查**：

- [ ] 每个章节标题都在，编号连续
- [ ] 长公式没有溢出容器（`\begin{aligned}` 的宽行最易溢出）
- [ ] `\boxed` 显示成方框而不是文字
- [ ] 中文下标（`\text{外}`）正常
- [ ] 红色重点标记的颜色在**日间与夜间主题下都清晰**
- [ ] `$$` 与内容之间没有空行

---

## 阶段 5：提交

```powershell
git add content/blog/<slug>
git commit -m "content: 新增<文档名>

由手写笔记扫描件的 LaTeX 转录稿（ElegantBook 模板）改写为 MDX 博文，
N 章 M 节、K 个公式：

- <章节列表>

转换要点：
- \chapter -> ##，\begin{align} -> \begin{aligned}
- <失效的宏包命令> 在 KaTeX 下静默失败，已改写为标准写法
- 原稿红笔重点用 \color{red} 保留

验证：构建 N 页零警告，K 个公式全部渲染成功，无 katex-error"

git push
```

**若改了站名或标语**，记得 `npm run og` 重新生成分享图（像素级烧录，不会自动更新）。

---

## 已知限制与取舍

**页面体积**：KaTeX 为每个公式同时输出 HTML 与 MathML 两套标记。实测 **112 个公式
（含行内）→ 1.8 MB** 单页。对比：`latex-math` 约 20 个公式 → 347 KB。

> 计数口径要注意：块级公式只有 85 个，但**行内公式同样占体积**。
> 用 `--check-output` 得到的数字是全部公式数，核对时以它为准。

- 章节数超过 6、公式超过 100 时，建议**按章拆成多篇**（各约 300 KB）
- 拆分还能让站内搜索按章节定位，比一篇巨页更实用

**`\label` / `\eqref` 交叉引用无解**：博客没有公式编号体系。
删除 `\label`，把 `\eqref{eq:x}` 改写成「上式」「式 (3)」这类文字引用。

**定理环境需要人工改写**：`tcolorbox`、`amsthm` 的 `\begin{theorem}` 都没有对应物。
建议用加粗标题行 + 正文的朴素形式，或 `> ` 引用块。

**表格**：`booktabs` 的三线表转成标准 Markdown 表格即可，样式由主题的
`@tailwindcss/typography` 接管，观感反而更好。

---

## 自检基准（已完成的实例）

新接手时可用这个已完成的案例校准自己的做法。**这些数字都是实测的，不是估计**。

### 普物1（`general-physics-1`）

源码：`E:\pdf workspace\普物1\pdf workspace\普物1.tex`

**转换前探雷报出的风险**：

| 项 | 值 |
|---|---|
| 章节 | 6 个 `\chapter`、27 个 `\section` |
| 高风险宏包 | `physics`、`siunitx` |
| 数学环境 | `equation` ×60、`align` ×23 |
| 块级公式合计 | **83 个** |
| 行内公式 | 约 30 个 |
| 结构命令 | `\label` ×6、`\tableofcontents`、`\maketitle`、`\frontmatter`、`\mainmatter` |

**转换后 `--check-output` 的期望值**：

| 指标 | 值 |
|---|---|
| `katex-error` | **0** |
| 成功渲染公式数 | **112** |
| `menclose`（`\boxed`） | 27 |
| `mtable`（`aligned`） | 110 |
| `mathcolor`（红色） | 88 |
| 页面体积 | 约 1797 KB |
| 结构 | 6 章 27 节 |

**公式数对照**：转换前"块级 83 个"，转换后"全部 112 个"——两者**不是同一个口径**，
差值是行内公式。核对时用 `--check-output` 的数，不要拿 83 去比 112。

**这轮用到的替换**：

| 原写法 | 出现 | 替换为 |
|---|---|---|
| `\dv` / `\pdv` / `\vb` | 0（源码未实际使用，但宏包已引入） | `\frac{\mathrm{d}}{\mathrm{d}x}` 等 |
| `\color{annotationred}` | 88 处 | `\color{red}` |
| `\begin{align}` | 23 个 | `$$\begin{aligned}...\end{aligned}$$` |
| `\chapter` / `\section` | 6 / 27 | `## 一、xxx` / `### xxx` |

### 另外三份的探雷结果（尚未转换）

| 文档 | 源文件 | 探雷报出的主要风险 |
|---|---|---|
| 测度论 | 13 KB | **6 个自定义宏**：`\Pow`→`\mathcal P`、`\calC`→`\mathcal C`、`\calF`、`\calN`、`\calU`、`\sig[1]`→`\sigma(#1)`。仅转录到原扫描件第 1–6 页 |
| 数值分析初步 | 37 KB | 29 处 `theorem` 环境；无自定义宏 |
| 抽象代数 | **73 KB** | **178 处定理环境**（`definition`×68、`proposition`×62、`theorem`×34、`property`×14）；6 个 `\thetcb@cnt@*` 宏 |

**抽象代数要注意**：73 KB 源文件按普物 14.6 KB → 112 公式的比例推算，
可能有 **500+ 个公式 → 单页 8–10 MB**。必须按章拆分。
且 178 处定理环境需人工决定改成加粗标题行还是引用块，**脚本无法代劳**。

---

## 一页速查

```
0. 读 进度说明.md  →  确认转录范围；分清扫描件 / 编译产物
1. node tools/latex-to-blog-probe.mjs <file.tex>   →  探雷
2. 按规则表转换：结构 / 环境 / 颜色 / 宏包 / 自定义宏
3. 写 frontmatter（category: 数学） + 出处说明
4. npm run build:verify  →  --check-output  →  人工抽查
5. commit + push（改了站名才需要 npm run og）
```

仓库整体情况、部署方式、命令清单见 [`AI-HANDOFF.md`](./AI-HANDOFF.md)。
