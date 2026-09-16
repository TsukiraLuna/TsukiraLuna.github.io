"use client";

import { ErrorFallback } from "@/components/layout/ErrorFallback";

export default function SeriesError({
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
      description="无法加载系列数据，请稍后重试。"
    />
  );
}
