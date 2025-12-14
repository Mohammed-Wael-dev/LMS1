export default function ReviewReasonsSkeleton({
  count = 8,
  className = "",
}: {
  count?: number;
  className?: string;
}) {
  const widths = [
    "w-12",
    "w-16",
    "w-20",
    "w-24",
    "w-28",
    "w-14",
    "w-32",
    "w-18",
  ];
  return (
    <div className={`grid grid-cols-2 gap-3 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={`reason-skel-${i}`}
          className="p-3 rounded-lg border-2 animate-pulse border-gray-200 text-gray-700 dark:border-gray-700 dark:text-gray-300"
          aria-hidden="true"
        >
          <div
            className={`h-4 rounded bg-gray-200 dark:bg-gray-700 ${
              widths[i % widths.length]
            }`}
          />
        </div>
      ))}
    </div>
  );
}
