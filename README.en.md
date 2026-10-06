# TsukiraLuna

**English** · [中文](./README.md)

[![Next.js](https://img.shields.io/badge/Next.js-16.2.6-black?logo=next.js)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19.2.4-087ea4?logo=react)](https://react.dev)
[![Tailwind](https://img.shields.io/badge/Tailwind-v4-38bdf8?logo=tailwindcss)](https://tailwindcss.com)
[![License](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)

> **月夜下的旅人** ("a traveller under the moonlit night") — mathematics, and more than mathematics.
>
> Live site: <https://tsukiraluna.github.io>

Source repository for a personal blog. The content is mostly **mathematics and algorithms**
(abstract algebra, measure theory, numerical analysis, optimization), with some general physics,
technical notes and essays alongside. Most posts are transcribed from handwritten notes typeset in
ElegantBook, so the formula density is high — roughly 1900 mathematical formulas site-wide.

The site is built on [wanrenhuifu/nextjs-blog-template](https://github.com/wanrenhuifu/nextjs-blog-template)
(MIT), with substantial changes to the content and tooling. See "Changes from the template" below.

> The site's UI text is in Chinese, and so is every author-facing doc (`CLAUDE.md`, the
> per-directory `AGENTS.md` files, and the guides in `tools/`). This English README covers the
> architecture, workflow and deployment; for anything deeper, the Chinese files are the reference.

## Stack

| Layer | Technology |
|------|------|
| Framework | Next.js 16.2.6 (App Router, `output: "export"` static export) |
| Runtime | React 19.2.4 |
| Styling | Tailwind CSS v4 (CSS-first, no `tailwind.config.js`) + `@tailwindcss/typography` |
| Math | `remark-math` + `rehype-katex` — **rendered to HTML at build time, zero runtime JS** |
| Code highlighting | Shiki + `rehype-pretty-code` |
| Fonts | System font stacks only, **no web fonts** (loading a CJK webfont costs far more than it returns) |
| Theme | `next-themes`; light "bamboo grove" / dark "starry night", switching automatically on the visitor's local time |
| Animation | Framer Motion |
| Icons | Lucide React |
| Validation | Zod (frontmatter and JSON data) |
| Tests | Vitest |
| Deployment | GitHub Actions → GitHub Pages |
| Comments | Waline — **not deployed in this repo**; the guestbook showing "comments not configured" is expected |

## Content

**48 posts**, organised into 6 series plus a few standalone articles. Chapters inside a series are
ordered by `seriesOrder`, not by publication date.

| Series | Posts | Category | Topics |
|---|---|---|---|
| 抽象代数 (Abstract Algebra) | 5 | 数学 | Prerequisites, group theory, ring theory, field theory, worked problems |
| 测度论 (Measure Theory) | 6 | 数学 | Set classes and measures, measurable mappings, integration and $L^p$, product spaces, Hausdorff spaces, review problems |
| 高级数值分析 (Advanced Numerical Analysis) | 7 | 算法 | Function approximation, numerical integration, ODE solvers, matrix eigenvalues, linear and nonlinear iterative solvers, review problems |
| 优化问题数值方法 (Numerical Methods for Optimization) | 5 | 算法 | Optimization fundamentals, unconstrained optimization, constrained optimization, ODE control optimization, review problems |
| 数值分析初步 (Introductory Numerical Analysis) | 9 | 算法 | Error and significant digits, interpolation and approximation, numerical integration, direct and iterative linear solvers, ODE solvers |
| 数学分析讨论班补充 (Mathematical Analysis Seminar Supplements) | 7 | 数学 | Integration techniques, converse of Lagrange's theorem, integrability, improper integrals and series convergence |

Standalone posts: `general-physics-1` (general physics revision notes), `latex-math` (formula
rendering test), `writing-guide` (notes on migrating this blog from Hexo).

Post sources live in `content/blog/<slug>/index.mdx`; their images live in `public/blog/<slug>/`.

## Local development

Requires **Node ≥ 20.19** (see `engines` in `package.json`).

```bash
npm install
npm run dev            # → http://localhost:3000
```

Common commands:

| Command | Purpose |
|------|------|
| `npm run dev` | Dev server (`predev` generates the search index first, so search works in dev) |
| `npm run build:verify` | **Use this after content changes** — generate index + build + prune output, skipping the Waline keepalive |
| `npm run build` | The full release chain |
| `npm start` | Preview `out/` locally (same as `npx serve out`) |
| `npm test` | Unit tests (vitest, 47 of them) |
| `npx tsc --noEmit` | Type check |
| `npm run lint` | ESLint |
| `npm run og` | Regenerate the share image (**must re-run after changing the site name or tagline** — the name is burned into the PNG pixels) |
| `npm run icons` | Regenerate the site icons |
| `npm run avatars` | Fetch friends' avatars from GitHub |

> ⚠️ `next build` and `next dev` **must not run at the same time** — they share the `.next`
> directory, and running both corrupts the incremental build state. Afterwards some routes hang
> forever (the home page is fine, one subpage stalls for 90 seconds), which is extremely
> misleading to debug.

## Publishing

```powershell
npm run build:verify      # 1. always verify
git add <specific paths>  # 2. use specific paths, never `git add .`
git commit -m "content: ..."
git push                  # 3. pushing to main deploys automatically, live in 1–2 minutes
```

Pushing goes over **SSH** (`git@github.com:TsukiraLuna/TsukiraLuna.github.io.git`).

Deployment is handled by `.github/workflows/deploy.yml`. The site URL and basePath are
**derived automatically** (this repository is named `<user>.github.io`, i.e. a user site, so it
is served from the root with no basePath). The workflow runs `lint` → `tsc` → `test` before
building, so **a type error or a failing test blocks the release**.

## Writing a post

One post = one directory + one `index.mdx`:

```mdx
---
title: "抽象代数 第 2 章 群论"
pubDate: 2025-04-02
description: "群与子群、陪集与 Lagrange 定理、正规子群与商群……"
tags: ["抽象代数", "群论", "Sylow 定理"]
category: 数学          # one of 8 enum values only
series: 抽象代数        # optional, series name
seriesOrder: 20         # optional, number; ascending within a series, 10/20/30 leaves room
tocDepth: 2
---

> 本文由手写笔记《抽象代数》扫描件的 LaTeX 转录稿改写而来。

正文……
```

**`category` must be one of these 8** (`lib/constants.ts`):
`数学` `算法` `技术` `生活` `观点` `随笔` `游戏` `测试`
(mathematics, algorithms, technology, life, opinion, essays, games, tests).
A wrong value does not break the build — the post is **silently dropped** instead (the build
succeeds and the article simply disappears from the site).

Full field reference and typography rules: [`content/AGENTS.md`](./content/AGENTS.md) (Chinese).
Series conventions: [`tools/series-convention.md`](./tools/series-convention.md) (Chinese).

## Changes from the template

### 1. All content is original

The template's sample posts were removed and replaced by 48 original notes (see "Content" above).

### 2. Post category enum

`POST_CATEGORIES` in `lib/constants.ts` was customised to put **mathematics and algorithms first**:

```
数学  算法  技术  生活  观点  随笔  游戏  测试
```

(`POST_CATEGORIES` and `CATEGORY_UI` must be edited together — change only one and `tsc` fails.)

### 3. A LaTeX → blog conversion toolchain

Converting ElegantBook-typeset maths handouts into MDX is a long series of traps, so the checks
accumulated along the way were turned into runnable scripts (full rules in
[`tools/latex-to-blog.md`](./tools/latex-to-blog.md), Chinese):

| Script | Purpose |
|---|---|
| `tools/latex-to-blog-probe.mjs` | **Risk scan**: reports the `.tex` structure, theorem environments, custom macros and commands needing rewrite. `--check-output` checks the rendered output's formula health (requires `katex-error` to be 0); `--check-frontmatter` verifies every post's frontmatter parses |
| `tools/check-mdx-math.mjs` | Checks the known display-math pitfalls (`$$` not on its own line, `\textcolor` written in text mode, `$` nested inside a `\textcolor` argument). `--fix` normalises them |
| `tools/check-mdx-lists.mjs` | Checks whether a list item containing only a formula degenerated into an indented code block |
| `tools/mdx-math-quirks-probe.mjs` | Runs candidate syntax through the real plugin chain and prints what actually renders — for when something behaves strangely |

**These checks are not fussiness.** KaTeX and frontmatter failures are mostly **silent**: the build
is green, but a formula renders as a red error string, or an entire post vanishes from the site.
"Build succeeded" is therefore not evidence that the content is correct.

### 4. Two hand-drawn diagrams redrawn as SVG

The Armijo / Wolfe line-search diagrams in chapter 2 of *Numerical Methods for Optimization* were
LaTeX `tikzpicture` in the original, and tikz cannot render in KaTeX. They were redrawn as SVG in
`public/blog/optimization-numerical-methods-ch02/`.

### 5. A documentation system

The repository carries a set of rule documents aimed at AI assistants, which is the biggest
difference from a plain template: a root `AGENTS.md` as the entry point, `CLAUDE.md` for
architectural conventions, and a per-directory `AGENTS.md` recording that directory's finer rules
and pitfalls. **Keep the matching document in sync when you change code** — the mapping table is
in item 14 of `CLAUDE.md`.

## Project layout

```
app/                    # Route pages (App Router)
├── page.tsx            # Home page
├── blog/[slug]/        # Post detail (SSG)
├── series/[name]/      # Series page (ordered by seriesOrder)
├── tags/ types/ archive/   # Three index views
├── tools/ friends/ guestbook/ about/
└── sitemap.ts / robots.ts / rss.xml/route.ts

components/             # React components, grouped by domain
├── layout/             # Header / DesktopNav / MobileDrawer / Footer / PageShell
│                       #   SearchModal / ThemeToggle / TimeThemeController / …
├── blog/               # PostCard / MdxContent / TableOfContents / WalineComments
├── home/               # HeroSection / HeroScenery
└── tools/  ui/

lib/                    # Core logic (no JSX, no browser APIs)
├── content.ts          # Content reading and processing (series aggregation, image size checks)
├── site.ts             # Site identity exports + normalizeRouteParam(), publicUrl()
├── data.ts             # Unified data layer (JSON + Zod validation + fallback)
├── constants.ts        # Post category enum and icon/colour mapping
└── schemas.ts  types.ts  mdx.ts  readingTime.ts  timeTheme.ts
    bamboo.ts   random.ts tools.ts a11y.ts

content/blog/<slug>/    # MDX sources (plain text, no images)
data/friends.json       # Friends list data
public/                 # Static assets (the only place served under static export)
├── blog/<slug>/        #   Post images and diagrams
└── cursors/  friends/avatars/

styles/                 # Design tokens and dual-theme variables (single source: theme.css)
scripts/                # Build-chain and manual asset generators
tools/                  # LaTeX conversion and MDX checks (see above)
site.config.mjs         # ★ Single source of site identity
```

## Deploying to GitHub Pages

The repository ships the workflow; pushing to `main` builds and publishes automatically.
Setting this up from scratch in a new environment requires:

1. **Settings → Pages**, set **Source** to **"GitHub Actions"**
2. Make sure Actions is enabled

Missing either one does not produce a red X: the workflow detects that Pages is not enabled,
**skips the deploy and prints a notice**, while the build and checks still run.

The site URL and basePath are **derived automatically**; this repository (a user site) needs no
configuration. All environment variables (see `.env.example`) are optional:

| Variable | Purpose | Default behaviour |
|------|------|----------|
| `NEXT_PUBLIC_SITE_URL` | Site root URL, used for canonical / sitemap / RSS / JSON-LD | Falls back to `https://example.com` and prints a build warning |
| `NEXT_PUBLIC_BASE_PATH` | Sub-path prefix, only needed for project-page deployments | Assumes deployment at the root |
| `NEXT_PUBLIC_WALINE_SERVER_URL` | Waline comment backend | The comments area shows "comments not configured" |

> **The sub-path trap**: if the site is served from a sub-path, both `SITE_URL` and `BASE_PATH`
> must be set correctly — omitting the latter produces a **completely blank page**. Also note that
> Next does **not** rewrite bare-string asset references; this project routes them all through
> `publicUrl()` in `lib/site.ts`. When adding code that references anything under `public/`, wrap
> it the same way, or it will 404 silently under a sub-path.

## Known difference: building on Windows

**After `npm run build` on Windows, previewing locally produces a batch of 404s**
(like `/blog/__next.blog.__PAGE__.txt`). Verified on Next 16.2.6:

| Build environment | RSC payload filename produced |
|----------|----------------------|
| Linux (incl. GitHub Actions) | `__next.blog.__PAGE__.txt` (flat file) — the name clients prefetch |
| Windows | `__next.blog/__PAGE__.txt` (directory form) |

These files serve **client-side prefetching**. Missing them only means prefetch misses and link
clicks fall back to a full page load — **navigation itself works fine**. CI builds on ubuntu, where
the output is correct, so there is nothing to fix. If you want to avoid the 404s while previewing
on Windows, use `npm run dev` instead.

## Accessibility

- Both the light and dark palettes meet WCAG AA contrast
- Fully keyboard navigable: skip-to-content link, visible focus rings, 44px touch targets
- Overlays (search modal, mobile drawer) use `role="dialog"` + `aria-modal`, trap focus inside, and
  return focus to the element that opened them
- Under `prefers-reduced-motion` all looping animations and entrance choreography are disabled
- With JavaScript disabled: the entrance animations' initial state is overridden by a `<noscript>`
  style block, so the first screen is visible as usual

## License

[MIT](./LICENSE).

The code is based on [wanrenhuifu/nextjs-blog-template](https://github.com/wanrenhuifu/nextjs-blog-template);
`LICENSE` keeps the copyright lines of both the template and this site. **The article content (the
notes under `content/`) is personal study material — please ask before reposting it.**
