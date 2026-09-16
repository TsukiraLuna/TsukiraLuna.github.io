# 博客仓库交接说明

> 给接手这个仓库的 AI 助手看。读完这一份，你就能安全地改内容、发文章、部署。
>
> 仓库：`TsukiraLuna/TsukiraLuna.github.io` ｜ 站点：<https://tsukiraluna.github.io>
> 本地路径：`F:\blog TsukiraLuna`

本文件是**面向 AI 的操作摘要**，不是模板官方文档。模板自带的 `README.md`、
`CLAUDE.md`、各目录 `AGENTS.md` 更详细且优先级更高，**动手前请先读它们**。

---

## 一、这是什么

Next.js 16 静态导出的个人博客，由 Hexo + Butterfly 迁移而来。
作者是数学专业学生，内容以**数学、算法、普通物理**为主，会大量使用 LaTeX 公式。

| 项 | 值 |
|---|---|
| 框架 | Next.js 16.2.6（App Router，`output: "export"`） |
| 运行时 | React 19.2.4 |
| 样式 | Tailwind CSS v4 + `@tailwindcss/typography` |
| 公式 | `remark-math` + `rehype-katex`，**构建期渲染，零运行时 JS** |
| 代码高亮 | Shiki + `rehype-pretty-code` |
| 主题 | 双主题，按访客本地时间自动切换（06:00–17:59 日间） |
| 搜索 | 构建期生成索引 + `Ctrl/Cmd + K` |
| 评论 | Waline（**未配置**，留言页显示「未配置」提示，属正常） |
| 部署 | GitHub Actions → GitHub Pages |

---

## 二、必须知道的硬约束

按重要性排序，**前三条最容易出错**：

### 1. 推送到 GitHub 只能用 SSH

作者所在网络**阻断 `github.com` 的 443 端口**，HTTPS 推送必然超时：

```
fatal: unable to access 'https://github.com/...': Failed to connect to github.com:443
```

remote 已配好 SSH，**不要改成 HTTPS**：

```powershell
git remote -v
# origin  git@github.com:TsukiraLuna/TsukiraLuna.github.io.git
```

若 SSH 也抽风，备用方案见 `README.md`（SSH 备用端口 443）。

### 2. `next build` 与 `next dev` 不能同时跑

两者共用 `.next` 目录。在 dev server 运行时执行构建会污染增量编译状态，
此后**部分路由永久挂起**——症状极具迷惑性：首页正常，某个子页卡死 90 秒。
遇到就先停 dev，删掉 `.next` 再重启。

### 3. frontmatter 写错会**静默剔除整篇文章**

构建**不会失败**，只是那篇文章从站点消失，日志里有一行 `frontmatter 校验失败`。

| 字段 | 约束 |
|---|---|
| `title` | 必填，**值必须用双引号**（含 `:` `—` 等字符时尤其） |
| `pubDate` | 必填，`YYYY-MM-DD`。写错不报错，会被归一化成 `1970-01-01` |
| `category` | 见下方枚举，**写非法值 = 整篇剔除** |
| `tocDepth` | 只能 `1` / `2` / `3`，默认 `2` |
| `updatedDate` | 可选。填了才显示「更新于」，否则回退为 `pubDate` |

**`category` 只能取这 8 个之一**（`lib/constants.ts` 的 `POST_CATEGORIES`）：

```
数学  算法  技术  生活  观点  随笔  游戏  测试
```

> 这是本站点定制的枚举（作者是数学专业，数学与算法排在首位）。
> 新增类型必须**同时**改 `POST_CATEGORIES`（数组）和 `CATEGORY_UI`（图标/配色映射），
> 少改一处 `tsc` 就会报错——这是好事，别绕过它。

### 4. 不要用 `robocopy /MIR`

一次误操作曾把整个工作区（含 `.git`）清空。`/MIR` 会删除目标端"多余"的文件。
**复制用 `/E`，删除用 `Remove-Item`**，任何批量操作前先把 `.git` 备份到工作区外。

### 5. 不要在用户主目录执行 git 命令

`git add .` 的 `.` 是当前目录。在 `C:\Users\Rakari` 执行会把整个用户目录纳入仓库。

---

## 三、目录导览

```
content/blog/<slug>/index.mdx    ← 文章。一篇文章 = 一个目录 + index.mdx
public/blog/<slug>/              ← 文章配图（不是 content/ 下！）
app/                             ← 路由页面
components/                      ← React 组件
lib/constants.ts                 ← ★ 文章类型枚举与配色
lib/content.ts                   ← ★ 内容读取核心
lib/mdx.ts                       ← ★ MDX 插件链
lib/schemas.ts                   ← frontmatter 的 Zod 校验
site.config.mjs                  ← ★ 站点身份唯一来源
.env.local                       ← NEXT_PUBLIC_SITE_URL（已被 gitignore）
tools/latex-to-blog.md           ← LaTeX 转化流程
tools/latex-to-blog-probe.mjs    ← LaTeX 探雷脚本
.github/workflows/deploy.yml     ← 推送 main 即部署
```

**站点身份改 `site.config.mjs`，不要去改 `lib/site.ts`**（它只是读取入口）。
其中 `name` 与 `ogTagline` 是**烧进分享图 PNG 像素**的——改了必须重跑 `npm run og`，
其他地方会自动更新，只有图片不会。

---

## 四、常用命令

```powershell
npm run dev            # 本地预览 http://localhost:3000（会先生成搜索索引）
npm run build:verify   # 快速构建验证（跳过 Waline 保活），产物在 out/
npm run build          # 完整发布路由
npm test               # vitest，47 个测试
npx tsc --noEmit       # 类型检查
npm run lint           # ESLint
npm run og             # 重新生成分享图（改了站名/标语后必须跑）
```

**发布的完整流程**：

```powershell
# 1. 写文章
#    content/blog/<slug>/index.mdx
# 2. 本地验证（两步都要）
npm run build:verify
# 3. 提交推送
git add content/blog/<slug>
git commit -m "content: 新增<标题>"
git push
```

推送后 GitHub Actions 自动构建部署，1–2 分钟后生效。到仓库 **Actions** 标签页看绿勾。

---

## 五、写文章的要点

### 文件结构

```
content/blog/my-post/
└── index.mdx
```

目录名即 URL slug，建议 kebab-case。

### frontmatter 模板

```yaml
---
title: "文章标题"
pubDate: 2026-09-16
description: "一句话摘要，用于列表卡片与 SEO"
tags: ["标签1", "标签2"]
category: 数学
tocDepth: 2
---
```

### 配图

图片放 `public/blog/<slug>/`，正文用绝对路径。**`content/` 下的文件不会被服务**：

```markdown
![示意图](/blog/my-post/diagram.png)
```

### 跨文章链接必须用绝对路径

模板**不会**自动改写文章间的相对链接，`[x](../other/index.mdx)` 会 404。要写：

```markdown
[另一篇文章](/blog/other-post/)
```

### LaTeX 公式

```markdown
行内：$E = mc^2$
块级：
$$
\int_{-\infty}^{\infty} e^{-x^2}\,\mathrm{d}x = \sqrt{\pi}
$$
```

**`$$` 与公式内容之间不要留空行。** 详细规则与陷阱见
[`tools/latex-to-blog.md`](./latex-to-blog.md)。

---

## 六、验证清单

改完内容后，**至少**确认这几项：

- [ ] `npx tsc --noEmit` 退出码 0
- [ ] `npm test` 全绿（改了 `lib/` 或类型枚举时必跑）
- [ ] `npm run build:verify` 成功，且**日志里没有 `frontmatter 校验失败`**
- [ ] 新文章出现在 `out/blog/<slug>/index.html` 与首页列表
- [ ] 公式类文章额外跑：`node tools/latex-to-blog-probe.mjs --check-output <slug>`
      要求 `katex-error` 为 **0**
- [ ] 站内搜索已收录（`out/search-index.json` 里有该 slug）

### 已知的"正常"警告

以下现象**不是问题**，不要浪费时间修：

- 留言页 / 评论区显示「评论系统未配置」——Waline 后端未部署，符合预期
- Windows 本地构建后预览出现一批 `/blog/__next.blog.__PAGE__.txt` 404——
  Next.js 在 Windows 与 Linux 下的 RSC 载荷命名差异，仅影响客户端预取，
  导航功能正常。CI 在 ubuntu 上构建，产物正确
- `npm test` 若报 `spawn EPERM`，是沙箱/权限限制，不是测试失败

---

## 七、本仓库的来历与教训

从 Hexo + Butterfly 整体迁移过来。迁移过程中踩过的坑已写入
`tools/latex-to-blog.md` 与本节，**不要重复踩**：

| 坑 | 教训 |
|---|---|
| `robocopy /MIR` 清空了工作区 | 批量删除前先备份 `.git`；`/MIR` 只用于确认无副作用时 |
| Hexo 的 `pages.yml` 与模板 `deploy.yml` 并存 | 已删除旧工作流，**只保留 `ci.yml` + `deploy.yml`** |
| 首次部署 `configure-pages` 报 404 | Pages 的 Source 必须是 `GitHub Actions` |
| 模板自带示例文章已删 | `hello-world` 与 `syntax-test` 都已移除。模板的 `content/AGENTS.md` 原本建议保留 `syntax-test` 作为渲染基准文章，作者选择不保留 |
| `category` 枚举改动会连带影响文章 | 改枚举前先 grep 现有文章的 `category:` 值 |

---

## 八、当前内容状态

| slug | 标题 | 类型 |
|---|---|---|
| `math-analysis` | 数学分析 · 章节索引 | 数学 |
| `latex-math` | LaTeX 公式测试 | 数学 |
| `writing-guide` | 写作指南 — 从 Hexo 迁移到 Next.js 模板 | 技术 |
| `general-physics-1` | 普通物理（一）复习笔记 | 数学 |

作者还有一批 ElegantBook 排版的数学笔记待转换（抽象代数、数值分析初步、测度论），
**流程与工具已备好**，见下一节。

---

## 八之二、系列文章（重要）

作者用**「一篇文章 = 一章」+ 共享标签**组织长内容（如数学分析）。
**约定与坑见 [`series-convention.md`](./series-convention.md)，新开一章前必读。**

三个必须先知道的结论：

1. **目录不能嵌套**。`lib/content.ts:368` 是单层 `readdir`，
   `content/blog/数学分析/第一章/index.mdx` 会被**完全忽略**。每章必须是
   `content/blog/<slug>/index.mdx`
2. **`/tags/<系列名>/` 里顺序是发布时间倒序**，不是章节顺序。
   `getPostsByTag`（`content.ts:421`）只过滤不排序，继承 `getAllPostMeta` 的降序。
   **这是 tag 方案的固有短板，配置改不了**
3. **严格顺序靠手动维护**：索引页的表格 + 每章首尾的「上一章/下一章」链接。
   模板**不会**改写文章间相对链接，导航必须用 `/blog/<slug>/` 绝对路径

标签不需要注册——`generateStaticParams` 从 frontmatter 自动收集，
写了 `tags: ["数学分析"]` 就会生成 `/tags/数学分析/` 页面。

---

## 九、转换 LaTeX 讲义

见 [`tools/latex-to-blog.md`](./latex-to-blog.md)。一句话版本：

```powershell
node tools/latex-to-blog-probe.mjs "<file.tex>"   # 1. 先探雷
# 2. 按规则表转换
npm run build:verify                               # 3. 构建
node tools/latex-to-blog-probe.mjs --check-output <slug>   # 4. 验证公式
```

**核心警告**：KaTeX 的失败是**静默的**——不认识的宏包命令、自定义宏、
不支持的环境都不会报错，只是默默渲染错。所以第 1 步和第 4 步不能省。
