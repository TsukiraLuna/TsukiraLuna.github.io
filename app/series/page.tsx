import { getAllSeries } from "@/lib/content";
import { site, absoluteUrl } from "@/lib/site";
import { PageShell } from "@/components/layout/PageShell";
import { PageTitle } from "@/components/layout/PageTitle";
import { FadeUp } from "@/components/ui/FadeUp";
import { Layers } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "系列",
  description: `${site.name}的博客系列合集，按阅读顺序组织`,
  alternates: { canonical: absoluteUrl("/series/") },
};

/**
 * 系列列表页。
 *
 * 与标签页的区别：标签是宽泛的主题词，系列是**有序的**一组文章
 * （教程、教材章节等），系列内顺序由 frontmatter 的 `seriesOrder` 决定。
 */
export default async function SeriesListPage() {
  const series = await getAllSeries();

  return (
    <PageShell>
      <section className="py-16 md:py-24 px-4">
        <div className="mx-auto max-w-4xl">
          {/* Section Header */}
          <div className="space-y-3 border-b border-borderline pb-8 mb-10">
            <div className="flex items-center gap-4">
              <div className="w-1 h-6 rounded-full bg-primary/60" />
              <div>
                <span className="text-caption text-muted uppercase tracking-wider">
                  Series
                </span>
                <PageTitle className="mt-1">系列</PageTitle>
              </div>
            </div>
            <p className="text-muted max-w-2xl">
              成体系的长内容按阅读顺序组织，适合从头读到尾
            </p>
          </div>

          {/* Series Count */}
          <div className="flex items-center gap-2 text-body-sm text-muted mb-8">
            <Layers className="w-4 h-4" />
            <span>共 {series.length} 个系列</span>
          </div>

          {series.length > 0 ? (
            <FadeUp>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {series.map(({ name, count }) => (
                  <Link
                    key={name}
                    href={`/series/${encodeURIComponent(name)}`}
                    className="group flex items-center justify-between gap-4 p-5 rounded-xl bg-card border border-borderline hover:border-primary/30 hover:bg-hover transition-all duration-200"
                  >
                    <span className="flex items-center gap-3 min-w-0">
                      <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary-strong shrink-0">
                        <Layers className="w-5 h-5" strokeWidth={1.5} />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-title font-medium font-serif truncate group-hover:text-primary transition-colors">
                          {name}
                        </span>
                        <span className="block mt-0.5 text-caption text-muted">
                          {count} 章
                        </span>
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            </FadeUp>
          ) : (
            <div className="text-center py-20">
              <p className="text-muted">暂无系列</p>
              <p className="text-caption text-muted mt-2">
                在文章的 frontmatter 里写 series 与 seriesOrder 即会出现在这里
              </p>
            </div>
          )}
        </div>
      </section>
    </PageShell>
  );
}
