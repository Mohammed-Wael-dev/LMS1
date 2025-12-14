import { useTranslation } from "react-i18next";

type PaginationProps = {
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  siblingCount?: number;
  boundaryCount?: number;
};

const DOTS = "…";

function getRange(start: number, end: number) {
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

function buildPagination(
  totalPages: number,
  page: number,
  siblingCount = 1,
  boundaryCount = 1
): Array<number | typeof DOTS> {
  if (totalPages <= 1) return [1];

  const startPages = getRange(1, Math.min(boundaryCount, totalPages));
  const endPages = getRange(
    Math.max(totalPages - boundaryCount + 1, boundaryCount + 1),
    totalPages
  );

  const leftSibling = Math.max(page - siblingCount, boundaryCount + 1);
  const rightSibling = Math.min(
    page + siblingCount,
    totalPages - boundaryCount
  );

  const showLeftDots = leftSibling > boundaryCount + 2;
  const showRightDots = rightSibling < totalPages - boundaryCount - 1;

  const middlePages = getRange(
    Math.max(leftSibling, boundaryCount + 1),
    Math.min(rightSibling, totalPages - boundaryCount)
  );

  const pages: Array<number | typeof DOTS> = [];

  pages.push(...startPages);

  if (showLeftDots) pages.push(DOTS);

  const middle = middlePages.filter(
    (p) => !startPages.includes(p) && !endPages.includes(p)
  );
  pages.push(...middle);

  if (showRightDots) pages.push(DOTS);

  endPages.forEach((p) => {
    if (!pages.includes(p)) pages.push(p);
  });

  return pages;
}

export default function Pagination({
  total,
  page,
  pageSize,
  onPageChange,
  siblingCount = 1,
  boundaryCount = 1,
}: PaginationProps) {
  const { t } = useTranslation();
  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, pageSize)));
  const current = Math.min(Math.max(1, page), totalPages);

  const items = buildPagination(
    totalPages,
    current,
    siblingCount,
    boundaryCount
  );

  if (totalPages <= 1) return null;

  return (
    <div className="mt-12 flex items-center justify-center">
      <nav
        className="flex items-center sm:space-x-2 gap-2"
        aria-label="Pagination"
      >
        {/* Prev */}
        <button
          type="button"
          className="sm:block hidden px-4 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg disabled:opacity-50"
          onClick={() => onPageChange(current - 1)}
          disabled={current <= 1}
        >
          {t("previous")}
        </button>

        {/* Page items */}
        <div className="flex items-center justify-start w-full gap-4 flex-col">
          <div className="w-full flex items-center justify-center gap-2">
            {items.map((p, idx) =>
              p === DOTS ? (
                <span
                  key={`dots-${idx}`}
                  className="px-4 py-2 text-gray-500 select-none"
                >
                  {DOTS}
                </span>
              ) : (
                <button
                  type="button"
                  key={p}
                  onClick={() => onPageChange(p as number)}
                  aria-current={p === current ? "page" : undefined}
                  className={`px-4 py-2 rounded-lg ${
                    p === current
                      ? "bg-purple-600 text-white"
                      : "text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                  }`}
                >
                  {p}
                </button>
              )
            )}
          </div>
          <div className="flex w-full items-center justify-between gap-2 sm:hidden">
            <button
              type="button"
              className="px-4 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg disabled:opacity-50"
              onClick={() => onPageChange(current - 1)}
              disabled={current <= 1}
            >
              {t("previous")}
            </button>

            <button
              type="button"
              className="px-4 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg disabled:opacity-50"
              onClick={() => {
                onPageChange(current + 1);
              }}
              disabled={current >= totalPages}
            >
              {t("next")}
            </button>
          </div>
        </div>

        {/* Next */}
        <button
          type="button"
          className="sm:block hidden px-4 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg disabled:opacity-50"
          onClick={() => {
            onPageChange(current + 1);
          }}
          disabled={current >= totalPages}
        >
          {t("next")}
        </button>
      </nav>
    </div>
  );
}
