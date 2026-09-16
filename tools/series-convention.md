# 系列章节写作约定

本站用**「一篇文章 = 一章」+ 共享标签**来组织系列（如数学分析）。
本文件记录约定与坑，新开一章时照抄模板即可。

---

## 为什么不用目录嵌套

`lib/content.ts:368` 是**单层读取**：

```js
const entries = await fs.readdir(CONTENT_DIR, { withFileTypes: true });
entries.filter((e) => e.isDirectory()).map((e) => getPostBySlug(e.name))
```

`content/blog/数学分析/第一章/index.mdx` 这种嵌套**会被完全忽略**。
每章必须是 `content/blog/<slug>/index.mdx`，slug 即 URL。

## 为什么顺序要手动管

`getPostsByTag`（`lib/content.ts:421`）**只过滤不排序**，继承 `getAllPostMeta`
的「`pubDate` 降序」。所以：

> `/tags/<系列名>/` 里，**最新发布的在最前面** —— 对教程/教材类系列是反的。

这不是配置能改的，除非开发系列功能。**因此在引入系列功能前，
顺序由「索引页 + 章节内导航链接」保证。**

---

## 命名约定

| 项 | 约定 | 例 |
|---|---|---|
| 目录 / slug | `<系列简称>-ch<章号>` | `math-analysis-ch1` |
| 系列标签 | 与索引页一致的系列名 | `数学分析` |
| 索引页 slug | 无章号后缀 | `math-analysis` |
| 大类 | 统一 `category` | `数学` |

**章号用两位或不补零都可以**，但**保持一致**。补零的好处是自然排序对齐：
`ch01`、`ch02` … `ch10`。不补零时 `ch10` 会排在 `ch2` 前面（字符串序），
若将来做自动排序容易出错，**建议补零**。

---

## frontmatter 模板

```yaml
---
title: "数学分析 第一章 实数与函数"
pubDate: 2026-09-20
updatedDate: 2026-09-20
description: "数学分析第一章笔记：实数系、确界原理、函数概念。"
tags: ["数学分析", "实数理论"]
category: 数学
tocDepth: 2
---
```

要点：

- `title` **必须双引号**，且**章号写进标题**——标签页与搜索结果里只显示标题，
  不显示日期，标题带章号才能一眼认出顺序
- `tags` 第一项固定是系列名（保证聚合生效），后面可加该章的细粒度标签
- `pubDate` 建议**递增**（第一章早于第二章）。虽然它不决定系列顺序，
  但决定首页与归档的顺序，递增更符合直觉
- `updatedDate` 可省。填了才显示「更新于」

---

## 正文骨架（含导航）

每章开头放一条「系列导航」，结尾放「上一章 / 下一章」：

```markdown
> **数学分析** 系列 ｜ [返回索引](/blog/math-analysis/) ｜ 下一章：[第二章 数列极限](/blog/math-analysis-ch2/)

## 一、实数系

（正文……）

---

**上一章**：无（这是第一章） ｜ **下一章**：[第二章 数列极限](/blog/math-analysis-ch2/)
```

非首章 / 非末章就把上下链接都写上：

```markdown
---

**上一章**：[第一章 实数与函数](/blog/math-analysis-ch1/) ｜ **下一章**：[第三章 导数与微分](/blog/math-analysis-ch3/)
```

**链接必须用绝对路径** `/blog/<slug>/`。模板**不会**改写文章间的相对链接，
写 `../math-analysis-ch2/index.mdx` 会 404。

---

## 新建一章的步骤

1. 建目录 `content/blog/math-analysis-ch<N>/`，放 `index.mdx`
2. 按上面模板写 frontmatter（**`tags` 第一项写 `数学分析`**）
3. 正文首尾各加一条导航
4. 把这一章加进索引页 `content/blog/math-analysis/index.mdx` 的表格
5. 构建验证，**确认没有 `frontmatter 校验失败`**
6. `git add` + `commit` + `push`

一个章节目录的完整样子：

```
content/blog/math-analysis-ch1/
└── index.mdx
```

配图（若有）放 `public/blog/math-analysis-ch1/`，**不是** content 目录下。

---

## 自检

```powershell
npm run build:verify
```

检查三件事：

- [ ] 日志里**没有** `[content] frontmatter 校验失败，该文章已被跳过：<slug>`
- [ ] `out/blog/<slug>/index.html` 存在
- [ ] `out/tags/数学分析/index.html` 存在，且列出了新章节

公式较多时额外跑：

```powershell
node tools/latex-to-blog-probe.mjs --check-output <slug>
```

要求 `katex-error` 为 **0**。

---

## 以后想要"自动系列导航"的话

需要开发系列功能，改动面：

| 文件 | 改什么 |
|---|---|
| `lib/schemas.ts` | 加 `series` / `seriesOrder` 校验 |
| `lib/types.ts` | `Post` / `PostMeta` 加字段 |
| `lib/content.ts` | 加 `getPostsBySeries()`，按 `seriesOrder` 排序 |
| `app/blog/[slug]/page.tsx` | 渲染系列目录与上/下一章 |
| 可选 `app/series/[name]/` | 系列独立页（比 tag 页更贴合"课程"语义） |

那时就不必手写导航链接，标签页顺序问题也一并解决。
