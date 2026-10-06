# TsukiraLuna

[![Next.js](https://img.shields.io/badge/Next.js-16.2.6-black?logo=next.js)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19.2.4-087ea4?logo=react)](https://react.dev)
[![Tailwind](https://img.shields.io/badge/Tailwind-v4-38bdf8?logo=tailwindcss)](https://tailwindcss.com)
[![License](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)

> **月夜下的旅人** —— 数学，但又不止于数学。
>
> 线上地址：<https://tsukiraluna.github.io>

个人博客的源码仓库。内容以**数学与算法**笔记为主（抽象代数、测度论、数值分析、最优化），
其余是普通物理、技术记录与随笔。绝大多数文章由 ElegantBook 排版的手写笔记转录而来，
公式密度很高 —— 全站约 1900 个数学公式。

本站基于 [wanrenhuifu/nextjs-blog-template](https://github.com/wanrenhuifu/nextjs-blog-template)
搭建（MIT），在其上做了大量内容与工具链改造，详见下方「相对模板的改动」。

## 技术栈

| 层级 | 技术 |
|------|------|
| 框架 | Next.js 16.2.6（App Router，`output: "export"` 静态导出） |
| 运行时 | React 19.2.4 |
| 样式 | Tailwind CSS v4（CSS 优先，无 `tailwind.config.js`）+ `@tailwindcss/typography` |
| 公式 | `remark-math` + `rehype-katex` —— **构建期渲染成 HTML，零运行时 JS** |
| 代码高亮 | Shiki + `rehype-pretty-code` |
| 字体 | 全部走系统字体栈，**不加载网络字体**（中文字体网络加载的体积代价过高） |
| 主题 | `next-themes`；日间「竹林」/ 夜间「星月夜」，按访客本地时间自动切换 |
| 动画 | Framer Motion |
| 图标 | Lucide React |
| 校验 | Zod（frontmatter 与 JSON 数据） |
| 测试 | Vitest |
| 部署 | GitHub Actions → GitHub Pages |
| 评论 | Waline —— **本仓库未部署**，留言页显示「评论系统未配置」属正常现象 |

## 内容

共 **48 篇**，分 6 个系列 + 若干独立文章。系列内的章节由 `seriesOrder` 排序，
与发布日期无关。

| 系列 | 篇数 | 类型 | 内容 |
|---|---|---|---|
| 抽象代数 | 5 | 数学 | 预备知识、群论、环论、域论、综合例题 |
| 测度论 | 6 | 数学 | 集类与测度、可测映射、积分和空间 $L^p$、乘积空间、Hausdorff 空间、复习题 |
| 高级数值分析 | 7 | 算法 | 函数逼近、数值积分、常微分方程数值解法、矩阵的特征值、线性与非线性方程组迭代法、复习题 |
| 优化问题数值方法 | 5 | 算法 | 最优化基础、无约束优化、约束优化、ODE 控制优化、全书复习题 |
| 数值分析初步 | 9 | 算法 | 误差与有效数字、插值与逼近、数值积分、线性方程组直接法与迭代法、常微分方程数值解 |
| 数学分析讨论班补充 | 7 | 数学 | 不定积分技巧、Lagrange 定理的逆、可积性、广义积分与级数敛散性 |

另有独立文章：`general-physics-1`（普通物理复习笔记）、`latex-math`（公式渲染测试）、
`writing-guide`（从 Hexo 迁移到本站的记录）。

文章源文件在 `content/blog/<slug>/index.mdx`，配图在 `public/blog/<slug>/`。

## 本地开发

需要 **Node ≥ 20.19**（见 `package.json` 的 `engines`）。

```bash
npm install
npm run dev            # → http://localhost:3000
```

常用命令：

| 命令 | 说明 |
|------|------|
| `npm run dev` | 开发服务器（`predev` 会先生成搜索索引，所以开发模式下搜索可用） |
| `npm run build:verify` | **改完内容优先用这个** —— 生成索引 + 构建 + 裁剪产物，跳过 Waline 保活 |
| `npm run build` | 完整发布链路 |
| `npm start` | 本地预览 `out/`（等价于 `npx serve out`） |
| `npm test` | 单元测试（vitest，47 个） |
| `npx tsc --noEmit` | 类型检查 |
| `npm run lint` | ESLint |
| `npm run og` | 重新生成分享图（**改了站名/标语必须重跑**，站名是烧进 PNG 像素的） |
| `npm run icons` | 重新生成站点图标 |
| `npm run avatars` | 从 GitHub 拉取友链头像 |

> ⚠️ `next build` 与 `next dev` **不能同时跑** —— 两者共用 `.next` 目录，
> 同跑会污染增量编译状态，此后部分路由会永久挂起（首页正常、某个子页卡死 90 秒），
> 症状极具迷惑性。

## 发布

```powershell
npm run build:verify      # 1. 必须验证
git add <具体路径>         # 2. 用具体路径，不要 git add .
git commit -m "content: ..."
git push                  # 3. 推送 main 即自动部署，1–2 分钟后生效
```

推送走 **SSH**（`git@github.com:TsukiraLuna/TsukiraLuna.github.io.git`）。

部署由 `.github/workflows/deploy.yml` 完成，站点地址与 basePath 会**自动推导**
（本仓库名为 `<用户名>.github.io`，属用户站点，地址在根路径、无 basePath）。
Actions 里先跑 `lint` → `tsc` → `test` 再构建，所以**类型错误或测试失败会挡住发布**。

## 写一篇文章

一篇文章 = 一个目录 + 一个 `index.mdx`：

```mdx
---
title: "抽象代数 第 2 章 群论"
pubDate: 2025-04-02
description: "群与子群、陪集与 Lagrange 定理、正规子群与商群……"
tags: ["抽象代数", "群论", "Sylow 定理"]
category: 数学          # 只能取 8 个枚举值之一
series: 抽象代数        # 可选，系列名
seriesOrder: 20         # 可选，数字；系列内升序，建议 10/20/30 留间隔
tocDepth: 2
---

> 本文由手写笔记《抽象代数》扫描件的 LaTeX 转录稿改写而来。

正文……
```

**`category` 只能取这 8 个**（`lib/constants.ts`）：
`数学` `算法` `技术` `生活` `观点` `随笔` `游戏` `测试`。
写错不会中断构建，但那篇文章会被**静默剔除**（构建成功、文章从站点消失）。

完整字段说明与排版规范见 [`content/AGENTS.md`](./content/AGENTS.md)，
系列约定见 [`tools/series-convention.md`](./tools/series-convention.md)。

## 相对模板的改动

### 1. 内容全部自撰

模板自带的示例文章已删除，替换为 48 篇自撰笔记（见上方「内容」）。

### 2. 文章类型枚举

`lib/constants.ts` 的 `POST_CATEGORIES` 定制为以 **数学、算法** 开头：

```
数学  算法  技术  生活  观点  随笔  游戏  测试
```

（`POST_CATEGORIES` 与 `CATEGORY_UI` 必须同时改，少改一处 `tsc` 会报错。）

### 3. LaTeX → 博客的转换工具链

把 ElegantBook 排版的数学讲义转成 MDX 是个反复踩坑的过程，因此把积累下来的
检查固化成了可执行脚本（完整规则见 [`tools/latex-to-blog.md`](./tools/latex-to-blog.md)）：

| 脚本 | 作用 |
|---|---|
| `tools/latex-to-blog-probe.mjs` | **探雷**：分析 `.tex` 的结构、定理环境、自定义宏与需改写的命令；`--check-output` 检查产物公式渲染健康度（要求 `katex-error` 为 0）；`--check-frontmatter` 校验全站 frontmatter 能否解析 |
| `tools/check-mdx-math.mjs` | 检查公式定界符的几类坑（`$$` 未独占一行、正文里裸写 `\textcolor`、参数内嵌 `$`），`--fix` 可规范化 |
| `tools/check-mdx-lists.mjs` | 检查「只有公式的列表项」是否退化成缩进代码块 |
| `tools/mdx-math-quirks-probe.mjs` | 用真实插件链实测各种写法的渲染结果，排怪问题时对照 |

**这些检查不是洁癖**：KaTeX 与 frontmatter 的失败大多是**静默**的 ——
构建全绿，但公式渲染成红色报错串、或者整篇文章从站点消失。所以「构建成功」
不能当作「内容是对的」。

### 4. 两张手绘示意图重绘为 SVG

《优化问题数值方法》第 2 章的 Armijo / Wolfe 准则示意图原稿是 LaTeX `tikzpicture`，
而 tikz 在 KaTeX 里无法渲染，已重绘为 SVG 放在
`public/blog/optimization-numerical-methods-ch02/`。

### 5. 文档体系

仓库带了一套给 AI 助手看的规则文档，这是相对一般模板最大的差别：根 `AGENTS.md`
是入口，`CLAUDE.md` 写架构约定，各目录下的 `AGENTS.md` 记录该目录的细粒度规则与踩坑。
**改动代码后请同步对应文档** —— 映射表见 `CLAUDE.md` 第 14 条。

## 项目结构

```
app/                    # 路由页面（App Router）
├── page.tsx            # 首页
├── blog/[slug]/        # 文章详情（SSG）
├── series/[name]/      # 系列页（按 seriesOrder 排序）
├── tags/ types/ archive/   # 三种聚合视图
├── tools/ friends/ guestbook/ about/
└── sitemap.ts / robots.ts / rss.xml/route.ts

components/             # React 组件（按功能域分组）
├── layout/             # Header / DesktopNav / MobileDrawer / Footer / PageShell
│                       #   SearchModal / ThemeToggle / TimeThemeController / …
├── blog/               # PostCard / MdxContent / TableOfContents / WalineComments
├── home/               # HeroSection / HeroScenery
└── tools/  ui/

lib/                    # 核心业务逻辑（无 JSX、无浏览器 API）
├── content.ts          # 内容读取与处理（含系列聚合、图片尺寸校验）
├── site.ts             # 站点身份出口 + normalizeRouteParam()、publicUrl()
├── data.ts             # 统一数据层（JSON 读取 + Zod 校验 + 降级兜底）
├── constants.ts        # 文章类型枚举与图标配色
└── schemas.ts  types.ts  mdx.ts  readingTime.ts  timeTheme.ts
    bamboo.ts   random.ts tools.ts a11y.ts

content/blog/<slug>/    # MDX 文章源文件（纯文本，不含图片）
data/friends.json       # 友链数据
public/                 # 静态资源（静态导出下唯一会被服务的位置）
├── blog/<slug>/        #   文章配图与示意图
└── cursors/  friends/avatars/

styles/                 # 设计令牌与双主题变量（单一来源：theme.css）
scripts/                # 构建链与手动资源生成器
tools/                  # LaTeX 转换与 MDX 检查工具（见上）
site.config.mjs         # ★ 站点身份的唯一来源
```

## 部署到 GitHub Pages

仓库自带工作流，推送到 `main` 即自动构建并发布。若在新环境重新搭建，需要：

1. **Settings → Pages**，把 **Source 设为 "GitHub Actions"**
2. 确认 Actions 已启用

这两件没做也不会出红叉：工作流会检测到 Pages 未启用，**跳过部署并打印提示**，
构建与检查照常跑完。

站点地址与 basePath **自动推导**，本仓库（用户站点）无需任何配置。
环境变量（见 `.env.example`）全部可选：

| 变量 | 作用 | 缺省行为 |
|------|------|----------|
| `NEXT_PUBLIC_SITE_URL` | 站点根地址，用于 canonical / sitemap / RSS / JSON-LD | 回退到 `https://example.com` 并打印构建警告 |
| `NEXT_PUBLIC_BASE_PATH` | 子路径前缀，仅项目页部署需要 | 视为部署在根路径 |
| `NEXT_PUBLIC_WALINE_SERVER_URL` | Waline 评论后端地址 | 评论区显示「评论系统未配置」 |

> **子路径部署的坑**：若站点部署在子路径下，必须同时正确设置 `SITE_URL` 与
> `BASE_PATH`，漏掉后者会**整站白屏**。另外 Next **不会**自动改写裸字符串写法的资源
> 引用，本项目统一走 `lib/site.ts` 的 `publicUrl()` —— 新增代码引用 `public/` 资源时
> 请同样用它包一层，否则子路径下会静默 404。

## 已知差异：Windows 本地构建

**在 Windows 上 `npm run build` 后本地预览时，控制台会出现一批 404**
（形如 `/blog/__next.blog.__PAGE__.txt`）。已在 Next 16.2.6 上核实：

| 构建环境 | 产出的 RSC 载荷文件名 |
|----------|----------------------|
| Linux（含 GitHub Actions） | `__next.blog.__PAGE__.txt`（扁平文件）—— 客户端预取请求的正是这个 |
| Windows | `__next.blog/__PAGE__.txt`（目录形式） |

这些文件用于**客户端预取**，缺失仅导致预取落空、点击链接时退化为整页跳转，
**导航功能本身正常**。CI 在 ubuntu 上构建，产物正确，无需处理。
若想在 Windows 本地预览时也消除这批 404，用 `npm run dev` 即可。

## 无障碍

- 日间 / 夜间两套配色均满足 WCAG AA 对比度
- 全站键盘可达：跳转主内容链接、可见焦点环、44px 触摸目标
- 浮层（搜索弹窗、移动端抽屉）有 `role="dialog"` + `aria-modal`，焦点被限制在内部
- `prefers-reduced-motion` 下关闭所有循环动画与入场编排
- 脚本被禁用时：入场动画初态由 `<noscript>` 样式接管，首屏照常可见

## 许可

[MIT](./LICENSE)。

代码基于 [wanrenhuifu/nextjs-blog-template](https://github.com/wanrenhuifu/nextjs-blog-template)，
`LICENSE` 同时保留模板与本站的版权行。**文章内容（`content/` 下的笔记）是个人学习整理，
转载前请先问一声。**
