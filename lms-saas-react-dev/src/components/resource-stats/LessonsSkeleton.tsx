export default function LessonsSkeleton() {
  return (
    <div className="p-4 space-y-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse flex items-center justify-between sm:p-3 p-2 border border-gray-200 rounded-lg bg-gray-50"
        >
          <div className="flex items-center gap-3 w-full">
            <div className="w-4 h-4 bg-gray-200 rounded" />
            <div className="w-4 h-4 bg-gray-200 rounded" />
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-1/3" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gray-200 rounded" />
            <div className="w-6 h-6 bg-gray-200 rounded" />
            <div className="w-6 h-6 bg-gray-200 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
