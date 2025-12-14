import {
  Grid,
  List,
  Search,
  SlidersHorizontal,
  Filter as FilterIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import FeatureGate from "../../settings/FeatureGate";
import { useFeatureFlag } from "../../../hooks/useSettings";

type SortKey =
  | "most_popular"
  | "high_rating"
  | "newest"
  | "price_low_to_high"
  | "price_high_to_low";

interface Props {
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  sortBy: SortKey;
  setSortBy: (v: SortKey) => void;
  viewMode: "grid" | "list";
  setViewMode: (v: "grid" | "list") => void;
  onOpenFilters?: () => void;
  filterButtonRef?: React.RefObject<HTMLButtonElement>;
}

/** Reusable sort popover (used on desktop & mobile) */
function SortMenuButton({
  sortBy,
  setSortBy,
  buttonClassName = "p-2 border border-gray-300 rounded-lg text-gray-600",
  sortOptions,
}: {
  sortBy: SortKey;
  setSortBy: (v: SortKey) => void;
  buttonClassName?: string;
  sortOptions: { value: SortKey; label: string }[];
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const {
    enabled: pricingEnabled,
    isError: pricingError,
    isFetching: pricingFetching,
    isLoading: pricingLoading,
  } = useFeatureFlag("is_price_enabled", true);
  const {
    enabled: reviewsEnabled,
    isError: reviewsError,
    isFetching: reviewsFetching,
    isLoading: reviewsLoading,
  } = useFeatureFlag("is_review_enabled", true);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={buttonClassName}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Open sort"
        onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
      >
        <SlidersHorizontal className="w-5 h-5" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1"
        >
          {sortOptions.map((o) => {
            if (
              (!pricingEnabled ||
                pricingError ||
                pricingFetching ||
                pricingLoading) &&
              (o.value === "price_high_to_low" ||
                o.value === "price_low_to_high")
            ) {
              return;
            }
            if (
              (!reviewsEnabled ||
                reviewsError ||
                reviewsFetching ||
                reviewsLoading) &&
              o.value === "high_rating"
            ) {
              return;
            }
            return (
              <button
                key={o.value}
                onClick={() => {
                  setSortBy(o.value);
                  setOpen(false);
                  btnRef.current?.focus(); // return focus for a11y
                }}
                className={`block w-full ltr:text-left rtl:text-right px-3 py-2 text-sm hover:bg-gray-50 ${
                  sortBy === o.value
                    ? "text-purple-600 font-medium"
                    : "text-gray-700"
                }`}
                role="menuitem"
              >
                {o.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function CoursesSortAndSearch({
  searchQuery,
  setSearchQuery,
  sortBy,
  setSortBy,
  viewMode,
  setViewMode,
  onOpenFilters,
  filterButtonRef,
}: Props) {
  const { t } = useTranslation("courseCatalog");
  const sortOptions: { value: SortKey; label: string }[] = [
    { value: "most_popular", label: t("sort.sortOptions.most_popular") },
    { value: "high_rating", label: t("sort.sortOptions.high_rating") },
    { value: "newest", label: t("sort.sortOptions.newest") },
    {
      value: "price_low_to_high",
      label: t("sort.sortOptions.price_low_to_high"),
    },
    {
      value: "price_high_to_low",
      label: t("sort.sortOptions.price_high_to_low"),
    },
  ];

  return (
    <>
      {/* Desktop */}
      <div className="hidden lg:flex flex-col lg:flex-row items-stretch lg:items-center space-y-4 lg:space-y-0 lg:gap-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder={t("sort.search")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent w-full sm:w-64"
          />
        </div>

        {/* New Sort select */}
        <SortMenuButton
          sortBy={sortBy}
          setSortBy={setSortBy}
          sortOptions={sortOptions}
        />

        {/* Old Sort select if want to back to it */}
        {/* <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortKey)}
          className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        >
          {sortOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select> */}

        {/* View Mode (md+) */}
        <div className="hidden md:flex items-center border border-gray-300 rounded-lg">
          <button
            type="button"
            onClick={() => setViewMode("grid")}
            className={`p-2 ${
              viewMode === "grid"
                ? "bg-purple-50 text-purple-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Grid className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode("list")}
            className={`p-2 ${
              viewMode === "list"
                ? "bg-purple-50 text-purple-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <List className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Mobile */}
      <div className="lg:hidden relative flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder={t("sort.search")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>

        {/* Note that mode toggle is prevent and forced to grid below md screen */}
        <button
          type="button"
          onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
          className="md:block hidden p-2 border border-gray-300 rounded-lg text-gray-600"
          aria-label="Toggle view"
        >
          {viewMode === "grid" ? (
            <List className="w-5 h-5" />
          ) : (
            <Grid className="w-5 h-5" />
          )}
        </button>

        {/* sort*/}
        <SortMenuButton
          sortBy={sortBy}
          setSortBy={setSortBy}
          sortOptions={sortOptions}
        />

        {/* Filter icon opens drawer */}
        <FeatureGate
          flag="is_courses_filter_enabled"
          loadingFallback={null}
          fallback={null}
        >
          <button
            type="button"
            ref={filterButtonRef}
            onClick={onOpenFilters}
            className="p-2 border border-gray-300 rounded-lg text-gray-600"
            aria-label="Open filters"
          >
            <FilterIcon className="w-5 h-5" />
          </button>
        </FeatureGate>
      </div>
    </>
  );
}
