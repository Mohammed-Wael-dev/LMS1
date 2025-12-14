type Props = {
  count?: number;
  isListView?: boolean;
  className?: string;
};

export default function CourseCardsSkeleton({
  count = 6,
  isListView = false,
  className = "",
}: Props) {
  const items = Array.from({ length: count });
  const gridCols = isListView
    ? "grid-cols-1"
    : "grid-cols-1 md:grid-cols-2 xl:grid-cols-3";

  return (
    <div
      className={`grid gap-6 ${gridCols} ${className}`}
      role="status"
      aria-label="Loading courses"
    >
      {items.map((_, i) =>
        isListView ? (
          // List-card skeleton
          <div
            key={i}
            className="animate-pulse bg-white rounded-2xl shadow p-4 flex gap-4"
          >
            <div className="w-48 h-28 bg-gray-200 rounded-xl" aria-hidden />
            <div className="flex-1 space-y-3">
              <div className="h-5 bg-gray-200 rounded w-2/3" aria-hidden />
              <div className="h-4 bg-gray-200 rounded w-1/2" aria-hidden />
              <div className="flex items-center gap-3 pt-1">
                <div className="h-4 bg-gray-200 rounded w-24" aria-hidden />
                <div className="h-4 bg-gray-200 rounded w-16" aria-hidden />
                <div className="h-4 bg-gray-200 rounded w-20" aria-hidden />
              </div>
              <div className="flex items-center justify-between pt-2">
                <div className="h-5 bg-gray-200 rounded w-24" aria-hidden />
                <div className="h-9 bg-gray-200 rounded-lg w-28" aria-hidden />
              </div>
            </div>
          </div>
        ) : (
          // Grid-card skeleton
          <div key={i} className="animate-pulse bg-white rounded-2xl shadow">
            <div
              className="aspect-video bg-gray-200 rounded-t-2xl"
              aria-hidden
            />
            <div className="p-4 space-y-3">
              <div className="h-5 bg-gray-200 rounded w-5/6" aria-hidden />
              <div className="h-4 bg-gray-200 rounded w-2/3" aria-hidden />
              <div className="flex items-center gap-3 pt-1">
                <div className="h-4 bg-gray-200 rounded w-16" aria-hidden />
                <div className="h-4 bg-gray-200 rounded w-20" aria-hidden />
              </div>
              <div className="flex items-center justify-between pt-2">
                <div className="h-5 bg-gray-200 rounded w-20" aria-hidden />
                <div className="h-9 bg-gray-200 rounded-lg w-24" aria-hidden />
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
}
