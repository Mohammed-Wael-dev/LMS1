import { Filter, X } from "lucide-react";
import { useCustomQuery } from "../../../hooks/useQuery";
import { API_ENDPOINTS } from "../../../utils/constants";
import { useEffect, useRef, useId } from "react";
import { useTranslation } from "react-i18next";
import FeatureGate from "../../settings/FeatureGate";

type PriceFilter = "all" | "free" | "paid";

interface Props {
  setSelectedCategory: (v: string) => void;
  setSelectedLevel: (v: string) => void;
  setPriceFilter: (v: PriceFilter) => void;
  selectedCategory: string;
  selectedLevel: string;
  priceFilter: PriceFilter;
  onClearFilters: () => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
  returnFocusRef?: React.RefObject<HTMLButtonElement>;
}

interface Category {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  total_courses: number;
}

export default function CoursesFilter({
  setSelectedCategory,
  setSelectedLevel,
  setPriceFilter,
  selectedCategory,
  selectedLevel,
  priceFilter,
  onClearFilters,
  mobileOpen = false,
  onCloseMobile,
  returnFocusRef,
}: Props) {
  const { t } = useTranslation("courseCatalog");

  const { data } = useCustomQuery(API_ENDPOINTS.categories, ["categories"]);
  const categories: Category[] = data?.data;
  const wrapperRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  const desktopGroup = useId();
  const mobileGroup = useId();

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    if (mobileOpen) {
      el.removeAttribute("inert");
      setTimeout(() => closeBtnRef.current?.focus(), 0);
    } else {
      const active = document.activeElement as HTMLElement | null;
      if (active && el.contains(active)) {
        active.blur();
        returnFocusRef?.current?.focus?.();
      }
      el.setAttribute("inert", "");
    }
  }, [mobileOpen, returnFocusRef]);
  if (!categories) {
  return (
    <div className="p-4 text-gray-500 text-sm">
      Loading categories...
    </div>
  );
}
  const Body = ({ group }: { group: string }) => (
    <>
      <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
        <Filter className="w-5 h-5 ltr:mr-2 rtl:ml-2" />
        {t("filters.title")}
      </h3>

      {/* Categories */}
      <div className="mb-6">
        <h4 className="font-medium text-gray-900 mb-3">
          {t("filters.category.title")}
        </h4>
        <div className="space-y-2">
          <label className="flex items-center cursor-pointer">
            <input
              type="radio"
              name={`category_id-${group}`}
              value="all"
              checked={selectedCategory === "all"}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300"
              aria-checked={selectedCategory === "all"}
            />
            <span className="ltr:ml-3 rtl:mr-3 text-sm text-gray-700 flex-1">
              {t("filters.category.all")}
            </span>
          </label>
          {categories?.map((category) => (
            <label
              key={category.id}
              className="flex items-center cursor-pointer"
            >
              <input
                type="radio"
                name={`category_id-${group}`}
                value={category.id}
                checked={selectedCategory === category?.id}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300"
              />
              <span className="ltr:ml-3 rtl:mr-3 text-sm text-gray-700 flex-1">
                {category.name}
              </span>
              <span className="text-xs text-gray-500">
                ({category.total_courses})
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Level */}
      <div className="mb-6">
        <h4 className="font-medium text-gray-900 mb-3">
          {t("filters.level.title")}
        </h4>
        <div className="space-y-2">
          {[
            { id: "all", label: t("filters.level.all") },
            { id: "beginner", label: t("filters.level.beginner") },
            { id: "intermediate", label: t("filters.level.intermediate") },
            { id: "advanced", label: t("filters.level.advanced") },
          ].map((level) => (
            <label key={level.id} className="flex items-center cursor-pointer">
              <input
                type="radio"
                name={`level-${group}`}
                value={level.id}
                checked={selectedLevel === level.id}
                onChange={(e) => setSelectedLevel(e.target.value)}
                className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300"
              />
              <span className="ltr:ml-3 rtl:mr-3 text-sm text-gray-700">
                {level.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Price */}
      <FeatureGate
        flag="is_price_enabled"
        fallback={null}
        loadingFallback={null}
      >
        <div className="mb-6">
          <h4 className="font-medium text-gray-900 mb-3">
            {t("filters.price.title")}
          </h4>
          <div className="space-y-2">
            {[
              { id: "all", label: t("filters.price.all") },
              { id: "free", label: t("filters.price.free") },
              { id: "paid", label: t("filters.price.paid") },
            ].map((price) => (
              <label
                key={price.id}
                className="flex items-center cursor-pointer"
              >
                <input
                  type="radio"
                  name={`price-${group}`}
                  value={price.id}
                  checked={priceFilter === (price.id as PriceFilter)}
                  onChange={(e) =>
                    setPriceFilter(e.target.value as PriceFilter)
                  }
                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300"
                />
                <span className="ltr:ml-3 rtl:mr-3 text-sm text-gray-700">
                  {price.label}
                </span>
              </label>
            ))}
          </div>
        </div>
      </FeatureGate>

      <button
        onClick={onClearFilters}
        className="w-full text-purple-600 hover:text-purple-700 text-sm font-medium"
      >
        {t("filters.clear")}
      </button>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden lg:block w-64 flex-shrink-0">
        <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-32">
          <Body group={desktopGroup} />
        </div>
      </div>

      {/* Mobile drawer */}
      <div
        ref={wrapperRef}
        className={`lg:hidden fixed inset-0 z-50 ${
          mobileOpen ? "pointer-events-auto" : "pointer-events-none"
        }`}
      >
        <div
          className={`absolute inset-0 bg-black/40 transition-opacity ${
            mobileOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={onCloseMobile}
        />
        <div
          className={`absolute left-0 top-0 h-full w-80 max-w-[85%] bg-white shadow-xl transition-transform duration-300 ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
          role="dialog"
          aria-modal="true"
          aria-label="Filters"
        >
          <div className="flex items-center justify-between p-4 border-b">
            <span className="font-semibold">{t("filters.title")}</span>
            <button
              ref={closeBtnRef}
              type="button"
              onClick={onCloseMobile}
              className="p-2 text-gray-500 hover:text-gray-700"
              aria-label="Close filters"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-6 overflow-y-auto h-[calc(100%-56px)]">
            <Body group={mobileGroup} />
          </div>
        </div>
      </div>
    </>
  );
}
