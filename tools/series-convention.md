# 系列文章写作约定

本站用 **series 机制**组织成体系的长内容（数学分析、抽象代数等）：
一篇文章 = 一章，系列页与章节导航**自动按 `seriesOrder` 排序**，无需手写链接。

---

## 三个浏览入口的分工

| 入口 | 排序 | 用途 |
|---|---|---|
| `/series/<系列名>/` | **按 `seriesOrder`** | 从头通读。文章页也会显示系列目录与上一章/下一章 |
| `/tags/<标签>/` | 按发布时间倒序 | 跨系列按主题找文章（tag 与 series 是两套独立维度） |
| `/archive/` | 按年月 | 按时间回看 |

**series 与 tag 的区别**：tag 是宽泛主题词，聚合页只能按时间倒序；
series 表达**有序的一组文章**，顺序由你显式指定，与发布日期无关。

---

## frontmatter

```yaml
---
title: "数学分析 第一章 实数与函数"
pubDate: 2026-09-20
updatedDate: 2026-09-20
description: "数学分析第一章笔记：实数系、确界原理、函数概念。"
tags: ["数学分析", "实数理论"]
category: 数学
series: 数学分析
seriesOrder: 10
tocDepth: 2
---
```

| 字段 | 说明 |
|---|---|
| `series` | 系列名，同一系列的文章写**完全相同**的值 |
| `seriesOrder` | **数字**（不是字符串）。升序排列，决定系列页顺序与上下章导航 |
| `tags` | 建议第一项写系列名，方便从标签页也能摸到这一组文章 |
| `title` | **把章号写进标题** —— 标签页与搜索结果只显示标题不显示日期，标题带章号才认得出顺序 |

### `seriesOrder` 的三条规矩

1. **用 10、20、30 留间隔**，方便以后在两章之间插入新章而不必重排全部
2. **必须写数字**：`seriesOrder: 10` ✅ ／ `seriesOrder: "10"` ❌（后者是字符串，校验不通过）
3. **没有序号的章节排到系列末尾**，且会在系列页标注「未写 seriesOrder」、构建时打印告警。
   这是刻意的 —— 漏写是错误而非意图，让它显眼比默默插到最前面更容易发现

---

## 索引页（可选）

如果某一章想承载导读文字，可以让它作为系列的第一章（`seriesOrder` 设成比其它章都小，如 `0`），
于是它自动成为系列页的第一项。**不需要**手写章节链接表。

示例见 `content/blog/math-analysis/index.mdx`。

---

## 命名约定

| 项 | 约定 | 例 |
|---|---|---|
| 目录 / slug | `<系列简称>-ch<章号>`，章号**补零** | `math-analysis-ch01` |
| 索引页 slug | 无章号后缀 | `math-analysis` |
| 系列名 | 与 `series` 字段一致 | `数学分析` |
| 大类 | 统一 `category` | `数学` |

章号补零的理由：虽然排序已由 `seriesOrder` 决定、不再依赖字符串序，
但补零让 slug 在文件管理器与 git 输出里也是自然顺序，减少误读。

---

## 新建一章

1. 建目录 `content/blog/<slug>/`，放 `index.mdx`
2. 按上面模板写 frontmatter（**`series` 与 `seriesOrder` 都要写**）
3. **正文里不需要手写上下章链接** —— 页面会自动渲染系列导航
4. 构建验证
5. `git add` + `commit` + `push`

配图（若有）放 `public/blog/<slug>/`，**不是** content 目录下。

---

## 自检

```powershell
npm run build:verify
```

检查：

- [ ] 日志**没有** `[content] frontmatter 校验失败，该文章已被跳过：<slug>`
- [ ] 日志**没有** `[content] 系列「X」的排序信息不完整` —— 有就说明漏写或重复了 `seriesOrder`
- [ ] `out/blog/<slug>/index.html` 存在，且页面里有「上一章 / 下一章」导航
- [ ] `out/series/<系列名>/index.html` 里本章位置正确

公式多的章节额外跑：

```powershell
node tools/latex-to-blog-probe.mjs --check-output <slug>
```

要求 `katex-error` 为 **0**。

---

## 实现位置（改动逻辑时看这里）

| 关注点 | 位置 |
|---|---|
| `series` / `seriesOrder` 校验 | `lib/schemas.ts` |
| 字段类型 | `lib/types.ts` 的 `Post` / `PostMeta` |
| 排序与聚合 | `lib/content.ts` 的 `compareSeriesOrder` / `getPostsBySeries` / `getAllSeries` / `getAdjacentSeriesPosts` |
| 系列页 | `app/series/page.tsx`、`app/series/[name]/page.tsx` |
| 文章页的系列导航 | `app/blog/[slug]/page.tsx` |
| 导航菜单入口 | `components/layout/nav-data.ts` |
| sitemap 收录 | `app/sitemap.ts` |

> ⚠️ 动态路由页面（`[name]`、`[tag]`）**必须**用 `normalizeRouteParam()` 规范化 `params`。
> 渲染时 Next 给的是 URL 编码值，不规范化会导致含中文的路由段查库恒为空 —— 且完全不报错。
> 详见 `app/AGENTS.md` 第 8 条。
