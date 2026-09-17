# AGENTS.md — 博客仓库操作规则

> **给接手本仓库的 AI 助手的入口文件。先读这一份，再动手。**
>
> 仓库：`TsukiraLuna/TsukiraLuna.github.io`（本地 `F:\blog TsukiraLuna`）
> 线上：<https://tsukiraluna.github.io>
> 这份是**开头**，不是全部：细节分别见 `CLAUDE.md`、各目录 `AGENTS.md`、
> `tools/AI-HANDOFF.md`、`tools/series-convention.md`、`tools/latex-to-blog.md`。

---

## 1. 项目是什么

Next.js 16 静态导出的个人博客（`output: "export"`，产物 `out/`）。

| 项 | 值 |
|---|---|
| 框架 | Next.js 16.2.6（App Router）+ React 19.2.4 |
| 样式 | Tailwind CSS v4 + `@tailwindcss/typography` |
| 公式 | `remark-math` + `rehype-katex`，**构建期渲染，零运行时 JS** |
| 代码高亮 | Shiki + `rehype-pretty-code` |
| 内容 | `content/blog/<slug>/index.mdx` |
| 主题 | 双主题，按访客本地时间自动切换 |
| 部署 | 推送到 `main` → GitHub Actions → GitHub Pages |
| 作者 | 数学专业学生，内容以**数学、算法、普通物理**为主，公式极多 |

**评论（Waline）未部署** —— 留言页显示「评论系统未配置」是**正常现象**，不要修。

---

## 2. 六条硬约束

按「不遵守会出事的程度」排序。**前四条都真实踩过。**

### ① 推送只能用 SSH，不要改成 HTTPS

作者网络**阻断 `github.com` 的 443 端口**，HTTPS 推送必然超时：

```
fatal: unable to access 'https://github.com/...': Failed to connect to github.com:443
```

remote 已配好 SSH，**保持不动**：

```powershell
git remote -v
# origin  git@github.com:TsukiraLuna/TsukiraLuna.github.io.git
```

### ② frontmatter 写错会**静默剔除整篇文章**

构建**不会失败**，那篇文章只是从站点消失，日志里有一行 `frontmatter 校验失败`。

```yaml
---
title: "文章标题"        # 必填，值必须用双引号
pubDate: 2026-09-16     # 必填，YYYY-MM-DD（写错不报错，会被归一化成 1970-01-01）
description: "摘要"
tags: ["标签1", "标签2"]
category: 数学          # 只能取下面的枚举值，写错 = 整篇剔除
series: 数学分析        # 可选，系列名
seriesOrder: 10         # 可选，数字（不是字符串）
tocDepth: 2             # 可选，只能 1 / 2 / 3
---
```

**`category` 只能取这 8 个**（`lib/constants.ts` 的 `POST_CATEGORIES`）：

```
数学  算法  技术  生活  观点  随笔  游戏  测试
```

> 这是本站定制过的枚举（数学与算法排最前）。新增类型必须**同时**改
> `POST_CATEGORIES`（数组）与 `CATEGORY_UI`（图标/配色映射），少改一处 `tsc` 会报错。

### ③ 动态路由必须规范化 `params`（模板既有 bug，已修）

渲染时 `params.tag` / `params.name` 拿到的是 **URL 编码值**（`%E6%95%B0...`），
而 `getAllTags()` / `getAllSeries()` 返回明文，**直接比较恒不相等**。

症状：`/tags/数学分析/` 显示「**0 篇文章**」且标题是编码串，而 `/tags/LaTeX/` 正常 ——
即**所有含中文的标签页都是空的，且不报任何错**。

**写法**：页面里一律 `normalizeRouteParam(rawName)`（`lib/site.ts`）。
**不要**直接调 `decodeURIComponent` —— 少 try/catch 会让含裸 `%` 的标签
（如「100%增长」）抛 `URIError` 导致整个构建失败。

### ④ 禁用 `robocopy /MIR`；不要在用户主目录跑 git

- `/MIR` 会删除目标端「多余」的文件 —— 曾把整个工作区（含 `.git`）清空。
  **复制用 `/E`**，批量删除前先把 `.git` 备份到工作区外
- `git add .` 的 `.` 是当前目录。在 `C:\Users\Rakari` 执行会把整个用户目录纳入仓库

### ⑤ `next build` 与 `next dev` 不能同时跑

两者共用 `.next` 目录。dev server 运行期间构建会污染增量编译状态，
此后**部分路由永久挂起**——症状极具迷惑性：首页正常，某个子页卡死 90 秒。
遇到就先停 dev，删 `.next` 再重启。

### ⑥ 目录不能嵌套

`content/blog/` 是**单层读取**。`content/blog/数学分析/第一章/index.mdx`
会被**完全忽略**。每篇必须是 `content/blog/<slug>/index.mdx`。

---

## 3. 命令

```powershell
npm run dev            # 本地预览 http://localhost:3000
npm run build:verify   # 构建验证（跳过 Waline 保活）—— 改完内容优先用它
npm run build          # 完整发布路由
npm test               # vitest，47 个测试
npx tsc --noEmit       # 类型检查
npm run og             # 重新生成分享图（改了站名/标语后必须跑）
```

发布流程：

```powershell
npm run build:verify              # 1. 必须验证
git add <改动的路径>               # 2. 用具体路径，不要 git add .
git commit -m "content: ..."
git push                          # 3. 自动部署，1–2 分钟后生效
```

---

## 4. 常见任务怎么做

### 发一篇文章

在 `content/blog/<slug>/index.mdx` 写 frontmatter + 正文。
标题里**建议带章号**（标签页与搜索只显示标题不显示日期）。

### 发系列的一章

加 `series: <系列名>` 与 `seriesOrder: <数字>`。**顺序自动处理，不要手写导航链接。**
配图放 `public/blog/<slug>/`（**不是** `content/` 下）。详见 `tools/series-convention.md`。

### 把 LaTeX 讲义转成文章

```powershell
node tools/latex-to-blog-probe.mjs "<file.tex>"   # 1. 先探雷
# 2. 按 tools/latex-to-blog.md 的规则表转换
npm run build:verify                               # 3. 构建
node tools/latex-to-blog-probe.mjs --check-output <slug>   # 4. 验证公式
node tools/mdx-math-quirks-probe.mjs               # 遇到公式/颜色怪问题时对照实测结论
```

**核心警告**：KaTeX 的失败是**静默的** —— 不认识的宏包命令（`physics`、`siunitx`）、
自定义宏、定理环境都不报错，只是默默渲染错。所以第 1、4 步不能省。

**第二条警告**：`\textcolor{red}{…}` 写在**正文里**（不在 `$…$` 内）会让整个构建失败，
且报错信息与 LaTeX 无关（`Could not parse expression with acorn` 或
`ReferenceError: red is not defined`）。正确写法是 `$\textcolor{red}{…}$`。
`$$` 也必须**独占一行**，否则会被渲染成行内公式。细则见 `tools/latex-to-blog.md`。

### 改站点信息

| 改什么 | 文件 |
|---|---|
| 站名、标语、描述、GitHub | `site.config.mjs` |
| 站点地址 | `.env.local` 的 `NEXT_PUBLIC_SITE_URL` |
| 文章类型枚举 | `lib/constants.ts` |
| 导航菜单 | `components/layout/nav-data.ts` |
| 友链 | `data/friends.json` |

**`name` 与 `ogTagline` 是烧进分享图 PNG 像素的** —— 改了必须 `npm run og`，
其他地方会自动更新，只有图片不会。**不要改 `lib/site.ts` 来改站点信息**（它只是读取入口）。

### 改完必须同步文档

模板有硬性规则（见 `CLAUDE.md` 第 14 条）：

| 改动 | 要同步 |
|---|---|
| 新增/删除路由 | `app/AGENTS.md` 路由表 |
| 新增/删除组件 | `components/AGENTS.md` |
| 新增/删除 lib 函数 | `lib/AGENTS.md` |
| 新增/删除构建脚本 | `scripts/AGENTS.md` |
| frontmatter 字段 | `content/AGENTS.md` |
| 设计令牌 | `DESIGN.md` + `styles/theme.css` |

---

## 5. 验证清单

改完内容**至少**确认：

- [ ] `npm run build:verify` 成功，日志里**没有** `frontmatter 校验失败`
- [ ] 日志里**没有** `[data]`（友链数据降级，页面会静默变空）
- [ ] 日志里**没有** `[content] 系列「X」的排序信息不完整`（漏写/重复的 `seriesOrder`）
- [ ] 新文章出现在 `out/blog/<slug>/index.html`
- [ ] 改了 `lib/` 或类型枚举时跑 `npm test` 与 `npx tsc --noEmit`
- [ ] 公式类文章额外跑 `--check-output`，要求 `katex-error` 为 **0**

### 属于「正常」的现象，不要浪费时间修

- 留言页 / 评论区显示「评论系统未配置」—— Waline 后端未部署，符合预期
- Windows 本地构建后预览出现一批 `/blog/__next.blog.__PAGE__.txt` 404 ——
  Next.js 在 Windows 与 Linux 下的 RSC 载荷命名差异，只影响客户端预取，
  导航功能正常。CI 在 ubuntu 上构建，产物正确
- `npm test` 报 `spawn EPERM` —— 是沙箱/权限限制，不是测试失败

---

## 6. 当前内容状态

| slug | 标题 | 类型 | 系列 |
|---|---|---|---|
| `math-analysis` | 数学分析 · 章节索引 | 数学 | — |
| `math-analysis-seminar-01..06,08` | 数学分析 第 N 次讨论班补充 | 数学 | 数学分析讨论班补充 |
| `numerical-analysis` | 数值分析初步 · 章节索引 | 算法 | 数值分析初步 |
| `numerical-analysis-01..09` | 数值分析初步 第 N 章 | 算法 | 数值分析初步 |
| `abstract-algebra` | 抽象代数 · 章节索引 | 数学 | 抽象代数 |
| `abstract-algebra-ch01..ch05` | 抽象代数 第 N 章（预备知识 / 群论 / 环论 / 域论 / 综合例题） | 数学 | 抽象代数 |
| `general-physics-1` | 普通物理（一）复习笔记 | 数学 | — |
| `latex-math` | LaTeX 公式测试 | 数学 | — |
| `writing-guide` | 写作指南 — 从 Hexo 迁移到 Next.js 模板 | 技术 | — |

> 模板自带的 `hello-world` 与 `syntax-test` 已按作者要求删除。

**待办**：`E:\pdf workspace\` 下只剩**测度论**未转换（仅转录到原扫描件第 1–6 页，
需先补齐转录）。流程与工具见 `tools/latex-to-blog.md`。

**状态会过期** —— 动手前先跑一遍验证命令确认现状，别完全信这张表。

---

## 7. 从 Hexo 迁移的历史（避免重复踩坑）

本站原为 Hexo + Butterfly，已整体迁移到 Next.js 模板。相关教训：

| 坑 | 说明 |
|---|---|
| 主题配置写在根 `_config.yml` 不生效 | Hexo 特性，**已无意义**（不再用 Hexo） |
| `{% fold %}` 报 unknown block tag | Hexo 的 Butterfly 5.x 改名 `hideToggle`，**已无意义** |
| 模板自带 `deploy.yml` 与旧 `pages.yml` 并存过 | 已删除旧工作流，**只保留 `ci.yml` + `deploy.yml`** |
| Pages 的 Source 必须是 `GitHub Actions` | 否则 `configure-pages` 报 404 |
| 迁移中曾用 `robocopy /MIR` 清空工作区 | 见硬约束 ④ |

`tools/latex-to-blog.md` 保留了 Hexo 时代的宏兼容性实测数据，**仍然有效**
（KaTeX 的行为与框架无关）。
