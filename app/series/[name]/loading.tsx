export default function SeriesLoading() {
  return (
    <div className="py-16 md:py-24 px-4">
      <div className="mx-auto max-w-4xl">
        {/* Header skeleton */}
        <div className="space-y-3 border-b border-borderline pb-8 mb-10">
          <div className="flex items-center gap-4">
            <div className="w-1 h-6 rounded-full bg-primary/60" />
            <div>
              <div className="h-3 w-16 bg-skeleton rounded mb-2" />
              <div className="h-8 w-32 bg-skeleton rounded" />
            </div>
          </div>
        </div>

        {/* Chapter list skeleton */}
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex items-start gap-4 p-5 rounded-xl bg-card border border-borderline"
            >
              <div className="w-9 h-9 rounded-lg bg-skeleton shrink-0" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-5 bg-skeleton rounded w-2/3" />
                <div className="h-3 bg-skeleton rounded w-full" />
                <div className="h-3 bg-skeleton rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
