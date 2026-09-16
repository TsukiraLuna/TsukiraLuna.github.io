import { getAllSeries, getPostsBySeries } from "@/lib/content";
import { site, absoluteUrl, normalizeRouteParam } from "@/lib/site";
import { PageShell } from "@/components/layout/PageShell";
import { PageTitle } from "@/components/layout/PageTitle";
import { BackLink } from "@/components/layout/BackLink";
import { JsonLd } from "@/components/layout/JsonLd";
import { FadeUp } from "@/components/ui/FadeUp";
import { Layers, Clock, Calendar, ArrowRight } from "lucide-react";
import Link from "next/link";

/**
 * 系列路由参数需经 `normalizeRouteParam` 规范化后再用于数据查找 —— 渲染时
 * `params.name` 是 URL 编码值（`%E6%95%B0...`），而 `getAllSeries()` 返回明文，
 * 不规范化会导致系列页恒为空。原因详见 `lib/site.ts` 的 `normalizeRouteParam`。
 * 写进 canonical 的 URL 仍需 `encodeURIComponent`，与 `app/sitemap.ts` 一致。
 */

export async function generateStaticParams() {
  const series = await getAllSeries();
  return series.map(({ name }) => ({ name }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  const posts = await getPostsBySeries(name);
  return {
    title: `系列：${name}`,
    description: `${site.name}的「${name}」系列，共 ${posts.length} 章，按阅读顺序排列`,
    alternates: {
      canonical: absoluteUrl(`/series/${encodeURIComponent(name)}/`),
    },
  };
}

export default async function SeriesPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name: rawName } = await params;
  const name = normalizeRouteParam(rawName);
  const chapters = await getPostsBySeries(name);

  const totalMinutes = chapters.reduce((sum, p) => sum + p.readingTime, 0);

  return (
    <PageShell>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: name,
          numberOfItems: chapters.length,
          itemListElement: chapters.map((post, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: post.title,
            url: absoluteUrl(`/blog/${post.slug}/`),
          })),
        }}
      />
      <section className="py-16 md:py-24 px-4">
        <div className="mx-auto max-w-4xl">
          <BackLink href="/series">返回系列列表</BackLink>

          {/* Section Header */}
          <div className="space-y-3 border-b border-borderline pb-8 mb-10">
            <div className="flex items-center gap-4">
              <div className="w-1 h-6 rounded-full bg-primary/60" />
              <div className="flex items-center gap-3 min-w-0">
                <Layers className="w-5 h-5 text-primary shrink-0" />
                <div className="min-w-0">
                  <span className="text-caption text-muted uppercase tracking-wider">
                    Series
                  </span>
                  <PageTitle className="mt-1">{name}</PageTitle>
                </div>
              </div>
            </div>
            <p className="text-muted flex flex-wrap items-center gap-x-4 gap-y-1">
              <span>共 {chapters.length} 章</span>
              {totalMinutes > 0 && (
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  约 {totalMinutes} 分钟读完
                </span>
              )}
            </p>
          </div>

          {/* Chapter List — 按 seriesOrder 排序，编号即阅读顺序 */}
          {chapters.length > 0 ? (
            <ol className="space-y-3">
              {chapters.map((post, i) => (
                <FadeUp key={post.slug} delay={Math.min(i * 60, 360)}>
                  <li>
                    <Link
                      href={`/blog/${post.slug}`}
                      className="group flex items-start gap-4 p-5 rounded-xl bg-card border border-borderline hover:border-primary/30 hover:bg-hover transition-all duration-200"
                    >
                      <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 text-primary-strong text-sm font-mono shrink-0">
                        {i + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5 text-title font-medium font-serif group-hover:text-primary transition-colors">
                          <span className="truncate">{post.title}</span>
                          <ArrowRight className="w-3.5 h-3.5 shrink-0 text-muted opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
                        </span>
                        {post.description && (
                          <span className="block mt-1.5 text-body-sm text-muted line-clamp-2">
                            {post.description}
                          </span>
                        )}
                        <span className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-caption text-muted">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {post.pubDate}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {post.readingTime} 分钟
                          </span>
                          {post.seriesOrder === undefined && (
                            <span className="text-warning">
                              未写 seriesOrder，排在末尾
                            </span>
                          )}
                        </span>
                      </span>
                    </Link>
                  </li>
                </FadeUp>
              ))}
            </ol>
          ) : (
            <div className="text-center py-20">
              <p className="text-muted">该系列下暂无文章</p>
            </div>
          )}
        </div>
      </section>
    </PageShell>
  );
}
