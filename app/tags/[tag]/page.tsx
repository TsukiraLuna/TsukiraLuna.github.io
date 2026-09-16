import { getAllTags, getPostsByTag } from "@/lib/content";
import { site, absoluteUrl, normalizeRouteParam } from "@/lib/site";
import { PostCard } from "@/components/blog/PostCard";
import { PageShell } from "@/components/layout/PageShell";
import { PageTitle } from "@/components/layout/PageTitle";
import { FadeUp } from "@/components/ui/FadeUp";
import { Hash } from "lucide-react";
import { BackLink } from "@/components/layout/BackLink";

/**
 * 标签路由参数需要经 `normalizeRouteParam` 规范化后再用于数据查找。
 *
 * `generateStaticParams` 返回明文，但**渲染时** `params.tag` 是 URL 编码值
 * （中文标签会变成 `%E6%95%B0...`），直接查库恒为 0 条 —— 表现为
 * `/tags/数学分析/` 显示「0 篇文章」，而 `/tags/LaTeX/` 正常。
 * 详见 `lib/site.ts` 的 `normalizeRouteParam` 注释。
 *
 * 注意：**不要**在 `generateMetadata` 里再解一次，那里的 params 已是明文，
 * 重复解码对含裸 `%` 的标签会抛 `URIError` 导致构建失败。
 */

export async function generateStaticParams() {
  const tags = await getAllTags();
  return tags.map(({ tag }) => ({ tag }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tag: string }>;
}) {
  const { tag } = await params;
  return {
    title: `标签：${tag}`,
    description: `${site.name}的博客中带有「${tag}」标签的文章`,
    alternates: {
      canonical: absoluteUrl(`/tags/${encodeURIComponent(tag)}/`),
    },
  };
}

export default async function TagPage({
  params,
}: {
  params: Promise<{ tag: string }>;
}) {
  const { tag: rawTag } = await params;
  const tag = normalizeRouteParam(rawTag);
  const posts = await getPostsByTag(tag);

  return (
    <PageShell>
      <section className="py-16 md:py-24 px-4">
        <div className="mx-auto max-w-4xl">
          <BackLink href="/tags">返回标签列表</BackLink>

          {/* Section Header */}
          <div className="flex items-center gap-4 mb-8">
            <div className="w-1 h-6 rounded-full bg-primary/60" />
            <div className="flex items-center gap-3">
              <Hash className="w-5 h-5 text-primary" />
              <PageTitle>{tag}</PageTitle>
              <span className="text-body-sm text-muted">
                {posts.length} 篇文章
              </span>
            </div>
          </div>

          {/* Post Grid */}
          {posts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map((post, i) => (
                <FadeUp
                  key={post.slug}
                  delay={Math.min(i * 80, 400)}
                  className="h-full"
                >
                <PostCard
                  slug={post.slug}
                  title={post.title}
                  pubDate={post.pubDate}
                  description={post.description}
                  tags={post.tags}
                  readingTime={post.readingTime}
                />
                </FadeUp>
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <p className="text-muted">该标签下暂无文章</p>
            </div>
          )}
        </div>
      </section>
    </PageShell>
  );
}
