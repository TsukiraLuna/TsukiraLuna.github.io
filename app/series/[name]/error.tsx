"use client";

import { ErrorFallback } from "@/components/layout/ErrorFallback";

export default function SeriesDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorFallback
      error={error}
      reset={reset}
      title="系列加载失败"
      description="无法加载该系列的章节列表，请稍后重试。"
    />
  );
}
