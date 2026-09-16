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

## 一页速查

```
0. 读 进度说明.md  →  确认转录范围；分清扫描件 / 编译产物
1. node tools/latex-to-blog-probe.mjs <file.tex>   →  探雷
2. 按规则表转换：结构 / 环境 / 颜色 / 宏包 / 自定义宏
3. 写 frontmatter（category: 数学） + 出处说明
4. npm run build:verify  →  --check-output  →  人工抽查
5. commit + push（改了站名才需要 npm run og）
```
